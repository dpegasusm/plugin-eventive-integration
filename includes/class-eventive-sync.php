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

		// Store additional film metadata.
		if ( ! empty( $film['poster_image'] ) ) {
			update_post_meta( $post_id, '_eventive_poster_image', esc_url_raw( $film['poster_image'] ) );
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
		}

		// add a do action here so other functions can hook in after a film is created/updated.
		do_action( 'eventive_film_synced', $post_id, $film, $action );

		return $action;
	}
}
