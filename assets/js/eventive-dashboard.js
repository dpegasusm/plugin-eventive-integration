/**
 * Eventive Dashboard Widget JavaScript
 *
 * Handles loading and displaying Eventive analytics data on the WordPress dashboard.
 *
 * @package Eventive
 * @since 1.0.0
 */

( function () {
	'use strict';

	/**
	 * Helper to get element by ID.
	 *
	 * @param {string} id The element ID.
	 * @return {HTMLElement|null} The element or null.
	 */
	function $( id ) {
		return document.getElementById( id );
	}

	/**
	 * Helper to query selector.
	 *
	 * @param {HTMLElement|Document} root The root element.
	 * @param {string} sel The selector.
	 * @return {HTMLElement|null} The element or null.
	 */
	function bySel( root, sel ) {
		return ( root || document ).querySelector( sel );
	}

	/**
	 * Escape HTML special characters.
	 *
	 * @param {string} str The string to escape.
	 * @return {string} The escaped string.
	 */
	function htmlEscape( str ) {
		return ( str || '' ).replace( /[&<>"']/g, function ( c ) {
			return {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			}[ c ];
		} );
	}

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
		const container = $( 'eventive-dashboard-widget-content' );

		if ( ! container ) {
			return;
		}

		// Check if wp.apiFetch is available.
		if ( ! window.wp || ! window.wp.apiFetch ) {
			container.innerHTML =
				'<div class="eventive-error"><strong>Error:</strong> WordPress API is not available. Please check your configuration.</div>';
			return;
		}

		// Check if EventiveData is available.
		if (
			typeof EventiveData === 'undefined' ||
			! EventiveData.defaultBucket ||
			! EventiveData.eventNonce
		) {
			container.innerHTML =
				'<div class="eventive-error"><strong>Error:</strong> Eventive configuration is missing. Please update your settings.</div>';
			return;
		}

		// Build the API path for charts endpoint.
		const apiPath =
			'/eventive/v1/charts?event_bucket=' +
			encodeURIComponent( EventiveData.defaultBucket ) +
			'&eventive_nonce=' +
			encodeURIComponent( EventiveData.eventNonce );

		// Make the API call using wp.apiFetch.
		wp.apiFetch( {
			path: apiPath,
			method: 'GET',
		} )
			.then( function ( data ) {
				// Extract and format data.
				const totalVolume = data.total_volume
					? ( data.total_volume / 100 ).toFixed( 2 )
					: '0.00';
				const totalNetVolume = data.total_net_volume
					? ( data.total_net_volume / 100 ).toFixed( 2 )
					: '0.00';
				const totalPaidCount = data.total_paid_count
					? parseInt( data.total_paid_count, 10 )
					: 0;

				// Build the dashboard HTML.
				const html =
					'<div class="eventive-dashboard-container">' +
					'<div class="eventive-dashboard-box">' +
					'<strong>Total Volume</strong>' +
					'<div class="count" data-count="' +
					htmlEscape( totalVolume ) +
					'">$0</div>' +
					'</div>' +
					'<div class="eventive-dashboard-box">' +
					'<strong>Net Volume</strong>' +
					'<div class="count" data-count="' +
					htmlEscape( totalNetVolume ) +
					'">$0</div>' +
					'</div>' +
					'<div class="eventive-dashboard-box">' +
					'<strong>Paid Transactions</strong>' +
					'<div class="count" data-count="' +
					htmlEscape( String( totalPaidCount ) ) +
					'">0</div>' +
					'</div>' +
					'</div>' +
					'<p style="text-align: center; margin-top: 15px;">' +
					'<a href="https://admin.eventive.org/" target="_blank" rel="noopener noreferrer" class="button button-primary">' +
					'View Full Eventive Dashboard' +
					'</a>' +
					'</p>';

				container.innerHTML = html;

				// Animate the counts.
				const countElements = container.querySelectorAll(
					'.eventive-dashboard-box .count'
				);
				countElements.forEach( function ( element ) {
					const endValue = parseFloat(
						element.getAttribute( 'data-count' )
					);
					const parentBox = element.closest(
						'.eventive-dashboard-box'
					);
					const strongText = parentBox
						? bySel( parentBox, 'strong' ).textContent
						: '';
					const isCurrency = strongText.includes( 'Volume' );

					if ( isCurrency ) {
						// Animate currency values.
						let startTime = null;
						const duration = 1500;

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
								requestAnimationFrame( animateCurrency );
							}
						}

						requestAnimationFrame( animateCurrency );
					} else {
						// Animate regular counts.
						animateCount( element, 0, endValue, 1500 );
					}
				} );
			} )
			.catch( function ( error ) {
				console.error(
					'[eventive-dashboard] Error fetching dashboard data:',
					error && ( error.message || error.status || error )
				);

				const errorMessage =
					( error && error.message ) ||
					'Unable to load dashboard data. Please try again later.';

				container.innerHTML =
					'<div class="eventive-error">' +
					'<strong>Connection Error:</strong> ' +
					htmlEscape( errorMessage ) +
					'</div>';
			} );
	}

	/**
	 * Initialize the dashboard widget.
	 */
	function initDashboard() {
		// Load data immediately since wp.apiFetch should be available.
		loadDashboardData();
	}

	// Initialize when document is ready.
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initDashboard, {
			once: true,
		} );
	} else {
		initDashboard();
	}
} )();
