/**
 * Eventive Events List Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Helper functions
 * @param v
 */
function parseBool( v ) {
	if ( v == null ) {
		return true;
	}
	v = String( v ).trim().toLowerCase();
	return ! (
		v === 'false' ||
		v === '0' ||
		v === 'no' ||
		v === 'off' ||
		v === ''
	);
}

function getTextColor( bg ) {
	let hex = ( bg || '' ).replace( '#', '' );
	if ( hex.length === 3 ) {
		hex = hex
			.split( '' )
			.map( ( c ) => c + c )
			.join( '' );
	}
	const r = parseInt( hex.substr( 0, 2 ), 16 ) || 0,
		g = parseInt( hex.substr( 2, 2 ), 16 ) || 0,
		b = parseInt( hex.substr( 4, 2 ), 16 ) || 0;
	const br = ( r * 299 + g * 587 + b * 114 ) / 1000;
	return br > 150 ? '#000' : '#fff';
}

/**
 * Initialize all events list blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-events-list'
	);

	blocks.forEach( ( block ) => {
		// Get API configuration
		const endpoints = window.EventiveBlockData?.apiEndpoints || {};
		const nonce = window.EventiveBlockData?.eventNonce || '';
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.eventiveOptions?.eventBucket ||
			'';

		// Extract attributes
		const limit = parseInt( block.getAttribute( 'data-limit' ) ) || 0;
		const tagId = block.getAttribute( 'data-tag-id' ) || '';
		const excludeTags = block.getAttribute( 'data-exclude-tags' ) || '';
		const venueId = block.getAttribute( 'data-venue-id' ) || '';
		const showDescription = parseBool(
			block.getAttribute( 'data-event-description' )
		);
		const showShortDescription = parseBool(
			block.getAttribute( 'data-short-description' )
		);
		const imagePref = block.getAttribute( 'data-image' ) || 'cover';
		const includeVirtual = block.getAttribute( 'data-virtual' ) === 'true';
		const showFilter = parseBool(
			block.getAttribute( 'data-show-filter' )
		);
		const viewMode = block.getAttribute( 'data-view' ) || 'list';
		const showUndated =
			block.getAttribute( 'data-show-undated' ) !== 'false';
		const includePast =
			block.getAttribute( 'data-include-past' ) === 'true';
		const startDate = block.getAttribute( 'data-start-date' ) || '';
		const endDate = block.getAttribute( 'data-end-date' ) || '';

		let activeTagFilter = '';

		// Parse date ranges
		let startDateTs = null;
		let endDateTs = null;
		if ( startDate ) {
			const sd = new Date( startDate );
			if ( isFinite( sd.getTime() ) ) {
				startDateTs = sd.getTime();
			}
		}
		if ( endDate ) {
			const ed = new Date( endDate );
			if ( isFinite( ed.getTime() ) ) {
				ed.setHours( 23, 59, 59, 999 );
				endDateTs = ed.getTime();
			}
		}

		// Collect tags from events
		const collectTags = ( events ) => {
			const tagMap = new Map();
			events.forEach( ( ev ) => {
				const evTags = Array.isArray( ev.tags ) ? ev.tags : [];
				const filmTags = (
					Array.isArray( ev.films ) ? ev.films : []
				).flatMap( ( f ) => ( Array.isArray( f.tags ) ? f.tags : [] ) );
				evTags.concat( filmTags ).forEach( ( t ) => {
					if ( ! t || ! t.id ) {
						return;
					}
					const id = String( t.id );
					if ( ! tagMap.has( id ) ) {
						tagMap.set( id, {
							id,
							name: t.name || '',
							color: t.color || '#ccc',
							count: 0,
						} );
					}
					const tag = tagMap.get( id );
					tag.count++;
				} );
			} );
			return Array.from( tagMap.values() ).sort( ( a, b ) =>
				a.name.localeCompare( b.name )
			);
		};

		// Render tags filter
		const renderTagsFilter = ( tags, container ) => {
			if ( ! showFilter || ! tags.length ) {
				return;
			}

			let filterEl = block.querySelector(
				'.eventive-events-tags-filter'
			);
			if ( ! filterEl ) {
				filterEl = document.createElement( 'div' );
				filterEl.className = 'eventive-events-tags-filter';
				block.insertBefore( filterEl, block.firstChild );
			}

			const allBtn = `<button class="eventive-tag-btn ${
				! activeTagFilter ? 'active' : ''
			}" data-tag-id="">All</button>`;
			const tagBtns = tags
				.map( ( tag ) => {
					const color = tag.color || '#ccc';
					const textColor = getTextColor( color );
					const isActive = activeTagFilter === tag.id;
					return `<button class="eventive-tag-btn ${
						isActive ? 'active' : ''
					}" data-tag-id="${
						tag.id
					}" style="background-color:${ color };color:${ textColor };">${
						tag.name
					}</button>`;
				} )
				.join( '' );

			filterEl.innerHTML = `<div class="eventive-tags-list">${ allBtn }${ tagBtns }</div>`;

			// Add click handlers
			filterEl
				.querySelectorAll( '.eventive-tag-btn' )
				.forEach( ( btn ) => {
					btn.addEventListener( 'click', () => {
						activeTagFilter =
							btn.getAttribute( 'data-tag-id' ) || '';
						renderEvents();
					} );
				} );
		};

		// Filter events
		const filterEvents = ( events ) => {
			let filtered = [ ...events ];

			// Filter by tag
			if ( tagId ) {
				filtered = filtered.filter( ( ev ) => {
					const evTags = Array.isArray( ev.tags ) ? ev.tags : [];
					const filmTags = (
						Array.isArray( ev.films ) ? ev.films : []
					).flatMap( ( f ) =>
						Array.isArray( f.tags ) ? f.tags : []
					);
					return evTags
						.concat( filmTags )
						.some( ( t ) => t && String( t.id ) === tagId );
				} );
			}

			// Filter by active tag filter
			if ( activeTagFilter ) {
				filtered = filtered.filter( ( ev ) => {
					const evTags = Array.isArray( ev.tags ) ? ev.tags : [];
					const filmTags = (
						Array.isArray( ev.films ) ? ev.films : []
					).flatMap( ( f ) =>
						Array.isArray( f.tags ) ? f.tags : []
					);
					return evTags
						.concat( filmTags )
						.some(
							( t ) => t && String( t.id ) === activeTagFilter
						);
				} );
			}

			// Exclude tags
			if ( excludeTags ) {
				const excludeIds = excludeTags
					.split( ',' )
					.map( ( t ) => t.trim() );
				filtered = filtered.filter( ( ev ) => {
					const evTags = Array.isArray( ev.tags ) ? ev.tags : [];
					const filmTags = (
						Array.isArray( ev.films ) ? ev.films : []
					).flatMap( ( f ) =>
						Array.isArray( f.tags ) ? f.tags : []
					);
					return ! evTags
						.concat( filmTags )
						.some(
							( t ) => t && excludeIds.includes( String( t.id ) )
						);
				} );
			}

			// Filter by venue
			if ( venueId ) {
				filtered = filtered.filter(
					( ev ) => ev.venue && String( ev.venue.id ) === venueId
				);
			}

			// Filter by virtual
			if ( ! includeVirtual ) {
				filtered = filtered.filter( ( ev ) => ! ev.is_virtual );
			}

			// Filter by date range
			if ( startDateTs || endDateTs ) {
				filtered = filtered.filter( ( ev ) => {
					if ( ! ev.start_time ) {
						return showUndated;
					}
					const evTime = new Date( ev.start_time ).getTime();
					if ( startDateTs && evTime < startDateTs ) {
						return false;
					}
					if ( endDateTs && evTime > endDateTs ) {
						return false;
					}
					return true;
				} );
			}

			// Filter by past/upcoming
			if ( ! includePast ) {
				const now = Date.now();
				filtered = filtered.filter( ( ev ) => {
					if ( ! ev.start_time ) {
						return showUndated;
					}
					return new Date( ev.start_time ).getTime() > now;
				} );
			}

			// Filter undated
			if ( ! showUndated ) {
				filtered = filtered.filter( ( ev ) => ev.start_time );
			}

			// Sort by date
			filtered.sort( ( a, b ) => {
				if ( ! a.start_time && ! b.start_time ) {
					return 0;
				}
				if ( ! a.start_time ) {
					return 1;
				}
				if ( ! b.start_time ) {
					return -1;
				}
				return (
					new Date( a.start_time ).getTime() -
					new Date( b.start_time ).getTime()
				);
			} );

			// Apply limit
			if ( limit > 0 ) {
				filtered = filtered.slice( 0, limit );
			}

			return filtered;
		};

		// Render events list
		const renderEventsList = ( events ) => {
			if ( ! events.length ) {
				return '<div class="eventive-no-events">No events found.</div>';
			}

			return events
				.map( ( ev ) => {
					const film = ev.films && ev.films[ 0 ];
					const imageUrl =
						imagePref === 'poster'
							? film?.poster_image || ev.poster_image
							: film?.cover_image ||
							  ev.cover_image ||
							  film?.poster_image;

					const venueName =
						ev.venue?.name || ( ev.is_virtual ? 'Virtual' : '' );
					const dateStr = ev.start_time
						? new Date( ev.start_time ).toLocaleDateString(
								undefined,
								{
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit',
								}
						  )
						: 'On Demand';

					const description = showShortDescription
						? ev.short_description || ''
						: showDescription
						? ev.description || ''
						: '';

					return `
						<div class="eventive-event-item">
							${
								imageUrl
									? `<div class="eventive-event-image"><img src="${ imageUrl }" alt="${
											ev.name || ''
									  }" /></div>`
									: ''
							}
							<div class="eventive-event-content">
								<h3 class="eventive-event-title">${ ev.name || '' }</h3>
								<div class="eventive-event-meta">
									${ dateStr ? `<span class="eventive-event-date">${ dateStr }</span>` : '' }
									${ venueName ? `<span class="eventive-event-venue">${ venueName }</span>` : '' }
								</div>
								${
									description
										? `<div class="eventive-event-description">${ description }</div>`
										: ''
								}
								<div class="eventive-button" data-event="${ ev.id }"></div>
							</div>
						</div>`;
				} )
				.join( '' );
		};

		// Render events grid
		const renderEventsGrid = ( events ) => {
			if ( ! events.length ) {
				return '<div class="eventive-no-events">No events found.</div>';
			}

			return `<div class="eventive-events-grid">${ events
				.map( ( ev ) => {
					const film = ev.films && ev.films[ 0 ];
					const imageUrl =
						imagePref === 'poster'
							? film?.poster_image || ev.poster_image
							: film?.cover_image ||
							  ev.cover_image ||
							  film?.poster_image;

					const dateStr = ev.start_time
						? new Date( ev.start_time ).toLocaleDateString(
								undefined,
								{
									month: 'short',
									day: 'numeric',
								}
						  )
						: 'On Demand';

					return `
						<div class="eventive-event-card">
							${
								imageUrl
									? `<div class="eventive-event-card-image"><img src="${ imageUrl }" alt="${
											ev.name || ''
									  }" /></div>`
									: ''
							}
							<div class="eventive-event-card-content">
								<h4 class="eventive-event-card-title">${ ev.name || '' }</h4>
								<div class="eventive-event-card-date">${ dateStr }</div>
								<div class="eventive-button" data-event="${ ev.id }"></div>
							</div>
						</div>`;
				} )
				.join( '' ) }</div>`;
		};

		let allEvents = [];

		// Render events
		const renderEvents = () => {
			const filtered = filterEvents( allEvents );
			const tags = collectTags( filtered );

			renderTagsFilter( tags, block );

			let listEl = block.querySelector( '.eventive-events-container' );
			if ( ! listEl ) {
				listEl = document.createElement( 'div' );
				listEl.className = 'eventive-events-container';
				block.appendChild( listEl );
			}

			listEl.innerHTML =
				viewMode === 'grid'
					? renderEventsGrid( filtered )
					: renderEventsList( filtered );

			if ( window.Eventive?.rebuild ) {
				window.Eventive.rebuild();
			}
		};

		// Fetch and render
		const init = () => {
			const fetchData = () => {
				const params = new URLSearchParams();
				if ( ! includePast ) {
					params.append( 'upcoming_only', 'true' );
					params.append( 'marquee', 'true' );
				}
				if ( includeVirtual ) {
					params.append( 'include_virtual', 'true' );
				}

				let path = `event_buckets/${ eventBucket }/events`;
				if ( params.toString() ) {
					path += `?${ params.toString() }`;
				}

				window.Eventive.request( {
					method: 'GET',
					path,
					authenticatePerson: false,
				} )
					.then( ( response ) => {
						allEvents = ( response && response.events ) || [];
						renderEvents();
					} )
					.catch( ( error ) => {
						console.error( '[eventive-events-list] Error fetching events:', error );
						block.innerHTML =
							'<div class="eventive-error">Error loading events.</div>';
					} );
			};

			if ( window.Eventive && window.Eventive._ready ) {
				fetchData();
			} else if ( window.Eventive && typeof window.Eventive.on === 'function' ) {
				window.Eventive.on( 'ready', fetchData );
			} else {
				setTimeout( () => {
					if ( window.Eventive && typeof window.Eventive.request === 'function' ) {
						fetchData();
					} else {
						console.error( '[eventive-events-list] Eventive API not available' );
						block.innerHTML =
							'<div class="eventive-error">Error loading events.</div>';
					}
				}, 1000 );
			}
		};

		init();
	} );
} );
