/**
 * Eventive Native Year-Round Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Helper functions
 * @param n
 */
function pad( n ) {
	return ( n < 10 ? '0' : '' ) + n;
}

function toISODate( d ) {
	return (
		d.getFullYear() +
		'-' +
		pad( d.getMonth() + 1 ) +
		'-' +
		pad( d.getDate() )
	);
}

function startOfWeek( d ) {
	const x = new Date( d );
	const day = x.getDay();
	const diff = ( day === 0 ? -6 : 1 ) - day;
	x.setDate( x.getDate() + diff );
	x.setHours( 0, 0, 0, 0 );
	return x;
}

function endOfWeek( d ) {
	const s = startOfWeek( d );
	const e = new Date( s );
	e.setDate( e.getDate() + 6 );
	e.setHours( 23, 59, 59, 999 );
	return e;
}

function addDays( d, n ) {
	const x = new Date( d );
	x.setDate( x.getDate() + n );
	return x;
}

function fmtDayLabel( d ) {
	return d.toLocaleDateString( undefined, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	} );
}

function fmtTime( d ) {
	return d.toLocaleTimeString( undefined, {
		hour: 'numeric',
		minute: '2-digit',
	} );
}

function atStartOfDay( d ) {
	const x = new Date( d );
	x.setHours( 0, 0, 0, 0 );
	return x;
}

function isBefore( a, b ) {
	return +a < +b;
}

function imageForFilm( film, type ) {
	if ( ! film ) {
		return '';
	}
	if ( type === 'cover' ) {
		return film.cover_image || film.still_image || film.poster_image || '';
	}
	if ( type === 'still' ) {
		return film.still_image || film.poster_image || film.cover_image || '';
	}
	if ( type === 'none' ) {
		return '';
	}
	return film.poster_image || film.cover_image || film.still_image || '';
}

function imageForEvent( ev ) {
	if ( ! ev ) {
		return '';
	}
	return (
		ev.image ||
		ev.poster_image ||
		ev.cover_image ||
		ev.still_image ||
		ev.film_poster_image ||
		ev.film_cover_image ||
		''
	);
}

/**
 * Initialize all native year-round blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-native-year-round'
	);

	blocks.forEach( ( block ) => {
		if ( block.__inited ) {
			return;
		}
		block.__inited = true;

		// Get API configuration
		const endpoints = window.EventiveBlockData?.apiEndpoints || {};
		const nonce = window.EventiveBlockData?.eventNonce || '';
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.eventiveOptions?.eventBucket ||
			'';

		// Extract attributes
		const imageType = block.getAttribute( 'data-image' ) || 'poster';
		const showDescription =
			block.getAttribute( 'data-description' ) === 'true';
		const showVenue = block.getAttribute( 'data-venue' ) === 'true';
		const showDetails = block.getAttribute( 'data-details' ) === 'true';
		const filmDetailBaseURL =
			window.eventiveOptions?.filmDetailBaseURL || '';
		const usePrettyPermalinks =
			window.eventiveOptions?.usePrettyPermalinks || false;
		const filmSyncEnabled =
			window.eventiveOptions?.filmSyncEnabled || false;

		// State
		const today = new Date();
		const todayStart = atStartOfDay( today );
		const minWeekStart = startOfWeek( today );
		let weekStart = startOfWeek( today );
		let weekEnd = endOfWeek( today );
		let activeDay = new Date( Math.max( +weekStart, +todayStart ) );

		const weekCache = {};
		let eventsByDay = {};
		let renderScheduled = false;

		// Create UI structure
		const calWrap = document.createElement( 'div' );
		calWrap.className = 'eventive-nyr-calendar-wrap';

		const navRow = document.createElement( 'div' );
		navRow.className = 'eventive-nyr-nav';
		navRow.innerHTML = `
			<button class="eventive-nyr-btn eventive-nyr-prev" type="button">‹ Prev</button>
			<div class="eventive-nyr-buttons"></div>
			<button class="eventive-nyr-btn eventive-nyr-next" type="button">Next ›</button>
		`;
		calWrap.appendChild( navRow );

		const eventsContainer = document.createElement( 'div' );
		eventsContainer.className = 'eventive-nyr-events';
		calWrap.appendChild( eventsContainer );

		block.appendChild( calWrap );

		const prevBtn = navRow.querySelector( '.eventive-nyr-prev' );
		const nextBtn = navRow.querySelector( '.eventive-nyr-next' );
		const buttonsWrap = navRow.querySelector( '.eventive-nyr-buttons' );

		// Schedule render
		const scheduleRender = () => {
			if ( renderScheduled ) {
				return;
			}
			renderScheduled = true;
			requestAnimationFrame( () => {
				renderScheduled = false;
				renderDayEvents();
			} );
		};

		// Render week buttons
		const renderWeekButtons = () => {
			let html = '';
			for ( let i = 0; i < 7; i++ ) {
				const d = addDays( weekStart, i );
				const iso = toISODate( d );
				const isActive = iso === toISODate( activeDay );
				const isPastDay = isBefore( atStartOfDay( d ), todayStart );
				html += `<button class="yr-day-btn ${
					isActive ? 'is-active' : ''
				} ${
					isPastDay ? 'is-disabled' : ''
				}" data-day="${ iso }" type="button" ${
					isPastDay ? 'disabled' : ''
				}>${ fmtDayLabel( d ) }</button>`;
			}
			buttonsWrap.innerHTML = html;
			buttonsWrap.querySelectorAll( '.yr-day-btn' ).forEach( ( btn ) => {
				btn.addEventListener( 'click', () => {
					if ( btn.hasAttribute( 'disabled' ) ) {
						return;
					}
					const ds = btn.getAttribute( 'data-day' );
					activeDay = new Date( ds + 'T12:00:00' );
					renderWeekButtons();
					scheduleRender();
				} );
			} );
		};

		// Film link
		const filmLink = ( ev ) => {
			const film = ev && ev.film;
			if ( ! film ) {
				return '#';
			}
			if ( filmSyncEnabled ) {
				const slug =
					film.slug ||
					String( film.name || '' )
						.normalize( 'NFD' )
						.replace( /[\u0300-\u036f]/g, '' )
						.toLowerCase()
						.replace( /[^a-z0-9\s-]/g, '' )
						.replace( /\s+/g, '-' )
						.replace( /-+/g, '-' )
						.replace( /^-|-$/g, '' );
				return (
					( filmDetailBaseURL || '' ).replace( /\/$/, '' ) +
					'/' +
					slug
				);
			}
			if ( usePrettyPermalinks ) {
				return (
					filmDetailBaseURL +
					'?film-id=' +
					encodeURIComponent( film.id || '' )
				);
			}
			return (
				filmDetailBaseURL +
				'&film-id=' +
				encodeURIComponent( film.id || '' )
			);
		};

		// Render day events
		const renderDayEvents = () => {
			const dayKey = toISODate( activeDay );
			const events = ( eventsByDay && eventsByDay[ dayKey ] ) || [];

			if ( ! events.length ) {
				eventsContainer.innerHTML =
					'<div class="yr-no-events">No events this day.</div>';
				return;
			}

			// Group events by venue and primary film
			const groups = {};
			events.forEach( ( ev ) => {
				const venueId =
					( ev.venue && ev.venue.id ) ||
					( ev.is_virtual ? 'virtual' : 'unknown' );
				const primaryFilm =
					( ev.films && ev.films[ 0 ] ) || ev.film || null;
				const filmId = ( primaryFilm && primaryFilm.id ) || '';
				const baseTitle =
					ev.name ||
					ev.title ||
					( primaryFilm &&
						( primaryFilm.name || primaryFilm.title ) ) ||
					'Untitled';
				const key = venueId + '::' + ( filmId || baseTitle );
				if ( ! groups[ key ] ) {
					groups[ key ] = {
						evRef: ev,
						film: primaryFilm || {},
						title: baseTitle,
						venueName:
							( ev.venue &&
								( ev.venue.name ||
									ev.venue.display_name ||
									ev.venue.slug ) ) ||
							( ev.is_virtual ? 'Virtual' : 'TBA' ),
						items: [],
					};
				}
				groups[ key ].items.push( {
					id: ev.id,
					dt: new Date( ev.start_time ),
					ev,
				} );
			} );

			const groupList = Object.values( groups );
			groupList.forEach( ( g ) => {
				g.items.sort( ( a, b ) => +a.dt - +b.dt );
			} );
			groupList.sort( ( a, b ) => +a.items[ 0 ].dt - +b.items[ 0 ].dt );

			eventsContainer.innerHTML = '';

			groupList.forEach( ( group ) => {
				const firstEv = group.evRef;
				const film =
					firstEv.film ||
					( firstEv.films && firstEv.films[ 0 ] ) ||
					{};
				const title = group.title;

				let img = '';
				if ( imageType !== 'none' ) {
					img =
						imageForFilm( film, imageType ) ||
						imageForEvent( firstEv ) ||
						'';
				}

				const desc = showDescription
					? firstEv.short_description ||
					  firstEv.description ||
					  film.short_description ||
					  film.description ||
					  ''
					: '';
				const filmHref = showDetails ? filmLink( firstEv ) : '#';

				const card = document.createElement( 'article' );
				card.className =
					'yr-card yr-card--stack' + ( img ? ' has-media' : '' );

				if ( img ) {
					const media = document.createElement( 'div' );
					media.className = 'yr-card__media';
					media.innerHTML = `<img loading="lazy" decoding="async" alt="${ title }" src="${ img }" />`;
					card.appendChild( media );
				}

				const body = document.createElement( 'div' );
				body.className = 'yr-card__body';
				body.innerHTML = `
					<h3 class="yr-card__title">${ title }</h3>
					${ showVenue ? `<div class="yr-card__meta">${ group.venueName }</div>` : '' }
					${ desc ? `<div class="yr-card__desc">${ desc }</div>` : '' }
					${
						showDetails
							? `<div class="yr-card__links"><a class="yr-more" href="${ filmHref }">Details</a></div>`
							: ''
					}
				`;
				card.appendChild( body );

				const cta = document.createElement( 'div' );
				cta.className = 'yr-card__cta';
				const grid = document.createElement( 'div' );
				grid.className = 'yr-card__showtimes yr-showtimes-flex';
				grid.style.display = 'flex';
				grid.style.flexWrap = 'wrap';
				grid.style.gap = '8px 12px';
				grid.style.alignItems = 'stretch';

				group.items.forEach( ( it ) => {
					const btnWrap = document.createElement( 'div' );
					btnWrap.className = 'yr-showtime__btn';
					btnWrap.style.flex = '0 1 240px';
					btnWrap.innerHTML = `<div class="eventive-button" data-event="${
						it.id
					}" data-label="${ fmtTime( it.dt ) }"></div>`;
					grid.appendChild( btnWrap );
				} );

				cta.appendChild( grid );
				card.appendChild( cta );
				eventsContainer.appendChild( card );
			} );

			if ( window.Eventive?.rebuild ) {
				setTimeout( () => {
					window.Eventive.rebuild();
				}, 60 );
			}
		};

		// Fetch week
		const fetchWeek = async () => {
			const s = weekStart;
			const e = weekEnd;
			const wkKey = toISODate( s );

			if ( weekCache[ wkKey ] ) {
				eventsByDay = weekCache[ wkKey ];
				return;
			}

			try {
				const params = new URLSearchParams();
				params.append( 'start_time_gte', new Date( s ).toISOString() );
				params.append( 'start_time_lte', new Date( e ).toISOString() );
				params.append( 'include_past_events', 'true' );
				params.append( 'include', 'film,films,program_item' );

				let path = `event_buckets/${ eventBucket }/events?${ params.toString() }`;

				const response = await window.Eventive.request( {
					method: 'GET',
					path,
					authenticatePerson: false,
				} );

				let events =
					( response && ( response.events || response ) ) || [];

				// Filter by week range
				events = events.filter( ( ev ) => {
					if ( ! ev || ! ev.start_time ) {
						return false;
					}
					const t = new Date( ev.start_time );
					if ( isNaN( t ) ) {
						return false;
					}
					return t >= s && t <= e;
				} );

				// Group by day
				const byDay = {};
				const sameWeekAsToday =
					toISODate( weekStart ) === toISODate( minWeekStart );
				if ( sameWeekAsToday ) {
					events = events.filter( ( ev ) => {
						const t = new Date( ev.start_time );
						return +atStartOfDay( t ) >= +todayStart;
					} );
				}

				events.sort(
					( a, b ) =>
						new Date( a.start_time ) - new Date( b.start_time )
				);

				events.forEach( ( ev ) => {
					if ( ! ev.film && ev.films && ev.films[ 0 ] ) {
						ev.film = ev.films[ 0 ];
					}
					const key = toISODate( new Date( ev.start_time ) );
					( byDay[ key ] || ( byDay[ key ] = [] ) ).push( ev );
				} );

				eventsByDay = byDay;
				weekCache[ wkKey ] = byDay;
			} catch ( error ) {
				console.error(
					'[eventive-native-year-round] Error fetching week events:',
					error
				);
				eventsByDay = {};
			}
		};

		// Navigation
		const updatePrevDisabled = () => {
			const disable = ! isBefore( minWeekStart, weekStart );
			prevBtn.disabled = disable;
			if ( disable ) {
				prevBtn.classList.add( 'is-disabled' );
			} else {
				prevBtn.classList.remove( 'is-disabled' );
			}
		};

		const nav = async ( deltaWeeks ) => {
			let candidateStart = addDays( weekStart, 7 * deltaWeeks );
			if ( isBefore( candidateStart, minWeekStart ) ) {
				candidateStart = minWeekStart;
			}
			weekStart = candidateStart;
			weekEnd = endOfWeek( weekStart );
			activeDay = new Date( Math.max( +weekStart, +todayStart ) );
			renderWeekButtons();

			const wkKey = toISODate( weekStart );
			if ( weekCache[ wkKey ] ) {
				eventsByDay = weekCache[ wkKey ];
				scheduleRender();
			} else {
				await fetchWeek();
				scheduleRender();
			}
			updatePrevDisabled();
		};

		prevBtn.addEventListener( 'click', () => nav( -1 ) );
		nextBtn.addEventListener( 'click', () => nav( 1 ) );

		// Initialize
		const init = async () => {
			renderWeekButtons();
			updatePrevDisabled();
			await fetchWeek();
			scheduleRender();
		};

		init();
	} );
} );
