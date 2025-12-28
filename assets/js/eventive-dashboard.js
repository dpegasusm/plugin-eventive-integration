/**
 * Eventive Dashboard Widget JavaScript
 *
 * Handles loading and displaying Eventive analytics data on the WordPress dashboard.
 *
 * @param $
 * @package
 * @since 1.0.0
 */

( function ( $ ) {
	'use strict';

	/**
	 * Animate count from start to end value.
	 *
	 * @param {HTMLElement} element  The element to animate.
	 * @param {number}      start    Starting value.
	 * @param {number}      end      Ending value.
	 * @param {number}      duration Animation duration in milliseconds.
	 */
	function animateCount( element, start, end, duration ) {
		let startTime = null;

		function animationStep( currentTime ) {
			if ( ! startTime ) {
				startTime = currentTime;
			}

			const progress = Math.min(
				( currentTime - startTime ) / duration,
				1
			);
			const value = Math.floor( progress * ( end - start ) + start );
			element.textContent = value.toLocaleString();

			if ( progress < 1 ) {
				requestAnimationFrame( animationStep );
			}
		}

		requestAnimationFrame( animationStep );
	}

	/**
	 * Format currency value.
	 *
	 * @param {number} value The value to format.
	 * @return {string} Formatted currency string.
	 */
	function formatCurrency( value ) {
		return new Intl.NumberFormat( 'en-US', {
			style: 'currency',
			currency: 'USD',
		} ).format( value );
	}

	/**
	 * Load dashboard data from the API.
	 */
	function loadDashboardData() {
		const $container = $( '#eventive-dashboard-widget-content' );

		if ( ! $container.length ) {
			return;
		}

		// Check if EventiveData is available.
		if ( typeof EventiveData === 'undefined' || ! EventiveData.apiKey || ! EventiveData.apiBase ) {
			$container.html( `
				<div class="eventive-error">
					<strong>Error:</strong> Eventive API credentials are not configured. Please update your settings.
				</div>
			` );
			return;
		}

		// Build the API URL for charts/overview.
		const apiUrl = `${ EventiveData.apiBase }charts/overview?event_bucket=${ EventiveData.defaultBucket }`;

		// Make the API call using wp.apiFetch with custom URL.
		wp.apiFetch( {
			url: apiUrl,
			method: 'GET',
			headers: {
				'X-API-KEY': EventiveData.apiKey,
			},
		} )
			.then( ( data ) => {
				// Extract and format data.
				const totalVolume = data.total_volume ? ( data.total_volume / 100 ).toFixed( 2 ) : '0.00';
				const totalNetVolume = data.total_net_volume ? ( data.total_net_volume / 100 ).toFixed( 2 ) : '0.00';
				const totalPaidCount = data.total_paid_count ? parseInt( data.total_paid_count, 10 ) : 0;

				// Build the dashboard HTML.
				const html = `
					<div class="eventive-dashboard-container">
						<div class="eventive-dashboard-box">
							<strong>Total Volume</strong>
							<div class="count" data-count="${ totalVolume }">$0</div>
						</div>
						<div class="eventive-dashboard-box">
							<strong>Net Volume</strong>
							<div class="count" data-count="${ totalNetVolume }">$0</div>
						</div>
						<div class="eventive-dashboard-box">
							<strong>Paid Transactions</strong>
							<div class="count" data-count="${ totalPaidCount }">0</div>
						</div>
					</div>
					<p style="text-align: center; margin-top: 15px;">
						<a href="https://admin.eventive.org/" target="_blank" rel="noopener noreferrer" class="button button-primary">
							View Full Eventive Dashboard
						</a>
					</p>
				`;

				$container.html( html );

				// Animate the counts.
				$container
					.find( '.eventive-dashboard-box .count' )
					.each( function () {
						const $this = $( this );
						const endValue = parseFloat(
							$this.attr( 'data-count' )
						);
						const isCurrency = $this
							.parent()
						.find( 'strong' )
						.text()
						.includes( 'Volume' );

					if ( isCurrency ) {
						// Animate currency values.
						let startTime = null;
						const duration = 1500;
						const element = this;

						function animateCurrency( currentTime ) {
							if ( ! startTime ) {
								startTime = currentTime;
							}

							const progress = Math.min(
								( currentTime - startTime ) / duration,
								1
							);
							const currentValue = progress * endValue;
							element.textContent =
								formatCurrency( currentValue );

							if ( progress < 1 ) {
								requestAnimationFrame(
									animateCurrency
								);
							}
						}

						requestAnimationFrame( animateCurrency );
					} else {
						// Animate regular counts.
						animateCount( this, 0, endValue, 1500 );
					}
				} );
			} )
			.catch( ( error ) => {
				console.error( 'Eventive Dashboard Error:', error );

				const errorMessage = error.message || 'Unable to load dashboard data. Please try again later.';

				$container.html( `
					<div class="eventive-error">
						<strong>Connection Error:</strong> ${ errorMessage }
					</div>
				` );
			} );
	}	// Initialize when document is ready.
	$( document ).ready( function () {
		// Load dashboard data when the page loads.
		loadDashboardData();

		// Reload data when the dashboard widgets are refreshed.
		$( document ).on(
			'click',
			'#eventive_dashboard_widget .handle-actions',
			function () {
				setTimeout( loadDashboardData, 500 );
			}
		);
	} );
} )( jQuery );
