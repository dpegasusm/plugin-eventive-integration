/**
 * Film Showtimes Block - Frontend View Script
 */

/**
 * Group events by date
 * @param events
 */
function groupEventsByDate( events ) {
	const grouped = {};

	events.forEach( ( event ) => {
		const startTime = new Date( event.start_time );
		const dateKey = startTime.toLocaleDateString( 'en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		} );

		if ( ! grouped[ dateKey ] ) {
			grouped[ dateKey ] = [];
		}

		grouped[ dateKey ].push( event );
	} );

	// Sort events within each date by time
	Object.keys( grouped ).forEach( ( dateKey ) => {
		grouped[ dateKey ].sort(
			( a, b ) => new Date( a.start_time ) - new Date( b.start_time )
		);
	} );

	return grouped;
}

/**
 * Initialize Film Showtimes blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const showtimeBlocks = document.querySelectorAll(
		'.wp-block-eventive-film-showtimes'
	);

	showtimeBlocks.forEach( ( block ) => {
		// Get film ID and bucket ID from EventiveBlockData (localized from PHP)
		const filmId = window.EventiveBlockData?.filmId;
		const bucketId = window.EventiveBlockData?.eventBucket || '';

		if ( ! filmId ) {
			block.innerHTML =
				'<div class="eventive-error">This block requires it be placed on a Eventive Film post type.</div>';
			return;
		}

		if ( ! bucketId ) {
			block.innerHTML =
				'<div class="eventive-error">Missing bucket configuration.</div>';
			return;
		}

		// Display loading message while fetching
		block.innerHTML =
			'<div class="eventive-loading">Loading showtimes...</div>';

		const fetchAndRenderShowtimes = () => {
			// Fetch showtimes from Eventive API
			window.Eventive.request( {
				method: 'GET',
				path: `event_buckets/${ bucketId }/films/${ filmId }/events`,
				authenticatePerson: false,
			} )
				.then( ( response ) => {
					const events = response.events || [];
					if ( events.length === 0 ) {
						block.innerHTML =
							'<div class="eventive-error">No upcoming showtimes available</div>';
						return;
					}

					// Group events by date
					const grouped = groupEventsByDate( events );

					// Build HTML for showtimes
					const showtimesHTML = Object.entries( grouped )
						.map(
							( [ dateKey, dateEvents ] ) => `
								<div class="eventive-showtime-date-group">
									<h3 class="eventive-showtime-date">${ dateKey }</h3>
									<div class="eventive-showtime-list">
										${ dateEvents
											.map( ( event ) => {
												const startTime = new Date(
													event.start_time
												);
												const timeString =
													startTime.toLocaleTimeString(
														'en-US',
														{
															hour: 'numeric',
															minute: '2-digit',
															hour12: true,
														}
													);
												return `
											<div class="eventive-showtime-item">
												<span class="eventive-showtime-time">${ timeString }</span>
												<div class="eventive-button" data-event="${ event.id }"></div>
											</div>
										`;
											} )
											.join( '' ) }
									</div>
								</div>
							`
						)
						.join( '' );

					block.innerHTML = `<div class="eventive-film-showtimes-container">${ showtimesHTML }</div>`;

					// Rebuild Eventive buttons
					if ( window.Eventive?.rebuild ) {
						window.Eventive.rebuild();
					}
				} )
				.catch( ( error ) => {
					console.error(
						'[eventive-film-showtimes] Error fetching showtimes:',
						error
					);
					block.innerHTML =
						'<div class="eventive-error">Unable to load showtimes</div>';
				} );
		};

		let hasRun = false;

		const guardedFetchAndRender = () => {
			if ( hasRun ) {
				return;
			}
			hasRun = true;

			// Clean up listener
			if ( window.Eventive && window.Eventive.off ) {
				window.Eventive.off( 'ready', guardedFetchAndRender );
			}

			fetchAndRenderShowtimes();
		};

		if ( window.Eventive && window.Eventive._ready ) {
			guardedFetchAndRender();
		} else if (
			window.Eventive &&
			typeof window.Eventive.on === 'function'
		) {
			window.Eventive.on( 'ready', guardedFetchAndRender );
		} else {
			setTimeout( () => {
				if (
					window.Eventive &&
					typeof window.Eventive.request === 'function'
				) {
					guardedFetchAndRender();
				} else {
					block.innerHTML =
						'<div class="eventive-error">Eventive API not available</div>';
				}
			}, 1000 );
		}
	} );
} );
