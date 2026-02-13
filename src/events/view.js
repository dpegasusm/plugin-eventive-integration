/**
 * Eventive Events Block - Frontend View Script
 */
// Shared page-level event cache
window.__Eventive_EventCache = window.__Eventive_EventCache || {};

// Global film detail config
let __EventiveFilmDetailBase = '';
const __EventiveFilmDetailPretty = true;

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

// Fetch events with caching
function fetchEventsOnce( bucket, opts ) {
	opts = opts || {};
	const includePast = !! opts.includePast;
	const includeVirtual = !! opts.includeVirtual;

	const key =
		bucket +
		'::past=' +
		( includePast ? 1 : 0 ) +
		'::virt=' +
		( includeVirtual ? 1 : 0 );
	const C = window.__Eventive_EventCache;
	if ( C[ key ] ) {
		return Promise.resolve( C[ key ] );
	}
	if ( ! window.Eventive ) {
		return Promise.reject(
			new Error( 'Eventive API is not initialized.' )
		);
	}

	const qs = {};
	if ( ! includePast ) {
		qs.upcoming_only = true;
	}
	if ( includeVirtual ) {
		qs.include_virtual = true;
	}

	return window.Eventive.request( {
		method: 'GET',
		path: 'event_buckets/' + encodeURIComponent( bucket ) + '/events',
		qs,
		authenticatePerson: true,
	} ).then( ( d ) => {
		const events = ( d && d.events ) || [];
		C[ key ] = events;
		return C[ key ];
	} );
}

// Resolve film URL from various fields
function resolveFilmUrl( film ) {
	if ( ! film || typeof film !== 'object' ) {
		return '';
	}
	const candidates = [
		'wp_detail_url',
		'wp_permalink',
		'permalink',
		'detail_url',
		'details_url',
		'url',
		'public_url',
		'site_url',
	];
	for ( let i = 0; i < candidates.length; i++ ) {
		const key = candidates[ i ];
		const val = film[ key ];
		if ( typeof val === 'string' && val ) {
			return val;
		}
	}

	// Fallback: build URL from film detail base
	const idOrSlug = film.id || film.slug || film.slugified_title;
	if ( idOrSlug && __EventiveFilmDetailBase ) {
		const base = __EventiveFilmDetailBase.replace( /\/+$/, '' );
		return base + '/?film-id=' + encodeURIComponent( idOrSlug );
	}

	return '';
}

// Update URL tag parameter
function setURLTagParam( tagId, method ) {
	try {
		const u = new URL( window.location.href );
		if ( ! tagId ) {
			u.searchParams.delete( 'tag-id' );
		} else {
			u.searchParams.set( 'tag-id', tagId );
		}
		if ( method === 'replace' ) {
			history.replaceState( {}, '', u.toString() );
		} else {
			history.pushState( {}, '', u.toString() );
		}
	} catch ( e ) {
		// Ignore
	}
}

// Enhanced image helper
function imageForEvent( ev, type ) {
	if ( ! ev ) {
		return '';
	}

	// Direct event images
	const directImages = [
		ev.image,
		ev.poster_image,
		ev.cover_image,
		ev.still_image,
		ev.film_poster_image,
		ev.film_cover_image,
		ev.film_still_image,
	];

	// Program item images
	if ( ev.program_item ) {
		directImages.push(
			ev.program_item.image,
			ev.program_item.poster_image,
			ev.program_item.cover_image,
			ev.program_item.still_image
		);
	}

	// Additional fallbacks
	directImages.push( ev.tile_image, ev.hero_image, ev.card_image );

	// Film images
	const film =
		ev.film || ( ev.films && ev.films[ 0 ] ) || ev.program_item?.film;
	if ( film ) {
		if ( type === 'poster' ) {
			directImages.push(
				film.poster_image,
				film.poster_url,
				film.cover_image,
				film.still_image
			);
		} else if ( type === 'cover' ) {
			directImages.push(
				film.cover_image,
				film.cover_url,
				film.still_image,
				film.poster_image
			);
		} else if ( type === 'still' ) {
			directImages.push(
				film.still_image,
				film.still_url,
				film.poster_image,
				film.cover_image
			);
		} else {
			directImages.push(
				film.poster_image,
				film.poster_url,
				film.cover_image,
				film.still_image
			);
		}
	}

	// Return first valid URL
	for ( let i = 0; i < directImages.length; i++ ) {
		const url = directImages[ i ];
		if ( typeof url === 'string' && url ) {
			return url;
		}
	}

	return '';
}

/**
 * Initialize all events blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll( '.wp-block-eventive-events' );

	blocks.forEach( ( block ) => {
		if ( block.__inited ) {
			return;
		}
		block.__inited = true;

		// Get API configuration
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.EventiveBlockData?.eventBucket ||
			'';

		// Extract attributes
		const tagId = block.getAttribute( 'data-tag-id' ) || '';
		const venueId = block.getAttribute( 'data-venue-id' ) || '';
		const imageMode = block.getAttribute( 'data-image' ) || 'poster';
		const showDescription = parseBool(
			block.getAttribute( 'data-description' )
		);
		const showFilter = parseBool(
			block.getAttribute( 'data-show-filter' )
		);
		const preselectEventId = block.getAttribute( 'data-event-id' ) || '';
		const filmsBase = block.getAttribute( 'data-films-base' ) || '';

		// Film detail configuration
		if ( filmsBase && ! __EventiveFilmDetailBase ) {
			__EventiveFilmDetailBase = filmsBase;
		}
		const filmDetailBaseURL =
			filmsBase || window.EventiveBlockData?.filmDetailBaseURL || '';
		const prettyPermalinks =
			window.EventiveBlockData?.usePrettyPermalinks || false;
		const filmSyncEnabled =
			window.EventiveBlockData?.filmSyncEnabled || false;

		let activeTag = tagId;
		let allEvents = [];

		// Collect tags from events
		const collectTags = ( events ) => {
			const tagMap = new Map();
			events.forEach( ( ev ) => {
				const evTags = Array.isArray( ev.tags ) ? ev.tags : [];
				const filmTags = (
					Array.isArray( ev.films ) ? ev.films : []
				).flatMap( ( f ) => ( Array.isArray( f.tags ) ? f.tags : [] ) );
				evTags.concat( filmTags ).forEach( ( t ) => {
					if ( ! t ) {
						return;
					}
					const id = t.id != null ? String( t.id ) : '';
					const name =
						t.name || t.title || t.label || ( id ? '#' + id : '' );
					if ( ! id && ! name ) {
						return;
					}

					const key = id || name.toLowerCase();
					if ( ! tagMap.has( key ) ) {
						tagMap.set( key, {
							id,
							name,
							color: t.color || '#e0e0e0',
							count: 0,
						} );
					}
					const tag = tagMap.get( key );
					tag.count++;
				} );
			} );
			return Array.from( tagMap.values() ).sort( ( a, b ) =>
				a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
			);
		};

		// Highlight active tag
		const highlightActiveTag = () => {
			if ( ! showFilter ) {
				return;
			}
			const filterEl = block.querySelector(
				'.eventive-events-tags-filter'
			);
			if ( ! filterEl ) {
				return;
			}
			try {
				const btns = filterEl.querySelectorAll( '.eventive-tag-btn' );
				btns.forEach( ( btn ) => {
					btn.classList.remove( 'active' );
				} );
				btns.forEach( ( btn ) => {
					const id = btn.getAttribute( 'data-tag-id' ) || '';
					if ( ! activeTag ) {
						if ( ! id ) {
							btn.classList.add( 'active' );
						}
					} else if ( id === activeTag ) {
						btn.classList.add( 'active' );
					}
				} );
			} catch ( e ) {
				// Ignore
			}
		};

		// Render tags filter
		const renderTagsFilter = ( tags ) => {
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

			const allBtn =
				'<button class="eventive-tag-btn ' +
				( ! activeTag ? 'active' : '' ) +
				'" data-tag-id="">All</button>';
			const tagBtns = tags
				.map( ( tag ) => {
					const color = tag.color || '#e0e0e0';
					const textColor = getTextColor( color );
					const isActive =
						activeTag === tag.id || activeTag === tag.name;
					return (
						'<button class="eventive-tag-btn ' +
						( isActive ? 'active' : '' ) +
						'" data-tag-id="' +
						( tag.id || tag.name ) +
						'" style="background-color:' +
						color +
						';color:' +
						textColor +
						';">' +
						tag.name +
						'</button>'
					);
				} )
				.join( '' );

			filterEl.innerHTML =
				'<div class="eventive-tags-list">' +
				allBtn +
				tagBtns +
				'</div>';

			// Add click handlers (once)
			if ( ! filterEl.__evtClickBound ) {
				filterEl.__evtClickBound = true;
				filterEl.addEventListener(
					'click',
					( e ) => {
						const btn = e.target.closest( '.eventive-tag-btn' );
						if ( ! btn ) {
							return;
						}
						if (
							e.metaKey ||
							e.ctrlKey ||
							e.shiftKey ||
							e.altKey
						) {
							return;
						}
						e.preventDefault();
						e.stopPropagation();
						activeTag = btn.getAttribute( 'data-tag-id' ) || '';
						setURLTagParam( activeTag, 'replace' );
						highlightActiveTag();
						renderEvents( allEvents );
					},
					true
				);
			}
		};

		// Filter events
		const filterEvents = ( events ) => {
			const filtered = [];

			( events || [] ).forEach( ( event ) => {
				// Venue check
				if (
					venueId &&
					( ! event.venue || event.venue.id !== venueId )
				) {
					return;
				}

				// Tag filtering
				if ( activeTag ) {
					const evTagsArr = Array.isArray( event.tags )
						? event.tags
						: [];
					const fmTagsArr =
						event.films &&
						event.films[ 0 ] &&
						Array.isArray( event.films[ 0 ].tags )
							? event.films[ 0 ].tags
							: [];
					const allTagObjs = evTagsArr.concat( fmTagsArr );
					const eventTagIds = [];
					const eventTagNames = [];

					allTagObjs.forEach( ( t ) => {
						if ( ! t ) {
							return;
						}
						if ( t.id != null ) {
							eventTagIds.push( String( t.id ) );
						}
						if ( t.name ) {
							eventTagNames.push( t.name.toLowerCase() );
						}
					} );

					const matches =
						eventTagIds.includes( activeTag ) ||
						eventTagNames.includes( activeTag.toLowerCase() );

					if ( ! matches ) {
						return;
					}
				}

				filtered.push( event );
			} );

			return filtered;
		};

		// Render events
		const renderEvents = ( events ) => {
			const eventsToRender = events || allEvents;
			const filtered = filterEvents( eventsToRender );

			if ( showFilter ) {
				const tags = collectTags( eventsToRender );
				renderTagsFilter( tags );
			}

			// Remove loading text
			const loadingText = block.querySelector(
				'.eventive-film-loading-text'
			);
			if ( loadingText ) {
				loadingText.remove();
			}

			if ( ! filtered.length ) {
				const container = document.createElement( 'div' );
				container.className = 'event-schedule-container';
				container.innerHTML =
					'<p class="no-events">No upcoming events found.</p>';
				block.appendChild( container );
				return;
			}

			// Group events by date
			const grouped = {};
			filtered.forEach( ( event ) => {
				if ( ! event.start_time ) {
					return;
				}
				const date = new Date( event.start_time );
				if ( isNaN( date ) ) {
					return;
				}
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

			// Build HTML with string concatenation for HTML preservation
			let html = '<div class="event-schedule-container">';

			Object.keys( grouped ).forEach( ( dateKey ) => {
				const dayEvents = grouped[ dateKey ];
				const countClass =
					'events-count-' + Math.min( dayEvents.length, 3 );

				html += '<div class="event-group">';
				html += '<h3 class="event-group-header">' + dateKey + '</h3>';
				html += '<div class="event-group-items ' + countClass + '">';

				dayEvents.forEach( ( event ) => {
					const time = new Date(
						event.start_time
					).toLocaleTimeString( undefined, {
						hour: 'numeric',
						minute: '2-digit',
					} );

					const name = event.name || 'Untitled Event';
					const desc = event.description || '';
					const venueName = ( event.venue && event.venue.name ) || '';

					// Enhanced image fetching
					let imageUrl = '';
					if ( imageMode !== 'none' ) {
						imageUrl = imageForEvent( event, imageMode );
					}

					let imageHTML = '';
					if ( imageUrl ) {
						imageHTML =
							'<img class="eventive-card-image" src="' +
							imageUrl +
							'" alt="' +
							name +
							'" loading="lazy" decoding="async" />';
					}

					let descriptionHTML = '';
					if ( showDescription && desc ) {
						descriptionHTML =
							'<p class="eventive-card-description">' + desc + '</p>';
					}

					let venueHTML = '';
					if ( venueName ) {
						venueHTML =
							'<p class="eventive-card-meta">' + venueName + '</p>';
					}

					// Film link
					let filmLinkHTML = '';
					const film =
						event.film ||
						( event.films && event.films[ 0 ] ) ||
						null;
					if ( film && filmDetailBaseURL ) {
						const filmUrl = resolveFilmUrl( film );
						if ( filmUrl ) {
							const filmName =
								film.name || film.title || 'Film Details';
							filmLinkHTML =
								'<p class="eventive-card-link"><a href="' +
								filmUrl +
								'">' +
								filmName +
								'</a></p>';
						}
					}

					html += '<div class="eventive-card">';
					if ( imageHTML ) {
						html += imageHTML;
					}
					html += '<div class="eventive-card-content">';
					html += '<h4 class="eventive-card-title">' + name + '</h4>';
					html += '<p class="eventive-card-meta">' + time + '</p>';
					if ( venueHTML ) {
						html += venueHTML;
					}
					if ( filmLinkHTML ) {
						html += filmLinkHTML;
					}
					if ( descriptionHTML ) {
						html += descriptionHTML;
					}
					html +=
						'<div class="eventive-button" data-event="' +
						( event.id || '' ) +
						'"></div>';
					html += '</div></div>';
				} );

				html += '</div></div>';
			} );

			html += '</div>';
			block.innerHTML = html;

			// Rebuild Eventive buttons
			setTimeout( () => {
				if (
					block.querySelector( '.eventive-button' ) &&
					window.Eventive?.rebuild
				) {
					window.Eventive.rebuild();
				}
			}, 100 );
		};

		// Fetch and render
		const boot = () => {
			if ( ! window.Eventive ) {
				block.innerHTML =
					'<p class="error-message">Eventive API is not initialized. Please check your integration.</p>';
				return;
			}

			let hasRun = false;
			const run = () => {
				if ( hasRun ) {
					return;
				}
				hasRun = true;

				// Clean up listener
				if ( window.Eventive && window.Eventive.off ) {
					window.Eventive.off( 'ready', run );
				}

				fetchEventsOnce( eventBucket, {
					includePast: false,
					includeVirtual: true,
				} )
					.then( ( events ) => {
						allEvents = events;
						renderEvents( events );
					} )
					.catch( () => {
						block.innerHTML =
							'<p class="error-message">Failed to load events.</p>';
					} );
			};

			if ( window.Eventive._ready || window.Eventive.ready ) {
				run();
			} else {
				window.Eventive.on( 'ready', run );
			}
		};

		// Event listener for tag changes
		document.addEventListener( 'eventive:setActiveTag', ( ev ) => {
			const tagId =
				ev && ev.detail && ev.detail.tagId !== undefined
					? ev.detail.tagId
					: ev.detail || '';
			activeTag = String( tagId || '' );
			setURLTagParam( activeTag, 'replace' );
			highlightActiveTag();
			renderEvents( allEvents );
		} );

		// Popstate for back/forward navigation
		window.addEventListener( 'popstate', () => {
			try {
				activeTag =
					new URL( window.location.href ).searchParams.get(
						'tag-id'
					) || tagId;
				highlightActiveTag();
				renderEvents( allEvents );
			} catch ( e ) {
				// Ignore
			}
		} );

		boot();
	} );
} );
