<?php
/**
 * Eventive Dashboard Widget
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
 * Eventive Dashboard Widget Class
 *
 * Displays Eventive analytics data on the WordPress admin dashboard.
 */
class Eventive_Dashboard {
	/**
	 * Initialize the dashboard widget.
	 *
	 * @return void
	 */
	public function init() {
		// Add dashboard widget.
		add_action( 'wp_dashboard_setup', array( $this, 'register_dashboard_widget' ) );

		// Enqueue admin scripts.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_dashboard_scripts' ) );
	}

	/**
	 * Register the dashboard widget.
	 *
	 * @return void
	 */
	public function register_dashboard_widget() {
		wp_add_dashboard_widget(
			'eventive_dashboard_widget',
			__( 'Eventive Analytics', 'eventive-integration' ),
			array( $this, 'render_dashboard_widget' ),
			null,
			null,
			'normal',
			'high'
		);

		if ( current_user_can( 'manage_options' ) ) {
			wp_add_dashboard_widget(
				'eventive_dashboard_sync_widget',
				__( 'Eventive Sync', 'eventive-integration' ),
				array( $this, 'render_dashboard_sync_widget' ),
				null,
				null,
				'side',
				'high'
			);
		}
	}

	/**
	 * Enqueue dashboard scripts and styles.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function enqueue_dashboard_scripts( $hook ) {
		// Only load on the dashboard page.
		if ( 'index.php' !== $hook ) {
			return;
		}

		// Use the global API instance.
		global $eventive_api;

		// Enqueue the dashboard stylesheet.
		wp_enqueue_style(
			'eventive-dashboard-style',
			EVENTIVE_PLUGIN . 'assets/css/eventive-dashboard.css',
			array(),
			EVENTIVE_CURRENT_VERSION
		);

		// Enqueue the dashboard script with wp-api-fetch dependency.
		wp_enqueue_script(
			'eventive-dashboard-script',
			EVENTIVE_PLUGIN . 'assets/js/eventive-dashboard.js',
			array( 'wp-api-fetch' ),
			EVENTIVE_CURRENT_VERSION,
			true
		);

		// Enqueue the settings script for the sync button.
		wp_enqueue_script(
			'eventive-settings-script',
			EVENTIVE_PLUGIN . 'assets/js/eventive-settings.js',
			array( 'jquery', 'wp-api-fetch' ),
			EVENTIVE_CURRENT_VERSION,
			true
		);

		// Prepare data to pass to view scripts.
		$localization = $eventive_api->get_api_localization_data();

		// Localize script with API data.
		wp_localize_script(
			'eventive-dashboard-script',
			'EventiveData',
			$localization
		);

		wp_localize_script(
			'eventive-settings-script',
			'EventiveData',
			$localization
		);
	}

	/**
	 * Render the dashboard widget content.
	 *
	 * @return void
	 */
	public function render_dashboard_widget() {
		?>
		<div id="eventive-dashboard-widget-content">
			<p class="eventive-loading"><?php esc_html_e( 'Loading dashboard data...', 'eventive-integration' ); ?></p>
		</div>
		<?php
	}

	/**
	 * Render the admin-only sync widget content.
	 *
	 * @return void
	 */
	public function render_dashboard_sync_widget() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<form method="post" action="">
			<?php wp_nonce_field( 'eventive_sync_events', 'eventive_sync_events_nonce' ); ?>
			<button type="submit" name="eventive_sync_events" class="button button-secondary">
				<?php esc_html_e( 'Sync with Eventive', 'eventive-integration' ); ?>
			</button>
			<div class='eventive-sync-progress' id='eventive-sync-events-progress' style='margin-top:10px; display:none;'>
				<?php esc_html_e( 'Syncing events, please wait...', 'eventive-integration' ); ?>
			</div>
		</form>
		<?php
	}
}