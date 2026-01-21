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
	const $bucketDropdown = $( '#eventive_default_bucket_id' );
	const $bucketWrapper = $bucketDropdown.closest( 'tr' );

	/**
	 * Fetch event buckets from WordPress REST API
	 */
	function fetchEventBuckets( apiKey ) {
		if ( ! apiKey || apiKey.trim() === '' ) {
			disableBucketDropdown( 'Enter API Key to choose a bucket' );
			return;
		}

		// Show loading state
		$bucketDropdown.prop( 'disabled', true );
		$bucketDropdown.html( '<option value="">Loading buckets...</option>' );

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
					populateBucketDropdown( response.event_buckets );
				} else {
					disableBucketDropdown( 'No buckets found' );
				}
			} )
			.catch( function ( error ) {
				console.error( 'Error fetching event buckets:', error );
				disableBucketDropdown(
					'Error loading buckets. Check API key.'
				);
			} );
	}

	/**
	 * Populate the bucket dropdown with options
	 */
	function populateBucketDropdown( buckets ) {
		const selectedValue =
			$bucketDropdown.attr( 'data-selected-value' ) || '';

		// Build options HTML
		let optionsHtml = '<option value="">Select a bucket</option>';
		buckets.forEach( function ( bucket ) {
			const selected = bucket.id === selectedValue ? ' selected' : '';
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
		$bucketDropdown.html( optionsHtml ).prop( 'disabled', false );
	}

	/**
	 * Disable bucket dropdown with message
	 */
	function disableBucketDropdown( message ) {
		$bucketDropdown
			.html( '<option value="">' + message + '</option>' )
			.prop( 'disabled', true );
	}

	/**
	 * Initialize bucket dropdown on page load
	 */
	function initBucketDropdown() {
		// Check if API key is available from localization
		if (
			typeof EventiveData !== 'undefined' &&
			EventiveData.apiKey &&
			EventiveData.apiKey.trim() !== ''
		) {
			// API key exists in saved settings, fetch buckets
			fetchEventBuckets( EventiveData.apiKey );
		} else {
			// No API key, disable dropdown
			disableBucketDropdown( 'Enter API Key to choose a bucket' );
		}
	}

	/**
	 * Watch for API key field changes
	 */
	if ( $apiKeyField.length && $bucketDropdown.length ) {
		// Initialize on page load
		initBucketDropdown();

		// Watch for changes to API key field
		$apiKeyField.on( 'input change', function () {
			const apiKey = $( this ).val();
			if ( apiKey && apiKey.trim() !== '' ) {
				fetchEventBuckets( apiKey );
			} else {
				disableBucketDropdown( 'Enter API Key to choose a bucket' );
			}
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
						$progressDiv.html(
							'<span style="color: green;">✓ ' +
								response.data.message +
								'</span>'
						);

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
