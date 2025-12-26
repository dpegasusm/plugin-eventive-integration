/**
 * Single Film Block (Selector) - Frontend View Script
 * 
 * This block uses the same rendering logic as the single-film block
 * but with a selector-based editor interface
 */
import { createRoot } from '@wordpress/element';

/**
 * Initialize Single Film Block (Selector) on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const singleFilmBlocks = document.querySelectorAll( '.wp-block-eventive-single-film-block' );

	singleFilmBlocks.forEach( ( block ) => {
		const type = block.dataset.type;
		const id = block.dataset.id;

		if ( ! id ) {
			const container = block.querySelector( '.single-film-block-container' );
			if ( container ) {
				container.innerHTML = '<div>Please select a valid film or event ID.</div>';
			}
			return;
		}

		// Set filmId or eventId based on type
		const filmId = type === 'film' ? id : '';
		const eventId = type === 'event' ? id : '';

		// Get Eventive options from global settings
		const eventBucket = window.eventiveSettings?.eventBucket || '';

		const container = block.querySelector( '.single-film-block-container' );

		if ( window.Eventive ) {
			window.Eventive.on( 'ready', () => {
				if ( filmId ) {
					// Fetch Film Details
					const filmDetailsUrl = `films/${ filmId }`;
					const eventsUrl = `event_buckets/${ eventBucket }/films/${ filmId }/events`;

					window.Eventive.request( { method: 'GET', path: filmDetailsUrl } )
						.then( ( film ) => {
							// Create hero and details HTML
							const tagsHTML = ( film.tags || [] ).map( ( tag ) =>
								`<span class="film-tag">${ tag.name }</span>`
							).join( '' );

							if ( container ) {
								container.innerHTML = `
									<div id="hero-section" style="background-image: url('${ film.cover_image || '' }');">
										<div class="hero-overlay">
											<h1 class="film-title">${ film.name }</h1>
										</div>
									</div>
									<div id="details-container">
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
										</div>
									</div>
								`;

								// Fetch Film Events
								window.Eventive.request( { method: 'GET', path: eventsUrl } )
									.then( ( eventsResponse ) => {
										const eventsContainer = document.getElementById( 'film-events-container' );
										const events = eventsResponse.events || [];
										if ( events.length === 0 ) {
											eventsContainer.innerHTML += '<p>No upcoming screenings found for this film.</p>';
										} else {
											eventsContainer.innerHTML += events.map( ( event ) => `
												<div class="event-item">
													<h3>${ event.name }</h3>
													<p>${ new Date( event.start_time ).toLocaleString() }</p>
													<div class="eventive-button" data-event="${ event.id }"></div>
												</div>`).join( '' );
										}
										window.Eventive.rebuild();
									} );
							}
						} );
				} else if ( eventId ) {
					// Fetch Event Details
					const eventDetailsUrl = `events/${ eventId }`;

					window.Eventive.request( { method: 'GET', path: eventDetailsUrl } )
						.then( ( event ) => {
							const filmsHTML = ( event.films || [] ).map( ( film ) => `
								<div class="film-card">
									<img src="${ film.poster_image }" alt="${ film.name }" class="film-poster">
									<h3>${ film.name }</h3>
									<p>${ film.description || 'No description available.' }</p>
								</div>
							` ).join( '' );

							if ( container ) {
								container.innerHTML = `
									<div id="hero-section" style="background-image: url('${ event.films?.[ 0 ]?.cover_image || '' }');">
										<div class="hero-overlay">
											<h1 class="event-title">${ event.name }</h1>
											<div class="eventive-button" data-event="${ event.id }"></div>
										</div>
									</div>
									<div id="details-container">
										<div class="event-details">
											<h2>About the Event</h2>
											<p>${ event.description || 'No description available.' }</p>
											<div class="event-info">
												<div><strong>Venue:</strong> ${ event.venue?.name || 'N/A' }</div>
												<div><strong>Date & Time:</strong> ${ new Date( event.start_time ).toLocaleString() }</div>
											</div>
										</div>
										<div class="event-films">
											<h2>Featured Films</h2>
											<div class="films-container">
												${ filmsHTML }
											</div>
										</div>
									</div>
								`;
							}
							window.Eventive.rebuild();
						} );
				}
			} );
		} else {
			console.error( 'Eventive API is not initialized.' );
			if ( container ) {
				container.innerHTML = '<p>Eventive API is not available. Please check your integration.</p>';
			}
		}
	} );
} );
