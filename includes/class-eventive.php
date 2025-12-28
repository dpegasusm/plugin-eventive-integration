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
class Eventive {

	/**
	 * Init callback for register.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Admin init for adding a notice about the API key being needed if not there.
		add_action( 'admin_init', array( $this, 'eventive_admin_init' ) );

		// Enqueue Eventive dynamic scripts on frontend.
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_eventive_loader_scripts' ) );
	}

	/**
	 * Admin init to check for API key.
	 *
	 * @return void
	 */
	public function eventive_admin_init() {
		// Get the API secret key and bucket ID.
		$this->api_secret_key = get_option( 'eventive_secret_key', '' );
		$this->api_default_bucket_id  = get_option( 'eventive_default_bucket_id', '' );

		// Display a notice if we dont have an API key or bucket ID.
		if ( empty( $this->api_secret_key ) ) {
			add_action(
				'admin_notices',
				function () {
					echo '<div class="notice notice-warning is-dismissible">
						<p><strong>Eventive:</strong> API Key is not set. Please set it in the <a href="' . esc_url( admin_url( 'options-general.php?page=eventive-film-settings' ) ) . '">settings page</a> to enable integration.</p>
					</div>';
				}
			);
		} else if ( empty( $this->api_default_bucket_id ) ) {
			add_action(
				'admin_notices',
				function () {
					echo '<div class="notice notice-warning is-dismissible">
						<p><strong>Eventive:</strong> Default Event Bucket ID is not set. Please set it in the <a href="' . esc_url( admin_url( 'options-general.php?page=eventive-film-settings' ) ) . '">settings page</a> to enable integration.</p>
					</div>';
				}
			);
		}
	}

	/**
	 * Enqueue Eventive loader script.
	 *
	 * @param string $loader_url URL to loader.js.
	 * @return void
	 */
	private function enqueue_eventive_loader_scripts( $loader_url ) {
		wp_enqueue_script(
			'stripe-v3',
			'https://js.stripe.com/v3/',
			array(),
			null,
			true
		);

		// Enqueue Eventive loader script from the option eventive_default_bucket_root_url.
		$eventive_default_bucket_root_url = get_option( 'eventive_default_bucket_root_url', '' );

		// Only enqueue if we have a valid root URL.
		if ( ! empty( $eventive_default_bucket_root_url ) && filter_var( $eventive_default_bucket_root_url, FILTER_VALIDATE_URL ) ) {
			wp_enqueue_script(
				'eventive-loader',
				esc_url_raw( $eventive_default_bucket_root_url ),
				array( 'stripe-v3' ),
				null,
				true
			);

			// Add defer strategy for WP 6.3+.
			if ( function_exists( 'wp_script_add_data' ) ) {
				wp_script_add_data( 'eventive-loader', 'strategy', 'defer' );
			}

			// Enqueue your custom script here.
			wp_enqueue_script(
				'eventive-loader',
				EVENTIVE_PLUGIN . 'assets/js/eventive-loader.js',
				array( 'jquery', 'eventive-loader' ),
				EVENTIVE_CURRENT_VERSION,
				true
			);
		}
	}
}