/**
 * Eventive Options Page - Event Sync Handler
 *
 * Handles syncing events from Eventive API to WordPress posts
 */

jQuery( document ).ready( function ( $ ) {
	console.log( 'Eventive Options script loaded' );

	// ====================
	// Bucket Dropdown Population
	// ====================
	const $apiKeyField = $( '#eventive_secret_key' );

	let cachedBuckets = null;
	let isFetchingBuckets = false;
	let lastApiKey = '';
	let initScheduled = false;

	/**
	 * Fetch event buckets from WordPress REST API
	 * @param apiKey
	 */
	function fetchEventBuckets( apiKey ) {
		if ( ! apiKey || apiKey.trim() === '' ) {
			disableBucketDropdowns( 'Enter API Key to choose a bucket' );
			return;
		}

		if ( isFetchingBuckets ) {
			return;
		}

		isFetchingBuckets = true;

		// Show loading state
		setBucketLoadingState( 'Loading buckets...' );

		// Fetch buckets using WordPress REST API
		wp.apiFetch( {
			path:
				'/eventive/v1/event_buckets?eventive_nonce=' +
				EventiveData.eventNonce,
			method: 'GET',
		} )
			.then( function ( response ) {
				// Response from WP REST API
				if (
					response &&
					response.event_buckets &&
					response.event_buckets.length > 0
				) {
					cachedBuckets = response.event_buckets;
					lastApiKey = apiKey;
					populateBucketDropdowns( response.event_buckets );
				} else {
					cachedBuckets = null;
					disableBucketDropdowns( 'No buckets found' );
				}
			} )
			.catch( function ( error ) {
				console.error( 'Error fetching event buckets:', error );
				cachedBuckets = null;
				disableBucketDropdowns(
					'Error loading buckets. Check API key.'
				);
			} )
			.finally( function () {
				isFetchingBuckets = false;
			} );
	}

	/**
	 * Populate the bucket dropdown with options
	 * @param buckets
	 */
	function populateBucketDropdowns( buckets ) {
		const $bucketDropdowns = getBucketDropdowns();

		$bucketDropdowns.each( function () {
			const $bucketDropdown = $( this );
			const selectedValue =
				$bucketDropdown.attr( 'data-selected-value' ) || '';

			// Build options HTML
			let optionsHtml = '<option value="">Select a bucket</option>';
			buckets.forEach( function ( bucket ) {
				const selected =
					bucket.id === selectedValue ? ' selected' : '';
				optionsHtml +=
					'<option value="' +
					bucket.id +
					'"' +
					selected +
					'>' +
					bucket.name +
					'</option>';
			} );

			// Update dropdown
			$bucketDropdown
				.html( optionsHtml )
				.prop( 'disabled', false )
				.attr( 'data-eventive-buckets-initialized', '1' );
		} );
	}

	/**
	 * Disable bucket dropdown with message
	 * @param message
	 */
	function disableBucketDropdowns( message ) {
		const $bucketDropdowns = getBucketDropdowns();
		$bucketDropdowns
			.html( '<option value="">' + message + '</option>' )
			.prop( 'disabled', true )
			.attr( 'data-eventive-buckets-initialized', '1' );
	}

	function setBucketLoadingState( message ) {
		const $bucketDropdowns = getBucketDropdowns();
		$bucketDropdowns
			.prop( 'disabled', true )
			.html( '<option value="">' + message + '</option>' );
	}

	function getBucketDropdowns() {
		return $( 'select.eventive-bucket-dropdown' );
	}

	/**
	 * Initialize bucket dropdown on page load
	 */
	function initBucketDropdowns() {
		const $bucketDropdowns = getBucketDropdowns();
		if ( ! $bucketDropdowns.length ) {
			return;
		}

		const hasUninitialized =
			$bucketDropdowns.filter( function () {
				return ! $( this ).attr( 'data-eventive-buckets-initialized' );
			} ).length > 0;

		if ( ! hasUninitialized ) {
			return;
		}

		// Check if API key is available from localization
		if (
			typeof EventiveData !== 'undefined' &&
			EventiveData.apiKey &&
			EventiveData.apiKey.trim() !== ''
		) {
			// API key exists in saved settings, fetch buckets
			if ( cachedBuckets && lastApiKey === EventiveData.apiKey ) {
				populateBucketDropdowns( cachedBuckets );
				return;
			}
			fetchEventBuckets( EventiveData.apiKey );
		} else {
			// No API key, disable dropdown
			disableBucketDropdowns( 'Enter API Key to choose a bucket' );
		}
	}

	/**
	 * Watch for API key field changes
	 */
	if ( $apiKeyField.length ) {
		// Initialize on page load
		initBucketDropdowns();

		// Watch for changes to API key field
		$apiKeyField.on( 'input change', function () {
			const apiKey = $( this ).val();
			if ( apiKey && apiKey.trim() !== '' ) {
				if ( apiKey !== lastApiKey ) {
					cachedBuckets = null;
				}
				fetchEventBuckets( apiKey );
			} else {
				cachedBuckets = null;
				lastApiKey = '';
				disableBucketDropdowns( 'Enter API Key to choose a bucket' );
			}
		} );
	}

	// Watch for dynamically added bucket dropdowns.
	const bucketObserver = new MutationObserver( function () {
		if ( initScheduled ) {
			return;
		}
		initScheduled = true;
		window.requestAnimationFrame( function () {
			initScheduled = false;
			initBucketDropdowns();
		} );
	} );

	if ( document.body ) {
		bucketObserver.observe( document.body, {
			childList: true,
			subtree: true,
		} );
	}

	// ====================
	// Event Sync Handler
	// ====================
	// Find the sync events form
	const $form = $( 'form' ).has( 'button[name="eventive_sync_events"]' );
	const $button = $( 'button[name="eventive_sync_events"]' );
	const $progressDiv = $( '#eventive-sync-events-progress' );

	if ( $form.length && $button.length ) {
		console.log( 'Sync events form found' );

		// Prevent default form submission and handle via AJAX
		$form.on( 'submit', function ( e ) {
			e.preventDefault();
			console.log( 'Sync events button clicked' );

			// Verify nonce
			const nonce = $( 'input[name="eventive_sync_events_nonce"]' ).val();
			if ( ! nonce ) {
				alert(
					'Security verification failed. Please refresh the page and try again.'
				);
				return;
			}

			// Disable button and show progress
			$button.prop( 'disabled', true );
			$progressDiv
				.show()
				.html( 'Syncing events with Eventive, please wait...' );

			// Make AJAX call to sync events
			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				data: {
					action: 'sync_eventive_events',
					nonce,
				},
				success( response ) {
					console.log( 'Sync response:', response );

					if ( response.success ) {
						const data = response.data;
						let html = '<div style="margin-top: 10px;">';

						// Overall summary
						html +=
							'<p style="margin: 5px 0;"><strong>Sync Complete:</strong> ' +
							data.synced_count +
							' total films synced (' +
							data.created_count +
							' created, ' +
							data.updated_count +
							' updated, ' +
							data.skipped_count +
							' skipped)</p>';

						// Show detailed results if available
						if (
							data.sync_results &&
							data.sync_results.length > 0
						) {
							html += '<div style="margin-top: 10px;">';
							html += '<strong>Details:</strong>';
							html +=
								'<ul style="margin: 5px 0; padding-left: 20px;">';

							data.sync_results.forEach( function ( result ) {
								let statusColor = 'green';
								let statusIcon = '✓';

								if ( result.status === 'error' ) {
									statusColor = 'red';
									statusIcon = '✗';
								} else if ( result.status === 'warning' ) {
									statusColor = 'orange';
									statusIcon = '⚠';
								} else if ( result.status === 'skipped' ) {
									statusColor = 'gray';
									statusIcon = '○';
								}

								html +=
									'<li style="color: ' +
									statusColor +
									'; margin: 3px 0;">' +
									statusIcon +
									' <strong>' +
									result.name +
									':</strong> ' +
									result.message +
									'</li>';
							} );

							html += '</ul>';
							html += '</div>';
						}

						// Show error indicator if any errors occurred
						if ( data.has_errors ) {
							html +=
								'<p style="color: orange; margin-top: 10px;"><strong>Note:</strong> Some sync configurations encountered errors. See details above.</p>';
						}

						html += '</div>';

						$progressDiv.html( html );

						// Re-enable button
						$button.prop( 'disabled', false );
					} else {
						$progressDiv.html(
							'<span style="color: red;">✗ Error: ' +
								( response.data?.message ||
									'Unknown error occurred' ) +
								'</span>'
						);
						$button.prop( 'disabled', false );
					}
				},
				error( xhr, status, error ) {
					console.error( 'AJAX error:', status, error );
					$progressDiv.html(
						'<span style="color: red;">✗ Connection error: ' +
							error +
							'</span>'
					);
					$button.prop( 'disabled', false );
				},
			} );
		} );
	} else {
		console.log( 'Sync events form not found' );
	}
} );
