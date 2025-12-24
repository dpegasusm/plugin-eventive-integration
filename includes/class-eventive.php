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
	}

	/**
	 * Admin init to check for API key.
	 *
	 * @return void
	 */
	public function eventive_admin_init() {
		// Get the API secret key and bucket ID.
		$this->api_secret_key = get_option( 'eventive_secret_key', '' );
		$this->api_bucket_id  = get_option( 'eventive_event_bucket_id', '' );

		// Display a notice if we dont have an API key or bucket ID.
		if ( empty( $this->api_secret_key ) || empty( $this->api_bucket_id ) ) {
			add_action(
				'admin_notices',
				function () {
					echo '<div class="notice notice-warning is-dismissible">
						<p><strong>Eventive:</strong> API Key is not set. Please set it in the <a href="' . esc_url( admin_url( 'options-general.php?page=eventive-film-settings' ) ) . '">settings page</a> to enable integration.</p>
					</div>';
				}
			);
		}
	}
}
