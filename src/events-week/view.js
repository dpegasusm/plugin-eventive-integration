/**
 * Eventive Events Week Block - Frontend React Component
 */
import { createRoot } from '@wordpress/element';

/**
 * Initialize weekly calendar
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-events-week'
	);

	if ( blocks.length === 0 ) {
		return;
	}

	// Ensure Eventive API is loaded
	if ( window.Eventive && window.Eventive.on ) {
		let hasRun = false;
		const onReady = async function () {
			if ( hasRun ) {
				return;
			}
			hasRun = true;

			// Clean up listener
			if ( window.Eventive && window.Eventive.off ) {
				window.Eventive.off( 'ready', onReady );
			}

			blocks.forEach( initializeWeeklyCalendar );
		};

		if ( window.Eventive._ready || window.Eventive.ready ) {
			onReady();
		} else {
			window.Eventive.on( 'ready', onReady );
		}
	}

	async function initializeWeeklyCalendar( block ) {
		const eventBucket = window.EventiveBlockData?.eventBucket || '';
		const apiKey = window.EventiveBlockData?.apiKey || '';

		if ( ! eventBucket ) {
			block.innerHTML =
				'<p class="error-message">Event bucket not configured.</p>';
			return;
		}

		let currentStartDate = getStartOfWeek( new Date() );

		const events = await fetchAllEvents( eventBucket, apiKey );
		renderWeeklyTable( block, events, currentStartDate );
		updateWeekRangeDisplay( block, currentStartDate );
		setupNavigationButtons(
			block,
			events,
			currentStartDate,
			( newStartDate ) => {
				currentStartDate = newStartDate;
			}
		);
		setupEventModal( block );
	}

	async function fetchAllEvents( eventBucket, apiKey ) {
		return window.Eventive.request( {
			method: 'GET',
			path: `event_buckets/${ eventBucket }/events`,
			authenticatePerson: false,
		} )
			.then( ( response ) => response.events || [] )
			.catch( ( error ) => {
				console.error(
					'[eventive-events-week] Error fetching all events:',
					error
				);
				return [];
			} );
	}

	function getStartOfWeek( date ) {
		const start = new Date( date );
		start.setHours( 0, 0, 0, 0 );
		start.setDate( start.getDate() - start.getDay() );
		return start;
	}

	function renderWeeklyTable( block, events, startDate ) {
		const grid = block.querySelector( '.weekly-calendar-grid' );
		if ( ! grid ) {
			return;
		}

		const endDate = new Date( startDate );
		endDate.setDate( endDate.getDate() + 6 );

		const weekEvents = events.filter( ( event ) => {
			const eventDate = new Date( event.start_time );
			return eventDate >= startDate && eventDate <= endDate;
		} );

		if ( weekEvents.length === 0 ) {
			grid.innerHTML =
				'<p class="no-events">No events scheduled for this week.</p>';
			return;
		}

		// Group by day
		const grouped = {};
		for ( let i = 0; i < 7; i++ ) {
			const day = new Date( startDate );
			day.setDate( day.getDate() + i );
			const key = day.toDateString();
			grouped[ key ] = [];
		}

		weekEvents.forEach( ( event ) => {
			const date = new Date( event.start_time );
			const key = date.toDateString();
			if ( grouped[ key ] ) {
				grouped[ key ].push( event );
			}
		} );

		// Build table
		let html = '<table class="week-table"><thead><tr>';
		for ( let i = 0; i < 7; i++ ) {
			const day = new Date( startDate );
			day.setDate( day.getDate() + i );
			html += `<th>${ day.toLocaleDateString( undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
			} ) }</th>`;
		}
		html += '</tr></thead><tbody><tr>';

		for ( let i = 0; i < 7; i++ ) {
			const day = new Date( startDate );
			day.setDate( day.getDate() + i );
			const key = day.toDateString();
			const dayEvents = grouped[ key ] || [];

			html += '<td><div class="day-events">';
			dayEvents.forEach( ( event ) => {
				const time = new Date( event.start_time ).toLocaleTimeString(
					undefined,
					{
						hour: 'numeric',
						minute: '2-digit',
					}
				);
				html += `<div class="event-item" data-event-id="${ event.id }">
					<div class="event-time">${ time }</div>
					<div class="event-name">${ event.name }</div>
				</div>`;
			} );
			html += '</div></td>';
		}

		html += '</tr></tbody></table>';
		grid.innerHTML = html;

		// Add click handlers
		grid.querySelectorAll( '.event-item' ).forEach( ( item ) => {
			item.addEventListener( 'click', () => {
				const eventId = item.getAttribute( 'data-event-id' );
				const event = events.find( ( e ) => e.id === eventId );
				if ( event ) {
					showEventModal( block, event );
				}
			} );
		} );
	}

	function updateWeekRangeDisplay( block, startDate ) {
		const rangeSpan = block.querySelector( '#current-week-range' );
		if ( ! rangeSpan ) {
			return;
		}

		const endDate = new Date( startDate );
		endDate.setDate( endDate.getDate() + 6 );

		rangeSpan.textContent = `${ startDate.toLocaleDateString( undefined, {
			month: 'short',
			day: 'numeric',
		} ) } - ${ endDate.toLocaleDateString( undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		} ) }`;
	}

	function setupNavigationButtons( block, events, startDate, setStartDate ) {
		const prevBtn = block.querySelector( '#prev-week' );
		const nextBtn = block.querySelector( '#next-week' );

		if ( prevBtn ) {
			prevBtn.addEventListener( 'click', () => {
				const newStartDate = new Date( startDate );
				newStartDate.setDate( newStartDate.getDate() - 7 );
				setStartDate( newStartDate );
				renderWeeklyTable( block, events, newStartDate );
				updateWeekRangeDisplay( block, newStartDate );
			} );
		}

		if ( nextBtn ) {
			nextBtn.addEventListener( 'click', () => {
				const newStartDate = new Date( startDate );
				newStartDate.setDate( newStartDate.getDate() + 7 );
				setStartDate( newStartDate );
				renderWeeklyTable( block, events, newStartDate );
				updateWeekRangeDisplay( block, newStartDate );
			} );
		}
	}

	function setupEventModal( block ) {
		const modal = block.querySelector( '.eventive-modal-overlay' );
		const closeBtn = block.querySelector( '.eventive-modal-close-btn' );

		if ( closeBtn ) {
			closeBtn.addEventListener( 'click', () => {
				if ( modal ) {
					modal.style.display = 'none';
				}
			} );
		}

		window.addEventListener( 'click', ( e ) => {
			if ( e.target === modal ) {
				modal.style.display = 'none';
			}
		} );
	}

	function showEventModal( block, event ) {
		const modal = block.querySelector( '.eventive-modal-overlay' );
		const modalDetails = block.querySelector( '#modal-details' );

		if ( ! modal || ! modalDetails ) {
			return;
		}

		const time = new Date( event.start_time ).toLocaleTimeString(
			undefined,
			{
				hour: 'numeric',
				minute: '2-digit',
			}
		);

		modalDetails.innerHTML = `
			<h2>${ event.name }</h2>
			<p><strong>Time:</strong> ${ time }</p>
			${ event.venue ? `<p><strong>Venue:</strong> ${ event.venue.name }</p>` : '' }
			${ event.description ? `<p>${ event.description }</p>` : '' }
			<button class="eventive-button" data-eventive-event-id="${
				event.id
			}">Buy Tickets</button>
		`;

		modal.style.display = 'flex';

		// Rebuild Eventive buttons
		if ( window.Eventive.rebuild ) {
			window.Eventive.rebuild();
		}
	}
} );
