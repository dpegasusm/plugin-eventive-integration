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
		// Register the AJAX handler.
		add_action( 'wp_ajax_eventive_dashboard_data', array( $this, 'ajax_get_dashboard_data' ) );

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
			__( 'Eventive Analytics', 'eventive' ),
			array( $this, 'render_dashboard_widget' ),
			null,
			null,
			'normal',
			'high'
		);
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

		// Enqueue the dashboard stylesheet.
		wp_enqueue_style(
			'eventive-dashboard-style',
			EVENTIVE_PLUGIN . 'assets/css/eventive-dashboard.css',
			array(),
			EVENTIVE_CURRENT_VERSION
		);

		// Enqueue the dashboard script.
		wp_enqueue_script(
			'eventive-dashboard-script',
			EVENTIVE_PLUGIN . 'assets/js/eventive-dashboard.js',
			array( 'jquery' ),
			EVENTIVE_CURRENT_VERSION,
			true
		);

		// Localize script with AJAX URL.
		wp_localize_script(
			'eventive-dashboard-script',
			'eventiveDashboard',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'eventive_dashboard_nonce' ),
			)
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
			<p class="eventive-loading"><?php esc_html_e( 'Loading dashboard data...', 'eventive' ); ?></p>
		</div>
		<?php
	}

	/**
	 * AJAX handler to get dashboard data.
	 *
	 * @return void
	 */
	public function ajax_get_dashboard_data() {
		// Use the global API instance.
		global $eventive_api;

		// Verify nonce.
		check_ajax_referer( 'eventive_dashboard_nonce', 'nonce' );

		// Check user permissions.
		if ( ! current_user_can( 'read' ) ) {
			wp_send_json_error(
				array( 'message' => __( 'You do not have permission to view this data.', 'eventive' ) ),
				403
			);
			return;
		}

		// Get API credentials.
		$options         = get_option( 'eventive_admin_options_option_name', array() );
		$event_bucket_id = $options['your_eventive_event_bucket_1'] ?? '';

		// Check if credentials are set.
		if ( empty( $event_bucket_id ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Eventive API credentials are not configured. Please update your settings.', 'eventive' ) ),
				400
			);
			return;
		}

		// Prepare API request URL.
		$api_url = add_query_arg(
			'event_bucket',
			$event_bucket_id,
			'https://api.eventive.org/charts/overview'
		);

		// Make the API call using the global API object.
		$response = $eventive_api->eventive_make_api_call( $api_url );

		// Check for errors.
		if ( is_wp_error( $response ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Failed to fetch dashboard data from Eventive.', 'eventive' ) ),
				500
			);
			return;
		}

		// Get data from WP_REST_Response.
		$data = $response->get_data();

		if ( json_last_error() !== JSON_ERROR_NONE || empty( $data ) ) {
			wp_send_json_error(
				array( 'message' => __( 'Invalid response from Eventive API.', 'eventive' ) ),
				500
			);
			return;
		}

		// Extract and format data.
		$total_volume     = isset( $data['total_volume'] ) ? round( $data['total_volume'] / 100, 2 ) : 0;
		$total_net_volume = isset( $data['total_net_volume'] ) ? round( $data['total_net_volume'] / 100, 2 ) : 0;
		$total_paid_count = isset( $data['total_paid_count'] ) ? absint( $data['total_paid_count'] ) : 0;

		// Send success response.
		wp_send_json_success(
			array(
				'totalVolume'    => $total_volume,
				'totalNetVolume' => $total_net_volume,
				'totalPaidCount' => $total_paid_count,
			)
		);
	}
}