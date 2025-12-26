/**
 * Eventive Events Block - Frontend React Component
 */
import { createRoot } from '@wordpress/element';

/**
 * Initialize all events blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll( '.wp-block-eventive-events' );

	blocks.forEach( ( block ) => {
		// Extract attributes from data attributes
		const tagId = block.getAttribute( 'data-tag-id' ) || '';
		const venueId = block.getAttribute( 'data-venue-id' ) || '';
		const imageMode = block.getAttribute( 'data-image' ) || 'poster';
		const showDescription =
			block.getAttribute( 'data-description' ) === 'true';
		const showFilter = block.getAttribute( 'data-show-filter' ) === 'true';
		const preselectEventId = block.getAttribute( 'data-event-id' ) || '';
		const filmsBase = block.getAttribute( 'data-films-base' ) || '';

		// Get WP options passed from PHP via global variables
		const eventBucket = window.eventiveOptions?.eventBucket || '';
		const apiKey = window.eventiveOptions?.apiKey || '';
		const filmDetailBaseURL =
			filmsBase || window.eventiveOptions?.filmDetailBaseURL || '';
		const prettyPermalinks =
			window.eventiveOptions?.usePrettyPermalinks || false;
		const filmSyncEnabled =
			window.eventiveOptions?.filmSyncEnabled || false;

		// Initialize the events display
		const fetchAndRenderEvents = async () => {
			try {
				const endpoints = window.EventiveBlockData?.apiEndpoints || {};
				const nonce = window.EventiveBlockData?.eventNonce || '';

				const queryParams = new URLSearchParams( {
					bucket_id: eventBucket,
					endpoint: 'events',
					upcoming_only: 'true',
					eventive_nonce: nonce,
					...( tagId && { 'tag-id': tagId } ),
					...( venueId && { 'venue-id': venueId } ),
				} );

				const response = await wp.apiFetch( {
					path: `/eventive/v1/${ endpoints.event_buckets }?${ queryParams }`,
					method: 'GET',
				} );

				const events = ( response?.events || [] ).filter(
					( event ) => ! event.is_virtual
				);

				renderEvents( block, events, {
					imageMode,
					showDescription,
					showFilter,
					filmDetailBaseURL,
					prettyPermalinks,
					filmSyncEnabled,
				} );

				// Rebuild Eventive buttons (if Eventive is loaded for cart/tickets)
				if ( window.Eventive?.rebuild ) {
					window.Eventive.rebuild();
				}
			} catch ( error ) {
				console.error( 'Error fetching events:', error );
				block.innerHTML =
					'<p class="error-message">Failed to load events.</p>';
			}
		};

		fetchAndRenderEvents();
	} ); /**
						 * Render events into the block
						 * @param container
						 * @param events
						 * @param options
						 */
	function renderEvents( container, events, options ) {
		if ( ! events.length ) {
			container.innerHTML =
				'<p class="no-events">No upcoming events found.</p>';
			return;
		}

		// Group events by date
		const grouped = {};
		events.forEach( ( event ) => {
			const date = new Date( event.start_time );
			const key = date.toLocaleDateString( undefined, {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			} );
			if ( ! grouped[ key ] ) {
				grouped[ key ] = [];
			}
			grouped[ key ].push( event );
		} );

		// Build HTML
		let html = '<div class="event-schedule-container">';

		Object.keys( grouped ).forEach( ( dateKey ) => {
			const dayEvents = grouped[ dateKey ];
			const countClass = `events-count-${ Math.min(
				dayEvents.length,
				3
			) }`;

			html += `
				<div class="event-group">
					<h3 class="event-group-header">${ dateKey }</h3>
					<div class="event-group-items ${ countClass }">
			`;

			dayEvents.forEach( ( event ) => {
				html += renderEventCard( event, options );
			} );

			html += '</div></div>';
		} );

		html += '</div>';
		container.innerHTML = html;
	}

	/**
	 * Render a single event card
	 * @param event
	 * @param options
	 */
	function renderEventCard( event, options ) {
		const { imageMode, showDescription, filmDetailBaseURL } = options;
		const time = new Date( event.start_time ).toLocaleTimeString(
			undefined,
			{
				hour: 'numeric',
				minute: '2-digit',
			}
		);

		let imageHTML = '';
		if ( imageMode !== 'none' && event.film ) {
			const imgSrc =
				imageMode === 'poster'
					? event.film.poster_url
					: imageMode === 'cover'
					? event.film.cover_url
					: event.film.still_url;

			if ( imgSrc ) {
				imageHTML = `<div class="event-image"><img src="${ imgSrc }" alt="${
					event.film.name || event.name
				}" /></div>`;
			}
		}

		let descriptionHTML = '';
		if ( showDescription && event.description ) {
			descriptionHTML = `<p class="event-description">${ event.description }</p>`;
		}

		return `
			<div class="event-item">
				${ imageHTML }
				<div class="event-content">
					<h4 class="event-title">${ event.name }</h4>
					<p class="event-time">${ time }</p>
					${ event.venue ? `<p class="event-venue">${ event.venue.name }</p>` : '' }
					${ descriptionHTML }
					<button class="eventive-button" data-eventive-event-id="${
						event.id
					}">Buy Tickets</button>
				</div>
			</div>
		`;
	}
} );
