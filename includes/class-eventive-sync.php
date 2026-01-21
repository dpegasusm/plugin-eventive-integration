<?php
/**
 * Eventive Plugin - Sync Films
 *
 * @package WordPress
 * @subpackage Eventive
 * @since 1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Eventive_Sync Class
 *
 * Handles syncing films from Eventive API to WordPress custom post type.
 */
class Eventive_Sync {

	/**
	 * Initialize the sync functionality.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Register cron for syncing films nightly at midnight.
		if ( ! wp_next_scheduled( 'eventive_sync_films_cron' ) ) {
			wp_schedule_event( strtotime( '00:00:00' ), 'daily', 'eventive_sync_films_cron' );
		}

		// Hook our sync function to the cron.
		add_action( 'eventive_sync_films_cron', array( $this, 'sync_films_with_eventive' ) );

		// Register AJAX handler for syncing films.
		add_action( 'wp_ajax_sync_eventive_events', array( $this, 'sync_films_ajax_handler' ) );
	}

	/**
	 * AJAX handler for syncing films with Eventive.
	 *
	 * @return void
	 */
	public function sync_films_ajax_handler() {
		// Verify nonce.
		if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'eventive_sync_events' ) ) {
			wp_send_json_error( array( 'message' => 'Security verification failed.' ), 403 );
			return;
		}

		// Check user permissions.
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'You do not have permission to perform this action.' ), 403 );
			return;
		}

		// Run the sync and output results via JSON.
		$result = $this->sync_films_with_eventive( true );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( array( 'message' => $result->get_error_message() ), 500 );
		} else {
			wp_send_json_success( $result );
		}
	}

	/**
	 * Sync films from Eventive API to WordPress posts.
	 *
	 * @param bool $return_result Whether to return result array instead of logging. Default false (for CRON).
	 * @return array|WP_Error Array of sync results or WP_Error on failure.
	 */
	public function sync_films_with_eventive( $return_result = false ) {
		// Use the global API instance.
		global $eventive_api;

		// Get API credentials from options.
		$bucket_id = get_option( 'eventive_default_bucket_id', '' );
		$api_key   = get_option( 'eventive_secret_key', '' );

		if ( empty( $bucket_id ) || empty( $api_key ) ) {
			$error = new WP_Error( 'missing_credentials', 'Eventive API credentials are missing. Please configure them in the settings.' );
			if ( ! $return_result ) {
				return $error;
			}
			return $error;
		}

		// Create a request object for the API call.
		$request = new WP_REST_Request( 'GET', '/eventive/v1/event_buckets' );
		$request->set_param( 'bucket_id', $bucket_id );
		$request->set_param( 'endpoint', 'films' );
		$request->set_param( 'eventive_nonce', wp_create_nonce( 'eventive_api_nonce' ) );

		// Fetch films from Eventive API.
		$response = $eventive_api->get_api_films( $request );

		// Check if response is a WP_Error.
		if ( is_wp_error( $response ) ) {
			return new WP_Error( 'api_error', 'Failed to fetch films from Eventive: ' . $response->get_error_message() );
		}

		// Get the data from the WP_REST_Response.
		$films_data = $response->get_data();

		// Handle different response formats.
		$films = array();
		if ( isset( $films_data['films'] ) && is_array( $films_data['films'] ) ) {
			$films = $films_data['films'];
		} elseif ( is_array( $films_data ) ) {
			$films = $films_data;
		}

		if ( empty( $films ) ) {
			$error = new WP_Error( 'no_films', 'No films found in the Eventive API response.' );
			return $error;
		}

		// Initialize counters.
		$synced_count  = 0;
		$updated_count = 0;
		$created_count = 0;
		$skipped_count = 0;

		// Process each film.
		foreach ( $films as $film ) {
			// Validate required fields.
			if ( empty( $film['id'] ) ) {
				++$skipped_count;
				continue;
			}

			$film_id = sanitize_text_field( $film['id'] );
			$result  = $this->create_or_update_film_post( $film, $bucket_id );

			if ( is_wp_error( $result ) ) {
				++$skipped_count;
				continue;
			}

			++$synced_count;
			if ( 'updated' === $result ) {
				++$updated_count;
			} elseif ( 'created' === $result ) {
				++$created_count;
			}
		}

		// Prepare result message.
		$message = sprintf(
			'Successfully synced %d films (%d created, %d updated, %d skipped).',
			$synced_count,
			$created_count,
			$updated_count,
			$skipped_count
		);

		$result_data = array(
			'message'       => $message,
			'synced_count'  => $synced_count,
			'created_count' => $created_count,
			'updated_count' => $updated_count,
			'skipped_count' => $skipped_count,
		);

		return $result_data;
	}

	/**
	 * Create or update a film post from Eventive data.
	 *
	 * @param array  $film      Film data from Eventive API.
	 * @param string $bucket_id The bucket ID for this film.
	 * @return string|WP_Error 'created', 'updated', or WP_Error on failure.
	 */
	private function create_or_update_film_post( $film, $bucket_id ) {
		// Extract film data.
		$film_id          = sanitize_text_field( $film['id'] );
		$film_name        = ! empty( $film['name'] ) ? sanitize_text_field( $film['name'] ) : 'Untitled Film';
		$film_description = ! empty( $film['description'] ) ? '<!-- wp:paragraph --><p>' . wp_kses_post( $film['description'] ) . '</p><!-- /wp:paragraph -->' : '';
		$visibility       = ! empty( $film['visibility'] ) ? sanitize_text_field( $film['visibility'] ) : 'hidden';
		$post_status      = ( 'published' === $visibility ) ? 'publish' : 'draft';

		// Check if film post already exists.
		$existing_posts = get_posts(
			array(
				'post_type'      => 'eventive_film',
				'post_status'    => 'any',
				'posts_per_page' => 1,
				'meta_key'       => '_eventive_film_id',
				'meta_value'     => $film_id,
				'fields'         => 'ids',
			)
		);

		$existing_post_id = ! empty( $existing_posts ) ? $existing_posts[0] : 0;

		// Check if sync is disabled for this film.
		if ( $existing_post_id ) {
			$sync_enabled = get_post_meta( $existing_post_id, '_eventive_sync_enabled', true );
			// If explicitly set to false, skip this film.
			if ( false === $sync_enabled ) {
				return new WP_Error( 'sync_disabled', 'Sync is disabled for this film.' );
			}
		}

		// Prepare post data.
		$post_data = array(
			'post_title'   => $film_name,
			'post_content' => $film_description,
			'post_status'  => $post_status,
			'post_type'    => 'eventive_film',
			'post_excerpt' => ! empty( $film['short_description'] ) ? sanitize_text_field( $film['short_description'] ) : '',
		);

		if ( $existing_post_id ) {
			// Update existing post.
			$post_data['ID'] = $existing_post_id;
			$post_id         = wp_update_post( $post_data, true );

			if ( is_wp_error( $post_id ) ) {
				return $post_id;
			}

			$action = 'updated';
		} else {
			// Create new post.
			$post_id = wp_insert_post( $post_data, true );

			if ( is_wp_error( $post_id ) ) {
				return $post_id;
			}

			$action = 'created';
		}

		// Update post meta with Eventive data.
		update_post_meta( $post_id, '_eventive_film_id', $film_id );
		update_post_meta( $post_id, '_eventive_bucket_id', $bucket_id );

		// Enable sync by default for new films.
		if ( 'created' === $action ) {
			update_post_meta( $post_id, '_eventive_sync_enabled', true );
		}

		// Handle poster image - sideload to media library if URL has changed.
		if ( ! empty( $film['poster_image'] ) ) {
			$new_poster_url = esc_url_raw( $film['poster_image'] );
			$old_poster_url = get_post_meta( $post_id, '_eventive_poster_image', true );

			// Only sideload if the URL has changed and is valid.
			if ( $new_poster_url !== $old_poster_url && filter_var( $new_poster_url, FILTER_VALIDATE_URL ) ) {
				$this->sideload_featured_image( $post_id, $new_poster_url, $film_name );
			}

			// Update the meta with the new URL.
			update_post_meta( $post_id, '_eventive_poster_image', $new_poster_url );
		}

		if ( ! empty( $film['cover_image'] ) ) {
			update_post_meta( $post_id, '_eventive_cover_image', esc_url_raw( $film['cover_image'] ) );
		}

		if ( ! empty( $film['trailer_url'] ) ) {
			update_post_meta( $post_id, '_eventive_trailer_url', esc_url_raw( $film['trailer_url'] ) );
		}

		if ( isset( $film['details'] ) && is_array( $film['details'] ) ) {
			update_post_meta( $post_id, '_eventive_film_details', $film['details'] );

			// Store individual detail fields for easier querying.
			if ( ! empty( $film['details']['runtime'] ) ) {
				update_post_meta( $post_id, '_eventive_runtime', absint( $film['details']['runtime'] ) );
			}

			if ( ! empty( $film['details']['year'] ) ) {
				update_post_meta( $post_id, '_eventive_year', absint( $film['details']['year'] ) );
			}

			if ( ! empty( $film['details']['language'] ) ) {
				update_post_meta( $post_id, '_eventive_language', sanitize_text_field( $film['details']['language'] ) );
			}

			if ( ! empty( $film['details']['country_of_origin'] ) ) {
				update_post_meta( $post_id, '_eventive_country', sanitize_text_field( $film['details']['country_of_origin'] ) );
			}
		}

		if ( isset( $film['credits'] ) && is_array( $film['credits'] ) ) {
			update_post_meta( $post_id, '_eventive_film_credits', $film['credits'] );

			// Store director separately for easier querying.
			if ( ! empty( $film['credits']['director'] ) ) {
				update_post_meta( $post_id, '_eventive_director', sanitize_text_field( $film['credits']['director'] ) );
			}
		}

		if ( isset( $film['tags'] ) && is_array( $film['tags'] ) ) {
			update_post_meta( $post_id, '_eventive_film_tags', $film['tags'] );

			// Sync taxonomy terms from tags.
			$this->sync_film_tags( $post_id, $film['tags'] );
		}

		// Handle venue syncing.
		if ( isset( $film['venue'] ) && is_array( $film['venue'] ) ) {
			$venue_id = $this->sync_venue( $film['venue'] );
			if ( $venue_id ) {
				update_post_meta( $post_id, '_eventive_venue_id', $venue_id );
			}
		}

		// add a do action here so other functions can hook in after a film is created/updated.
		do_action( 'eventive_film_synced', $post_id, $film, $action );

		return $action;
	}

	/**
	 * Sideload an image from a URL and set it as the featured image for a post.
	 *
	 * @param int    $post_id   The post ID to attach the image to.
	 * @param string $image_url The URL of the image to download.
	 * @param string $film_name The film name to use as the image title.
	 * @return int|false The attachment ID on success, false on failure.
	 */
	private function sideload_featured_image( $post_id, $image_url, $film_name ) {
		// Require WordPress file handling functions.
		if ( ! function_exists( 'media_sideload_image' ) ) {
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';
		}

		// Download the image and add it to the media library.
		$attachment_id = media_sideload_image( $image_url, $post_id, $film_name, 'id' );

		// Check if sideload was successful.
		if ( is_wp_error( $attachment_id ) ) {
			// Log the error but don't fail the entire sync.
			error_log( 'Eventive Sync: Failed to sideload poster image for post ' . $post_id . ': ' . $attachment_id->get_error_message() );
			return false;
		}

		// Set as featured image.
		set_post_thumbnail( $post_id, $attachment_id );

		return $attachment_id;
	}

	/**
	 * Sync film tags from Eventive data to WordPress taxonomy terms.
	 *
	 * @param int   $post_id Post ID.
	 * @param array $tags    Array of tag objects from Eventive API.
	 * @return void
	 */
	private function sync_film_tags( $post_id, $tags ) {
		if ( empty( $tags ) || ! is_array( $tags ) ) {
			// Clear all tags if none provided.
			wp_set_object_terms( $post_id, array(), 'eventive_film_tags' );
			return;
		}

		$term_ids = array();

		foreach ( $tags as $tag ) {
			if ( empty( $tag['id'] ) || empty( $tag['name'] ) ) {
				continue;
			}

			$eventive_tag_id = sanitize_text_field( $tag['id'] );
			$tag_name        = sanitize_text_field( $tag['name'] );
			$tag_color       = ! empty( $tag['color'] ) ? sanitize_hex_color( $tag['color'] ) : '';
			$tag_slug        = sanitize_title( $tag_name );

			// Check if term already exists by Eventive ID.
			$existing_terms = get_terms(
				array(
					'taxonomy'   => 'eventive_film_tags',
					'hide_empty' => false,
					'meta_query' => array(
						array(
							'key'     => 'eventive_tag_id',
							'value'   => $eventive_tag_id,
							'compare' => '=',
						),
					),
				)
			);

			if ( ! empty( $existing_terms ) && ! is_wp_error( $existing_terms ) ) {
				// Term exists, use it and update color if changed.
				$term       = $existing_terms[0];
				$term_ids[] = $term->term_id;

				if ( $tag_color ) {
					$current_color = get_term_meta( $term->term_id, 'eventive_tag_color', true );
					if ( $current_color !== $tag_color ) {
						update_term_meta( $term->term_id, 'eventive_tag_color', $tag_color );
					}
				}
			} else {
				// Term doesn't exist, create it.
				$term = wp_insert_term(
					$tag_name,
					'eventive_film_tags',
					array(
						'slug' => $tag_slug,
					)
				);

				if ( ! is_wp_error( $term ) ) {
					$term_id    = $term['term_id'];
					$term_ids[] = $term_id;

					// Store Eventive tag ID and color as term meta.
					update_term_meta( $term_id, 'eventive_tag_id', $eventive_tag_id );
					if ( $tag_color ) {
						update_term_meta( $term_id, 'eventive_tag_color', $tag_color );
					}
				}
			}
		}

		// Set the post terms to match exactly what came from Eventive.
		if ( ! empty( $term_ids ) ) {
			wp_set_object_terms( $post_id, $term_ids, 'eventive_film_tags' );
		} else {
			// Clear all tags if we couldn't process any.
			wp_set_object_terms( $post_id, array(), 'eventive_film_tags' );
		}
	}

	/**
	 * Sync venue from Eventive data to WordPress post.
	 *
	 * @param array $venue Venue data from Eventive API.
	 * @return int|false Venue post ID on success, false on failure.
	 */
	private function sync_venue( $venue ) {
		if ( empty( $venue['id'] ) || empty( $venue['name'] ) ) {
			return false;
		}

		$eventive_venue_id = sanitize_text_field( $venue['id'] );
		$venue_name        = sanitize_text_field( $venue['name'] );
		$venue_color       = ! empty( $venue['color'] ) ? sanitize_hex_color( $venue['color'] ) : '';
		$use_reserved      = isset( $venue['use_reserved_seating'] ) ? (bool) $venue['use_reserved_seating'] : false;

		// Check if venue post already exists by Eventive venue ID.
		$existing_posts = get_posts(
			array(
				'post_type'      => 'eventive_venue',
				'post_status'    => 'any',
				'posts_per_page' => 1,
				'meta_key'       => '_eventive_venue_id',
				'meta_value'     => $eventive_venue_id,
				'fields'         => 'ids',
			)
		);

		$existing_post_id = ! empty( $existing_posts ) ? $existing_posts[0] : 0;

		// Prepare post data.
		$post_data = array(
			'post_title'  => $venue_name,
			'post_status' => 'publish',
			'post_type'   => 'eventive_venue',
		);

		if ( $existing_post_id ) {
			// Update existing venue.
			$post_data['ID'] = $existing_post_id;
			$post_id         = wp_update_post( $post_data, true );

			if ( is_wp_error( $post_id ) ) {
				return false;
			}
		} else {
			// Create new venue.
			$post_id = wp_insert_post( $post_data, true );

			if ( is_wp_error( $post_id ) ) {
				return false;
			}
		}

		// Update venue meta.
		update_post_meta( $post_id, '_eventive_venue_id', $eventive_venue_id );

		if ( $venue_color ) {
			update_post_meta( $post_id, '_eventive_venue_color', $venue_color );
		}

		update_post_meta( $post_id, '_eventive_use_reserved_seating', $use_reserved );

		// Store any additional venue data that comes from the API.
		if ( ! empty( $venue['address'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_address', sanitize_text_field( $venue['address'] ) );
		}

		if ( ! empty( $venue['city'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_city', sanitize_text_field( $venue['city'] ) );
		}

		if ( ! empty( $venue['state'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_state', sanitize_text_field( $venue['state'] ) );
		}

		if ( ! empty( $venue['zip'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_zip', sanitize_text_field( $venue['zip'] ) );
		}

		if ( ! empty( $venue['country'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_country', sanitize_text_field( $venue['country'] ) );
		}

		if ( isset( $venue['latitude'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_lat', sanitize_text_field( $venue['latitude'] ) );
		}

		if ( isset( $venue['longitude'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_long', sanitize_text_field( $venue['longitude'] ) );
		}

		if ( ! empty( $venue['url'] ) ) {
			update_post_meta( $post_id, '_eventive_venue_url', esc_url_raw( $venue['url'] ) );
		}

		return $post_id;
	}
}
