<?php
/**
 * Eventive Plugin
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
 * Dumplings_Member_List
 */
class Eventive_Sync {

	/**
	 * Init callback for register.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Register cron for syncing events nightly at midnight.
		if ( ! wp_next_scheduled( 'eventive_sync_events_cron' ) ) {
			wp_schedule_event( strtotime( '00:00:00' ), 'daily', 'eventive_sync_events_cron' );
		}

		// Hook our sync function to the cron.
		add_action( 'eventive_sync_events_cron', array( $this, 'sync_eventive_events_with_wordpress' ) );

		// Register AJAX handler for syncing events.
		add_action( 'wp_ajax_sync_eventive_events', array( $this, 'sync_eventive_events_with_wordpress' ) );
	}

	/**
	 * AJAX handler for syncing events with Eventive.
	 *
	 * @return void
	 */
	public function sync_eventive_events_with_wordpress() {
		// Use the global API instance.
		global $eventive_api;

		// Verify nonce.
		if ( ! isset( $_POST['eventive_sync_events_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['eventive_sync_events_nonce'] ) ), 'eventive_sync_events' ) ) {
			wp_send_json_error( array( 'message' => 'Security verification failed.' ), 403 );
			return;
		}

		// Check user permissions.
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'You do not have permission to perform this action.' ), 403 );
			return;
		}

		// Get API credentials.
		$options      = get_option( 'eventive_admin_options_option_name', array() );
		$event_bucket = $options['your_eventive_event_bucket_1'] ?? '';
		$api_key      = $options['your_eventive_secret_key_2'] ?? '';

		if ( empty( $event_bucket ) || empty( $api_key ) ) {
			wp_send_json_error( array( 'message' => 'Eventive API credentials are missing. Please configure them in the settings.' ), 400 );
			return;
		}

		// Create a mock request object for the API call.
		$request = new WP_REST_Request( 'GET', '/eventive/v1/event_buckets' );
		$request->set_param( 'bucket_id', $event_bucket );
		$request->set_param( 'eventive_nonce', wp_create_nonce( 'eventive_api_nonce' ) );

		// Fetch events from Eventive API using the API class.
		$response = $eventive_api->get_api_event_buckets( $request );

		// Check if response is a WP_Error.
		if ( is_wp_error( $response ) ) {
			wp_send_json_error( array( 'message' => 'Failed to fetch events from Eventive: ' . $response->get_error_message() ), 500 );
			return;
		}

		// Get the data from the WP_REST_Response.
		$events_data = $response->get_data();

		if ( empty( $events_data['events'] ) ) {
			wp_send_json_error( array( 'message' => 'No events found in the Eventive API response.' ), 404 );
			return;
		}

		$events        = $events_data['events'];
		$synced_count  = 0;
		$updated_count = 0;
		$created_count = 0;

		foreach ( $events as $event ) {
			$event_id   = $event['id'] ?? null;
			$event_name = $event['name'] ?? 'Untitled Event';

			if ( empty( $event_id ) ) {
				continue;
			}

			$event_description = $event['description'] ?? '';
			$visibility        = $event['visibility'] ?? 'hidden';
			$post_status       = ( 'published' === $visibility ) ? 'publish' : 'draft';

			// Check if event already exists.
			$query = new WP_Query(
				array(
					'post_type'      => 'post',
					'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
					'posts_per_page' => 1,
					'meta_query'     => array(
						array(
							'key'     => '_eventive_event_id',
							'value'   => $event_id,
							'compare' => '=',
						),
					),
				)
			);

			$existing_post_id = ! empty( $query->posts ) ? $query->posts[0] : null;

			try {
				if ( $existing_post_id ) {
					// Update existing post.
					$post_data = array(
						'ID'           => $existing_post_id,
						'post_title'   => $event_name,
						'post_content' => $event_description,
						'post_status'  => $post_status,
						'post_type'    => 'post',
					);

					$post_id = wp_update_post( $post_data );

					if ( is_wp_error( $post_id ) ) {
						error_log( "Failed to update event: $event_name - " . $post_id->get_error_message() );
						continue;
					}

					++$updated_count;
				} else {
					// Create new post.
					$post_data = array(
						'post_title'   => $event_name,
						'post_content' => $event_description,
						'post_status'  => $post_status,
						'post_type'    => 'post',
					);

					$post_id = wp_insert_post( $post_data );

					if ( is_wp_error( $post_id ) ) {
						error_log( "Failed to create event: $event_name - " . $post_id->get_error_message() );
						continue;
					}

					++$created_count;
				}

				// Update post meta.
				update_post_meta( $post_id, '_eventive_event_id', $event_id );
				update_post_meta( $post_id, '_eventive_loader_override', $event_bucket );

				++$synced_count;

			} catch ( Exception $e ) {
				error_log( "Error syncing event $event_name: " . $e->getMessage() );
			}
		}

		$message = sprintf(
			'Successfully synced %d events (%d created, %d updated).',
			$synced_count,
			$created_count,
			$updated_count
		);

		wp_send_json_success(
			array(
				'message'       => $message,
				'synced_count'  => $synced_count,
				'created_count' => $created_count,
				'updated_count' => $updated_count,
			)
		);
	}
}
