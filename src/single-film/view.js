/**
 * Single Film Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Initialize Single Film blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const singleFilmBlocks = document.querySelectorAll(
		'.wp-block-eventive-single-film'
	);

	singleFilmBlocks.forEach( ( block ) => {
		const filmId = block.dataset.filmId;
		const eventId = block.dataset.eventId;

		if ( ! filmId && ! eventId ) {
			const container = block.querySelector(
				'#single-film-or-event-container'
			);
			if ( container ) {
				container.innerHTML =
					'<div>Please provide either a valid film ID or event ID.</div>';
			}
			return;
		}

		// Get Eventive options from global settings
		const eventBucket = window.EventiveBlockData?.eventBucket || '';
		const nonce = window.EventiveBlockData?.eventNonce || '';

		const heroSection = block.querySelector( '#hero-section' );
		const detailsContainer = block.querySelector( '#details-container' );

		const fetchAndRenderFilm = () => {
			if ( filmId ) {
				// Fetch Film Details
				window.Eventive.request( {
					method: 'GET',
					path: `films/${ filmId }`,
					authenticatePerson: false,
				} )
					.then( ( film ) => {
						// HERO Section
						if ( heroSection ) {
							heroSection.style.backgroundImage = `url('${
								film.cover_image || ''
							}')`;
							heroSection.innerHTML = `
								<div class="hero-overlay">
									<h1 class="film-title">${ film.name }</h1>
								</div>`;
						}

						// Film Details
						const tagsHTML = ( film.tags || [] )
							.map(
								( tag ) =>
									`<span class="film-tag">${ tag.name }</span>`
							)
							.join( '' );

						if ( detailsContainer ) {
							detailsContainer.innerHTML = `
								<div class="film-details">
									<h2>About the Film</h2>
									<p>${ film.description || 'No description available.' }</p>
									<div class="film-info">
										<div><strong>Director:</strong> ${ film.credits?.director || 'Unknown' }</div>
										<div><strong>Runtime:</strong> ${ film.details?.runtime || 'N/A' } minutes</div>
										<div><strong>Year:</strong> ${ film.details?.year || 'N/A' }</div>
										<div><strong>Language:</strong> ${ film.details?.language || 'N/A' }</div>
									</div>
									<div class="film-tags">${ tagsHTML }</div>
								</div>
								<div id="film-events-container">
									<h2>Upcoming Screenings</h2>
									<p class="loading-message">Loading screenings...</p>
								</div>`;
						}

						// Fetch Film Events separately
						window.Eventive.request( {
							method: 'GET',
							path: `event_buckets/${ eventBucket }/films/${ filmId }/events`,
							authenticatePerson: false,
						} )
							.then( ( eventsResponse ) => {
								const eventsContainer = document.getElementById(
									'film-events-container'
								);
								if ( ! eventsContainer ) {
									return;
								}

								// Remove loading message
								const loadingMsg =
									eventsContainer.querySelector(
										'.loading-message'
									);
								if ( loadingMsg ) {
									loadingMsg.remove();
								}

								const events = eventsResponse.events || [];
								if ( events.length === 0 ) {
									eventsContainer.innerHTML +=
										'<p>No upcoming screenings found for this film.</p>';
								} else {
									eventsContainer.innerHTML += events
										.map(
											( event ) => `
												<div class="event-item">
													<h3>${ event.name }</h3>
													<p>${ new Date( event.start_time ).toLocaleString() }</p>
													<div class="eventive-button" data-event="${ event.id }"></div>
												</div>`
										)
										.join( '' );
								}
								if ( window.Eventive?.rebuild ) {
									window.Eventive.rebuild();
								}
							} )
							.catch( ( error ) => {
								console.error(
									'[eventive-single-film] Error fetching film events:',
									error
								);
								const eventsContainer = document.getElementById(
									'film-events-container'
								);
								if ( eventsContainer ) {
									// Remove loading message
									const loadingMsg =
										eventsContainer.querySelector(
											'.loading-message'
										);
									if ( loadingMsg ) {
										loadingMsg.remove();
									}
									// Add error message but keep container
									eventsContainer.innerHTML +=
										'<p class="error-message">Unable to load screenings at this time.</p>';
								}
							} );
					} )
					.catch( ( error ) => {
						console.error(
							'[eventive-single-film] Error fetching film data:',
							error
						);
						if ( detailsContainer ) {
							detailsContainer.innerHTML =
								'<p class="error-message">Unable to load film details. Please try again later.</p>';
						}
					} );
			} else if ( eventId ) {
				// Fetch Event Details
				window.Eventive.request( {
					method: 'GET',
					path: `events/${ eventId }`,
					authenticatePerson: false,
				} )
					.then( ( event ) => {
						// HERO Section
						if ( heroSection ) {
							heroSection.style.backgroundImage = `url('${
								event.films?.[ 0 ]?.cover_image || ''
							}')`;
							heroSection.innerHTML = `
								<div class="hero-overlay">
									<h1 class="event-title">${ event.name }</h1>
									<div class="eventive-button" data-event="${ event.id }"></div>
								</div>`;
						}

						// Event Details - Load basic info first
						if ( detailsContainer ) {
							detailsContainer.innerHTML = `
								<div class="event-details">
									<h2>About the Event</h2>
									<p>${ event.description || 'No description available.' }</p>
									<div class="event-info">
										<div><strong>Venue:</strong> ${ event.venue?.name || 'N/A' }</div>
										<div><strong>Date & Time:</strong> ${ new Date(
											event.start_time
										).toLocaleString() }</div>
									</div>
								</div>
								<div class="event-films">
									<h2>Featured Films</h2>
									<div class="films-container" id="films-container">
										<p class="loading-message">Loading films...</p>
									</div>
								</div>`;

							// Load films
							const filmsHTML = ( event.films || [] )
								.map(
									( film ) => `
								<div class="film-card">
									<img src="${ film.poster_image }" alt="${ film.name }" class="film-poster">
									<h3>${ film.name }</h3>
									<p>${ film.description || 'No description available.' }</p>
								</div>
							`
								)
								.join( '' );

							const filmsContainer =
								document.getElementById( 'films-container' );
							if ( filmsContainer ) {
								if ( filmsHTML ) {
									filmsContainer.innerHTML = filmsHTML;
								} else {
									filmsContainer.innerHTML =
										'<p>No films associated with this event.</p>';
								}
							}
						}
						if ( window.Eventive?.rebuild ) {
							window.Eventive.rebuild();
						}
					} )
					.catch( ( error ) => {
						console.error(
							'[eventive-single-film] Error fetching event data:',
							error
						);
						if ( detailsContainer ) {
							detailsContainer.innerHTML =
								'<p class="error-message">Unable to load event details. Please try again later.</p>';
						}
					} );
			}
		};

		if ( window.Eventive && window.Eventive._ready ) {
			fetchAndRenderFilm();
		} else if (
			window.Eventive &&
			typeof window.Eventive.on === 'function'
		) {
			window.Eventive.on( 'ready', fetchAndRenderFilm );
		} else {
			setTimeout( () => {
				if (
					window.Eventive &&
					typeof window.Eventive.request === 'function'
				) {
					fetchAndRenderFilm();
				} else {
					console.error(
						'[eventive-single-film] Eventive API not available'
					);
					const container = block.querySelector(
						'#single-film-or-event-container'
					);
					if ( container ) {
						container.innerHTML =
							'<div>Error: Eventive API not available</div>';
					}
				}
			}, 1000 );
		}
	} );
} );
