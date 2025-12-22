<?php
/**
 * eventive Film Plugin
 *
 * @package WordPress
 * @subpackage eventive
 * @since 1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Dumplings_Member_List
 */
class eventive_Film {

	/**
	 * Init callback for register.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Admin init for adding a notice about the API key being needed if not there. 
		add_action( 'admin_init', array( $this, 'eventive_admin_init' ) );

		// Load the UI dialogue necessary styles.
		add_action( 'wp_enqueue_scripts', array( $this, 'eventive_api_enqueue_scripts' ) );

		// Hook the updated post meta call and see when and if we have updated the Agile Film ID.
		// If we have then we want to adjust the schedule.
		add_action( 'updated_post_meta', array( $this, 'eventive_update_agile_film_data' ), 10, 4 );
	}

	/**
	 * Admin init to check for API key.
	 *
	 * @return void
	 */
	public function eventive_admin_init() {
		// Check if we have the API key set.
		$api_key = get_option( 'eventive_festival_agile_api_key', '' );

		if ( empty( $api_key ) ) {
			add_action(
				'admin_notices',
				function() {
					echo '<div class="notice notice-warning is-dismissible">
						<p><strong>Eventive:</strong> API Key is not set. Please set it in the <a href="' . esc_url( admin_url( 'options-general.php?page=eventive-film-settings' ) ) . '">settings page</a> to enable integration.</p>
					</div>';
				}
			);
		}
	}

	/**
	 * Enqueue scripts and styles.
	 *
	 * @return void
	 */
	public function eventive_api_enqueue_scripts() {
		// enqueue scripts for the jquery modal.
		wp_enqueue_script(
			'jquery-modal',
			'https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js',
			array( 'jquery' ),
			PTOWN_PLUGIN_CURRENT_VERSION,
			true
		);

		// Enqueue the modal style sheet.
		wp_enqueue_style(
			'jquery-modal-style',
			'https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css',
			array(),
			PTOWN_PLUGIN_CURRENT_VERSION
		);

		wp_enqueue_style( 'dashicons' );

		// Enqueue the ptown.css sheet.
		wp_enqueue_style(
			'eventive-film-plugin',
			PTOWN_PLUGIN . 'assets/css/ptown.css',
			array(),
			PTOWN_PLUGIN_CURRENT_VERSION
		);
	}

	/**
	 * Add the Film Schedule pulled from the Agile ID updates.
	 *
	 * @param  mixed $meta_id Meta ID to be updated.
	 * @param  mixed $object_id Object ID that was udated.
	 * @param  mixed $meta_key Meta key that was updated.
	 * @param  mixed $meta_value Value of meta to be set.
	 *
	 * @return void Just set the data, dont return anything.
	 */
	public function eventive_update_agile_film_data( $meta_id, $object_id, $meta_key, $meta_value ) {
		if ( 'eventive_film_agile_id' !== $meta_key ) {
			// This is not an agile film ID.
			return;
		}

		// Check that we have Metadata.
		if ( metadata_exists( 'post', $object_id, 'eventive_film_agile_id' ) ) {
			// Get the Film scheule from Agile Ticketing.
			$agile_film_id = get_post_meta( $object_id, 'eventive_film_agile_id', true );
		} else {
			return;
		}

		// Check if the custom field has a value.
		if ( empty( $agile_film_id ) ) {
			update_post_meta( $object_id, 'eventive_film_schedule', '' );
			return;
		}

		$film_type = get_post_type( $object_id );

		// We need to determine which type of post we are working with here to set the Base URL.
		switch ( $film_type ) {
			default:
			case 'films':
				$agile_url_base = esc_url_raw( maybe_unserialize( get_option( 'eventive_festival_agile_url', '' ) ) );
				break;
			case 'event_films':
				$agile_url_base = esc_url_raw( maybe_unserialize( get_option( 'eventive_special_agile_url', '' ) ) );
				break;
			case 'cinema_films':
				$agile_url_base = esc_url_raw( maybe_unserialize( get_option( 'eventive_cinema_agile_url', '' ) ) );
				break;
		}

		// check if we already have a transient stored for this post ID.
		$film_info = get_transient( 'eventive_film_agile_' . $agile_film_id );

		// Transient expired, refresh the data.
		$agile_url = $agile_url_base . $agile_film_id . '&';

		if ( wp_http_validate_url( $agile_url ) ) {
			$film_connection = wp_remote_get( $agile_url );
			$film_info       = wp_remote_retrieve_body( $film_connection );
		}

		// Parse the response as a Json blob.
		$film_json = json_decode( $film_info, true );

		// Set up an empty showing list object.
		$showings_list = array();

		if ( is_array( $film_json ) && ! is_wp_error( $film_json ) ) {
			$film_json_show = $film_json['ArrayOfShows'][0];

			// Work with the $film_json data.
			// get the list of current showings.
			if ( ! empty( $film_json_show['CurrentShowings'] ) && is_array( $film_json_show['CurrentShowings'] ) ) {
				foreach ( $film_json_show['CurrentShowings'] as $showing ) {

					$time = explode( 'T', $showing['StartDate'] );

					$showings_list[] = array(
						'start-date' => sanitize_text_field( $time[0] ),
						'start-time' => sanitize_text_field( $time[1] ),
						'location'   => sanitize_text_field( $showing['Venue']['Name'] ),
						'url'        => esc_url_raw( $showing['LegacyPurchaseLink'] ),
					);
				}
			} else {
				return;
			}

			// Update the meta field.
			update_post_meta( $object_id, 'eventive_film_schedule', maybe_serialize( $showings_list ) );
		}
	}
}
