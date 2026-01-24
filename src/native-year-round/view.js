/**
 * Eventive Native Year-Round Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Polyfill for requestIdleCallback
 */
const requestIdleCallback =
	window.requestIdleCallback ||
	function ( cb ) {
		return setTimeout( function () {
			cb( {
				didTimeout: true,
				timeRemaining: function () {
					return 0;
				},
			} );
		}, 50 );
	};

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
		ev.film_still_image ||
		( ev.program_item &&
			( ev.program_item.image ||
				ev.program_item.poster_image ||
				ev.program_item.cover_image ||
				ev.program_item.still_image ) ) ||
		ev.tile_image ||
		ev.hero_image ||
		ev.card_image ||
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
		const nonce = window.EventiveBlockData?.eventNonce || '';
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.EventiveBlockData?.eventBucket ||
			'';

		// Extract attributes
		const imageType = block.getAttribute( 'data-image' ) || 'poster';
		const showDescription =
			block.getAttribute( 'data-description' ) === 'true';
		const showVenue = block.getAttribute( 'data-venue' ) === 'true';
		const showDetails = block.getAttribute( 'data-details' ) === 'true';
		const filmDetailBaseURL =
			window.EventiveBlockData?.filmDetailBaseURL || '';
		const usePrettyPermalinks =
			window.EventiveBlockData?.usePrettyPermalinks || false;
		const filmSyncEnabled =
			window.EventiveBlockData?.filmSyncEnabled || false;

		// State
		const today = new Date();
		const todayStart = atStartOfDay( today );
		const minWeekStart = startOfWeek( today );
		let weekStart = startOfWeek( today );
		let weekEnd = endOfWeek( today );
		let activeDay = new Date( Math.max( +weekStart, +todayStart ) );

		const weekCache = {};
		const filmCache = {};
		let eventsByDay = {};
		let renderScheduled = false;
		let imgFetchRefresh = {};

		// Loading indicator helper
		const setLoading = ( on ) => {
			if ( on ) {
				if ( ! eventsContainer.__spinner ) {
					const sp = document.createElement( 'div' );
					sp.className = 'yr-loading';
					sp.setAttribute( 'role', 'status' );
					sp.setAttribute( 'aria-live', 'polite' );
					sp.style.display = 'flex';
					sp.style.alignItems = 'center';
					sp.style.justifyContent = 'center';
					sp.style.padding = '24px';
					sp.style.gap = '10px';
					sp.innerHTML =
						'<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
						'<g fill="none" stroke="currentColor" stroke-width="2">' +
						'<circle cx="12" cy="12" r="9" opacity="0.2"/>' +
						'<path d="M21 12a9 9 0 0 0-9-9">' +
						'<animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>' +
						'</path>' +
						'</g>' +
						'</svg>' +
						'<span style="font:500 0.95rem/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: var(--text-muted, #6b7280);">Loading…</span>';
					eventsContainer.__spinner = sp;
				}
				if ( ! eventsContainer.contains( eventsContainer.__spinner ) ) {
					eventsContainer.appendChild( eventsContainer.__spinner );
				}
				eventsContainer.setAttribute( 'aria-busy', 'true' );
			} else {
				if (
					eventsContainer.__spinner &&
					eventsContainer.contains( eventsContainer.__spinner )
				) {
					eventsContainer.removeChild( eventsContainer.__spinner );
				}
				eventsContainer.removeAttribute( 'aria-busy' );
			}
		};

		// Remove loading text placeholder
		const loadingText = block.querySelector(
			'.eventive-film-loading-text'
		);
		if ( loadingText ) {
			loadingText.remove();
		}

		// Create UI structure
		const calWrap = document.createElement( 'div' );
		calWrap.className = 'eventive-nyr-calendar-wrap';

		const navRow = document.createElement( 'div' );
		navRow.className = 'eventive-nyr-nav';
		navRow.innerHTML = `
			<div class="eventive-nyr-nav-controls">
				<button class="eventive-nyr-btn eventive-nyr-prev" type="button">‹ Prev</button>
				<button class="eventive-nyr-btn eventive-nyr-next" type="button">Next ›</button>
			</div>
			<div class="eventive-nyr-buttons"></div>
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

		// Fetch film by ID with caching
		const fetchFilmById = async ( filmId ) => {
			if ( ! filmId ) {
				return null;
			}
			if ( filmCache[ filmId ] === null ) {
				return null;
			}
			if ( filmCache[ filmId ] && filmCache[ filmId ].__loaded ) {
				return filmCache[ filmId ];
			}
			if ( filmCache[ filmId ] && filmCache[ filmId ].__pending ) {
				return null;
			}

			filmCache[ filmId ] = { __pending: true };

			const mark = ( result ) => {
				if ( result ) {
					result.__loaded = true;
					filmCache[ filmId ] = result;
				} else {
					filmCache[ filmId ] = null;
				}
				return filmCache[ filmId ];
			};

			try {
				// Try global films/{id} first
				const f = await window.Eventive.request( {
					method: 'GET',
					path: 'films/' + encodeURIComponent( filmId ),
					authenticatePerson: true,
				} );
				if (
					f &&
					( f.poster_image || f.cover_image || f.still_image )
				) {
					return mark( f );
				}
			} catch ( error ) {
				// Ignore and try bucket-scoped path
			}

			try {
				// Fallback: bucket-scoped film path
				const bpath =
					'event_buckets/' +
					encodeURIComponent( eventBucket ) +
					'/films/' +
					encodeURIComponent( filmId );
				const f = await window.Eventive.request( {
					method: 'GET',
					path: bpath,
					authenticatePerson: true,
				} );
				return mark( f || null );
			} catch ( error ) {
				return mark( null );
			}
		};

		// Override ticket button labels with showtime
		const overrideTicketLabels = ( root ) => {
			const scope = root || eventsContainer;
			const wrappers = scope.querySelectorAll(
				'.eventive-button[data-event][data-label]'
			);
			wrappers.forEach( ( wrap ) => {
				const label = wrap.getAttribute( 'data-label' ) || '';
				if ( ! label ) {
					return;
				}
				const span = wrap.querySelector(
					'.eventive__ticket-button__button button span'
				);
				if ( ! span ) {
					return;
				}
				if (
					span.__evtLabelApplied &&
					span.textContent === label
				) {
					return;
				}
				span.textContent = label;
				span.classList.add( 'evt-ticket-btn' );
				span.__evtLabelApplied = true;
			} );
		};

		// Render day events
		const renderDayEvents = () => {
			const dayKey = toISODate( activeDay );
			const events = ( eventsByDay && eventsByDay[ dayKey ] ) || [];

			// Remove loading indicator
			setLoading( false );

			if ( ! events.length ) {
				eventsContainer.innerHTML =
					'<div class="yr-no-events">No events this day.</div>';
				return;
			}

			// Group events by venue and primary film
			const groups = {};
			const pendingFetches = [];

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
					ev.display_title ||
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

			// Progressive rendering in chunks
			let index = 0;
			const batch = 8;
			let needRebuild = false;

			const renderChunk = () => {
				const frag = document.createDocumentFragment();
				const end = Math.min( index + batch, groupList.length );

				for ( ; index < end; index++ ) {
					const group = groupList[ index ];
					const firstEv = group.evRef;
					const film =
						imageType === 'still' &&
						firstEv.films &&
						firstEv.films[ 0 ]
							? firstEv.films[ 0 ]
							: firstEv.film ||
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

					// Queue film fetch if no image
					if ( ! img ) {
						const fid =
							firstEv.film_id ||
							( film && film.id ) ||
							( firstEv.program_item &&
								firstEv.program_item.film_id ) ||
							null;
						if ( fid ) {
							pendingFetches.push( fid );
						}
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
						'yr-card yr-card--stack' +
						( img ? ' has-media' : '' );

					if ( img ) {
						const media = document.createElement( 'div' );
						media.className = 'yr-card__media';
						const imgel = document.createElement( 'img' );
						imgel.setAttribute( 'loading', 'lazy' );
						imgel.setAttribute( 'decoding', 'async' );
						imgel.alt = title;
						imgel.src = img;
						media.appendChild( imgel );
						card.appendChild( media );
					}

					const body = document.createElement( 'div' );
					body.className = 'yr-card__body';
					const h = document.createElement( 'h3' );
					h.className = 'yr-card__title';
					h.textContent = title;
					body.appendChild( h );

					if ( showVenue ) {
						const meta = document.createElement( 'div' );
						meta.className = 'yr-card__meta';
						meta.textContent = group.venueName;
						body.appendChild( meta );
					}

					if ( desc ) {
						const descEl = document.createElement( 'div' );
						descEl.className = 'yr-card__desc';
						// Render HTML descriptions (Eventive content often includes markup)
						descEl.innerHTML = String( desc );
						body.appendChild( descEl );
					}

					if ( showDetails ) {
						const links = document.createElement( 'div' );
						links.className = 'yr-card__links';
						const a = document.createElement( 'a' );
						a.className = 'yr-more';
						a.href = filmHref;
						a.textContent = 'Details';
						links.appendChild( a );
						body.appendChild( links );
					}

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
						const btn = document.createElement( 'div' );
						btn.className = 'eventive-button';
						btn.setAttribute( 'data-event', it.id || '' );
						btn.setAttribute( 'data-label', fmtTime( it.dt ) );
						btn.setAttribute( 'data-universal', 'true' );
						btnWrap.appendChild( btn );
						grid.appendChild( btnWrap );
					} );

					cta.appendChild( grid );
					card.appendChild( cta );
					frag.appendChild( card );
				}

				eventsContainer.appendChild( frag );
				needRebuild = true;

				if ( index < groupList.length ) {
					requestAnimationFrame( renderChunk );
				} else {
					// Always rebuild once after finishing
					if (
						window.Eventive &&
						typeof window.Eventive.rebuild === 'function'
					) {
						setTimeout( () => {
							window.Eventive.rebuild();
							requestIdleCallback( () => {
								try {
									overrideTicketLabels(
										eventsContainer
									);
								} catch ( e ) {
									// Ignore
								}
							} );
						}, 60 );
					}

					// Progressive initialization with IntersectionObserver
					if (
						window.IntersectionObserver &&
						window.Eventive &&
						typeof window.Eventive.rebuild === 'function'
					) {
						const obs = new IntersectionObserver(
							( entries ) => {
								entries.forEach( ( entry ) => {
									if ( entry.isIntersecting ) {
										try {
											window.Eventive.rebuild();
											requestIdleCallback( () => {
												try {
													overrideTicketLabels(
														entry.target
													);
												} catch ( e ) {
													// Ignore
												}
											} );
										} catch ( e ) {
											// Ignore
										}
										obs.unobserve( entry.target );
									}
								} );
							},
							{ rootMargin: '100px' }
						);
						eventsContainer
							.querySelectorAll( '.yr-card' )
							.forEach( ( card ) => obs.observe( card ) );
					}

					// Fetch missing film images
					if (
						pendingFetches.length &&
						( ! imgFetchRefresh ||
							! imgFetchRefresh[ dayKey ] )
					) {
						imgFetchRefresh[ dayKey ] = true;
						Promise.all(
							pendingFetches.map( ( id ) =>
								fetchFilmById( id )
							)
						).then( () => {
							scheduleRender();
						} );
					}
				}
			};

			requestAnimationFrame( renderChunk );
			// Initial label override
			requestIdleCallback( () => {
				try {
					overrideTicketLabels( eventsContainer );
				} catch ( e ) {
					// Ignore
				}
			} );
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

			setLoading( true );

			const applyFilter = ( list ) => {
				if ( ! Array.isArray( list ) ) {
					return [];
				}

				const out = [];
				for ( let i = 0; i < list.length; i++ ) {
					const ev = list[ i ];
					if ( ! ev || ! ev.start_time ) {
						continue;
					}
					const t = new Date( ev.start_time );
					if ( isNaN( t ) ) {
						continue;
					}
					if ( t >= s && t <= e ) {
						out.push( ev );
					}
				}

				// Sort by start time
				out.sort(
					( a, b ) =>
						new Date( a.start_time ) - new Date( b.start_time )
				);

				// Filter out past events if in current week
				const cutoff = todayStart;
				const sameWeekAsToday =
					toISODate( weekStart ) === toISODate( minWeekStart );
				const filtered = sameWeekAsToday
					? out.filter( ( ev ) => {
							const t = new Date( ev.start_time );
							return +atStartOfDay( t ) >= +cutoff;
					  } )
					: out;

				// Normalize and group by day
				const byDay = {};
				filtered.forEach( ( ev ) => {
					// Normalize film_id
					if ( ! ev.film_id && ev.film && ev.film.id ) {
						ev.film_id = ev.film.id;
					}
					if (
						! ev.film_id &&
						ev.films &&
						ev.films[ 0 ] &&
						ev.films[ 0 ].id
					) {
						ev.film_id = ev.films[ 0 ].id;
					}
					if (
						! ev.film_id &&
						ev.program_item &&
						ev.program_item.film_id
					) {
						ev.film_id = ev.program_item.film_id;
					}

					// Ensure ev.film points at primary film
					if ( ! ev.film && ev.films && ev.films[ 0 ] ) {
						ev.film = ev.films[ 0 ];
					}

					// Title assist for edge payloads
					if ( ev.film && ! ev.film.name && ev.title ) {
						ev.film.name = ev.title;
					}

					const key = toISODate( new Date( ev.start_time ) );
					( byDay[ key ] || ( byDay[ key ] = [] ) ).push( ev );
				} );

				eventsByDay = byDay;
				weekCache[ wkKey ] = byDay;
			};

			try {
				const params = new URLSearchParams();
				params.append( 'start_time_gte', new Date( s ).toISOString() );
				params.append( 'start_time_lte', new Date( e ).toISOString() );
				params.append( 'include_past_events', 'true' );
				params.append( 'include', 'film,films,program_item' );

				const path = `event_buckets/${ eventBucket }/events`;

				const response = await window.Eventive.request( {
					method: 'GET',
					path,
					qs: Object.fromEntries( params ),
					authenticatePerson: true,
				} );

				const list =
					( response && ( response.events || response ) ) || [];
				applyFilter( list );
				setLoading( false );
			} catch ( error ) {
				console.error(
					'[eventive-native-year-round] Error fetching week events:',
					error
				);

				// Fallback: fetch broader range and filter
				try {
					const now = new Date();
					const later = addDays( now, 60 );
					const fallbackParams = new URLSearchParams();
					fallbackParams.append(
						'start_time_gte',
						now.toISOString()
					);
					fallbackParams.append(
						'start_time_lte',
						later.toISOString()
					);

					const path = `event_buckets/${ eventBucket }/events`;

					const response = await window.Eventive.request( {
						method: 'GET',
						path,
						qs: Object.fromEntries( fallbackParams ),
						authenticatePerson: true,
					} );

					const list =
						( response && ( response.events || response ) ) || [];
					applyFilter( list );
					setLoading( false );
				} catch ( fallbackError ) {
					console.error(
						'[eventive-native-year-round] Fallback fetch failed:',
						fallbackError
					);
					eventsByDay = {};
					setLoading( false );
				}
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
				setLoading( false );
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

			// Ensure Eventive is ready before fetching
			const ensureEventiveReady = () => {
				return new Promise( ( resolve ) => {
					if (
						window.Eventive &&
						typeof window.Eventive.on === 'function'
					) {
						if ( window.Eventive._ready ) {
							resolve();
						} else {
							window.Eventive.on( 'ready', resolve );
						}
					} else {
						// Retry with timeout
						let tries = 0;
						const wait = () => {
							if ( ++tries > 40 ) {
								console.error(
									'[eventive-native-year-round] Eventive loader timeout'
								);
								resolve();
								return;
							}
							if (
								window.Eventive &&
								window.Eventive.on
							) {
								if ( window.Eventive._ready ) {
									resolve();
								} else {
									window.Eventive.on( 'ready', resolve );
								}
							} else {
								setTimeout( wait, 125 );
							}
						};
						wait();
					}
				} );
			};

			await ensureEventiveReady();
			await fetchWeek();
			scheduleRender();
		};

		init();
	} );
} );
