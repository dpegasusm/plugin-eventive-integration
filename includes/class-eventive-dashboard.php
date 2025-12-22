<?php
class Eventive_Dashboard {
	public function __construct() {
		// Register the AJAX handler
		add_action( 'wp_ajax_eventive_dashboard_data', array( $this, 'eventive_dashboard_data' ) );
	}

	public function render_dashboard() {
		ob_start();
		?>
		<div id="eventive-dashboard">
			<p>Loading dashboard data...</p>
		</div>
		<script>
function animateCount(element, start, end, duration) {
	let startTime = null;

	function animationStep(currentTime) {
		if (!startTime) startTime = currentTime;
		const progress = Math.min((currentTime - startTime) / duration, 1);
		const value = Math.floor(progress * (end - start) + start);
		element.textContent = value;

		if (progress < 1) {
			requestAnimationFrame(animationStep);
		}
	}

	requestAnimationFrame(animationStep);
}

document.addEventListener('DOMContentLoaded', function () {
	const dashboard = document.getElementById('eventive-dashboard');

	fetch('<?php echo admin_url( 'admin-ajax.php?action=eventive_dashboard_data' ); ?>')
		.then(response => response.json())
		.then(data => {
			if (data.success) {
				const { totalVolume, totalNetVolume, totalPaidCount } = data.data;
				dashboard.innerHTML = `
					<div class="eventive-dashboard-container">
						<div class="eventive-dashboard-box"><strong>Total Volume:</strong> $<span class="count" data-count="${totalVolume}">0</span></div>
						<div class="eventive-dashboard-box"><strong>Net Volume:</strong> $<span class="count" data-count="${totalNetVolume}">0</span></div>
						<div class="eventive-dashboard-box"><strong>Paid Transactions:</strong> <span class="count" data-count="${totalPaidCount}">0</span></div>
						<a href="https://admin.eventive.org/" target="_blank"><button>Go to Eventive Dashboard</button></a>
					</div>
				`;

				// Animate the counts
				document.querySelectorAll('.eventive-dashboard-box .count').forEach(el => {
					const endValue = parseFloat(el.getAttribute('data-count'));
					animateCount(el, 0, endValue, 1500); // 1500ms duration
				});
			} else {
				const errorMessage = data.data?.message || 'Unknown error occurred.';
				dashboard.innerHTML = `<p>Error loading dashboard data: ${errorMessage}</p>`;
			}
		})
		.catch(error => {
			dashboard.innerHTML = `<p>Error loading dashboard data: ${error.message}</p>`;
		});
});
		</script>
		<?php
		return ob_get_clean();
	}

	public function eventive_dashboard_data() {
		$options         = get_option( 'eventive_admin_options_option_name', array() );
		$api_key         = $options['your_eventive_secret_key_2'] ?? '';
		$event_bucket_id = $options['your_eventive_event_bucket_1'] ?? '';

		if ( ! $api_key || ! $event_bucket_id ) {
			error_log( 'Error: API Key or Event Bucket ID is missing.' );
			wp_send_json_error( array( 'message' => 'API Key or Event Bucket ID is missing' ), 400 );
			return;
		}

		$headers = array( 'X-API-KEY' => $api_key );

		// Fetch the overview data
		$overview_response = wp_remote_get( "https://api.eventive.org/charts/overview?event_bucket=$event_bucket_id", array( 'headers' => $headers ) );
		if ( is_wp_error( $overview_response ) ) {
			error_log( 'Error fetching overview data: ' . $overview_response->get_error_message() );
			wp_send_json_error( array( 'message' => 'Failed to fetch overview data' ), 500 );
			return;
		}

		$overview_data = json_decode( wp_remote_retrieve_body( $overview_response ), true );
		if ( json_last_error() !== JSON_ERROR_NONE || empty( $overview_data ) ) {
			error_log( 'Invalid overview response: ' . wp_remote_retrieve_body( $overview_response ) );
			wp_send_json_error( array( 'message' => 'Invalid overview data' ), 500 );
			return;
		}

		$totalVolume    = round( ( $overview_data['total_volume'] ?? 0 ) / 100, 2 ); // Convert to dollars
		$totalNetVolume = round( ( $overview_data['total_net_volume'] ?? 0 ) / 100, 2 ); // Convert to dollars
		$totalPaidCount = $overview_data['total_paid_count'] ?? 0;

		// Send the response
		wp_send_json_success(
			array(
				'totalVolume'    => $totalVolume,
				'totalNetVolume' => $totalNetVolume,
				'totalPaidCount' => $totalPaidCount,
			)
		);
	}
}
?>