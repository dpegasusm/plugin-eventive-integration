/**
 * Eventive Events List Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

// Shared page-level event cache
window.__Eventive_EventCache = window.__Eventive_EventCache || {};

// Global film detail config (first block wins)
let __EventiveFilmDetailBase = '';
let __EventiveFilmDetailPretty = true;

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
	const forceAll = !! opts.forceAll;

	const key =
		bucket +
		'::past=' +
		( includePast ? 1 : 0 ) +
		'::virt=' +
		( includeVirtual ? 1 : 0 ) +
		'::all=' +
		( forceAll ? 1 : 0 );
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
	if ( ! ( includePast || forceAll ) ) {
		qs.upcoming_only = true;
		qs.marquee = true;
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

/**
 * Initialize all events list blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-events-list'
	);

	blocks.forEach( ( block ) => {
		if ( block.__inited ) {
			return;
		}
		block.__inited = true;

		block.classList.add( 'eventive-events-list--inited' );

		// Get API configuration
		const nonce = window.EventiveBlockData?.eventNonce || '';
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.EventiveBlockData?.eventBucket ||
			'';

		// Extract attributes
		const limit = parseInt( block.getAttribute( 'data-limit' ) ) || 0;
		const tagIdAttr = block.getAttribute( 'data-tag-id' ) || '';
		const tagsListRaw = tagIdAttr;
		const shortcodeTags = tagsListRaw
			? tagsListRaw
					.split( ',' )
					.map( ( t ) => t.trim() )
					.filter( Boolean )
			: [];
		const excludeTagsRaw = block.getAttribute( 'data-exclude-tags' ) || '';
		const excludeTokens = excludeTagsRaw
			? excludeTagsRaw
					.split( ',' )
					.map( ( t ) => t.trim() )
					.filter( Boolean )
			: [];
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

		// Film detail configuration
		const filmDetailBaseAttr = block.getAttribute(
			'data-film-detail-base'
		);
		if ( filmDetailBaseAttr && ! __EventiveFilmDetailBase ) {
			__EventiveFilmDetailBase = filmDetailBaseAttr;
		}
		const filmDetailPrettyAttr = block.getAttribute(
			'data-film-detail-pretty'
		);
		if ( filmDetailPrettyAttr !== null && filmDetailPrettyAttr !== '' ) {
			__EventiveFilmDetailPretty =
				String( filmDetailPrettyAttr ).toLowerCase() === 'true';
		}

		// Active tag from URL or default
		let activeTag = (
			new URLSearchParams( window.location.search ).get( 'tag-id' ) || ''
		).trim();
		const tagDefault = shortcodeTags[ 0 ] || '';

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
					if ( ! t ) {
						return;
					}
					const id = t.id != null ? String( t.id ) : '';
					const name =
						t.name || t.title || t.label || ( id ? '#' + id : '' );
					if ( ! id && ! name ) {
						return;
					}

					// Skip excluded tags from filter UI
					if ( excludeTokens && excludeTokens.length ) {
						const isExcluded = excludeTokens.some( ( tok ) => {
							return (
								( id && tok === id ) ||
								( name &&
									tok.toLowerCase() === name.toLowerCase() )
							);
						} );
						if ( isExcluded ) {
							return;
						}
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

			const allBtn = `<button class="eventive-tag-btn ${
				! activeTag ? 'active' : ''
			}" data-tag-id="">All</button>`;
			const tagBtns = tags
				.map( ( tag ) => {
					const color = tag.color || '#e0e0e0';
					const textColor = getTextColor( color );
					const isActive =
						activeTag === tag.id || activeTag === tag.name;
					return `<button class="eventive-tag-btn ${
						isActive ? 'active' : ''
					}" data-tag-id="${
						tag.id || tag.name
					}" style="background-color:${ color };color:${ textColor };">${
						tag.name
					}</button>`;
				} )
				.join( '' );

			filterEl.innerHTML = `<div class="eventive-tags-list">${ allBtn }${ tagBtns }</div>`;

			// Hide filter if disabled
			if ( ! showFilter ) {
				filterEl.classList.add( 'is-hidden' );
				filterEl.setAttribute( 'hidden', '' );
				filterEl.style.display = 'none';
			}

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
						if ( window.allEventiveEvents ) {
							renderEvents( window.allEventiveEvents, activeTag );
						}
					},
					true
				);
			}
		};

		// Check if event is upcoming
		const isUpcoming = ( ev ) => {
			if ( includePast ) {
				return true;
			}
			const t =
				ev && ev.start_time ? new Date( ev.start_time ).getTime() : NaN;
			if ( ! isFinite( t ) ) {
				return false;
			}
			return t >= Date.now();
		};

		// Filter events
		const filterEvents = ( events, overrideTag ) => {
			const tagId =
				typeof overrideTag === 'string'
					? overrideTag
					: activeTag || tagDefault;

			// Partition into undated and dated
			const undated = [];
			const dated = [];

			( events || [] ).forEach( ( event ) => {
				// Venue check
				if (
					venueId &&
					( ! event.venue || event.venue.id !== venueId )
				) {
					return;
				}

				// Virtual check
				if ( ! includeVirtual && event.is_virtual ) {
					return;
				}

				// Tag filtering
				const filterTokens = [];
				if ( tagId ) {
					filterTokens.push( String( tagId ) );
				} else if ( shortcodeTags && shortcodeTags.length ) {
					filterTokens.push( ...shortcodeTags );
				}

				const evTagsArr = Array.isArray( event.tags ) ? event.tags : [];
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

				if ( filterTokens.length ) {
					const matches = filterTokens.some( ( tok ) => {
						return (
							eventTagIds.includes( tok ) ||
							eventTagNames.includes( tok.toLowerCase() )
						);
					} );
					if ( ! matches ) {
						return;
					}
				}

				// Date range check
				if (
					( startDateTs != null || endDateTs != null ) &&
					event.start_time
				) {
					const evTime = new Date( event.start_time ).getTime();
					if ( isFinite( evTime ) ) {
						if ( startDateTs != null && evTime < startDateTs ) {
							return;
						}
						if ( endDateTs != null && evTime > endDateTs ) {
							return;
						}
					}
				}

				// Single-tag exclusion check
				if (
					excludeTokens &&
					excludeTokens.length &&
					allTagObjs.length === 1
				) {
					const onlyTag = allTagObjs[ 0 ];
					if ( onlyTag ) {
						const tagId =
							onlyTag.id != null ? String( onlyTag.id ) : '';
						const tagName = onlyTag.name || '';
						const isExcluded = excludeTokens.some( ( tok ) => {
							return (
								( tagId && tok === tagId ) ||
								( tagName &&
									tok.toLowerCase() ===
										tagName.toLowerCase() )
							);
						} );
						if ( isExcluded ) {
							return;
						}
					}
				}

				// Undated vs dated
				const isUndated =
					event.is_date === false ||
					event.is_dated === false ||
					( ! event.start_time && event.date == null );

				if ( isUndated ) {
					if ( ! showUndated ) {
						return;
					}
					undated.push( event );
				} else {
					if ( ! isUpcoming( event ) ) {
						return;
					}
					dated.push( event );
				}
			} );

			// Order: undated first, then dated
			const ordered = undated.concat( dated );

			// Apply limit
			if ( limit && limit > 0 ) {
				return ordered.slice( 0, limit );
			}

			return ordered;
		};

		// Render events list
		const renderEventsList = ( events ) => {
			if ( ! events.length ) {
				return '<p class="no-events">No upcoming events found.</p>';
			}

			const html = [];
			events.forEach( ( event ) => {
				// Date/time
				let startHtml = '';
				if ( event.start_time && event.is_date !== false ) {
					const dt = new Date( event.start_time );
					if ( ! isNaN( dt ) ) {
						startHtml = dt.toLocaleDateString( undefined, {
							weekday: 'short',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: '2-digit',
						} );
					}
				}

				const name = event.name || 'Untitled Event';
				const desc = event.description || '';
				const shortDesc =
					event.short_description ||
					( event.films &&
						event.films[ 0 ] &&
						event.films[ 0 ].short_description ) ||
					'';
				const venueName =
					( event.venue && event.venue.name ) || 'No venue specified';

				// Film metadata
				let filmMetaHtml = '';
				if ( event.films && event.films.length ) {
					if ( event.films.length === 1 ) {
						const f = event.films[ 0 ];
						const filmUrl = resolveFilmUrl( f );
						if ( filmUrl ) {
							filmMetaHtml =
								'<div class="film-meta"><a href="' +
								filmUrl +
								'">View Film Details</a></div>';
						}
					} else {
						const filmTitlesHtml = event.films
							.map( ( f ) => {
								const title = f.name || f.title || 'Untitled';
								const filmUrl = resolveFilmUrl( f );
								if ( filmUrl ) {
									return (
										'<a href="' +
										filmUrl +
										'">' +
										title +
										'</a>'
									);
								}
								return title;
							} )
							.join( '' );
						filmMetaHtml =
							'<div class="film-meta">Showing: ' +
							filmTitlesHtml +
							'</div>';
					}
				}

				// Image
				let imageUrl = '';
				if ( imagePref === 'cover' ) {
					imageUrl =
						event.cover_image ||
						( event.images && event.images.cover ) ||
						( event.films &&
							event.films[ 0 ] &&
							( event.films[ 0 ].cover_image ||
								( event.films[ 0 ].images &&
									event.films[ 0 ].images.cover ) ) ) ||
						'';
				} else if ( imagePref === 'poster' ) {
					imageUrl =
						event.poster_image ||
						( event.images && event.images.poster ) ||
						( event.films &&
							event.films[ 0 ] &&
							( event.films[ 0 ].poster_image ||
								( event.films[ 0 ].images &&
									event.films[ 0 ].images.poster ) ) ) ||
						'';
				}

				// Poster HTML with optional film link
				let posterHtml = '';
				if ( imagePref !== 'none' && imageUrl ) {
					let posterInner =
						'<div class="poster-container"><img src="' +
						imageUrl +
						'" alt="' +
						name +
						' Image" class="poster" /></div>';
					if ( event.films && event.films.length === 1 ) {
						const filmUrl = resolveFilmUrl( event.films[ 0 ] );
						if ( filmUrl ) {
							posterInner =
								'<a href="' +
								filmUrl +
								'">' +
								posterInner +
								'</a>';
						}
					}
					posterHtml = posterInner;
				}

				const ticketBtn = event.hide_tickets_button
					? ''
					: '<div class="eventive-button" data-event="' +
					  ( event.id || '' ) +
					  '"></div>';

				// Tag labels
				const tagMap = new Map();
				( event.tags || [] )
					.concat(
						( event.films || [] ).flatMap( ( f ) => f.tags || [] )
					)
					.forEach( ( tag ) => {
						if ( ! tag ) {
							return;
						}
						const id = tag.id != null ? String( tag.id ) : '';
						const name =
							tag.name ||
							tag.title ||
							tag.label ||
							( id ? '#' + id : '' );
						if ( ! id && ! name ) {
							return;
						}

						// Skip excluded tags
						if ( excludeTokens && excludeTokens.length ) {
							const isExcluded = excludeTokens.some( ( tok ) => {
								return (
									( id && tok === id ) ||
									( name &&
										tok.toLowerCase() ===
											name.toLowerCase() )
								);
							} );
							if ( isExcluded ) {
								return;
							}
						}

						const key = id || name.toLowerCase();
						if ( ! tagMap.has( key ) ) {
							tagMap.set( key, {
								id,
								name,
								color: tag.color || '#e0e0e0',
							} );
						}
					} );

				const tagLabels = Array.from( tagMap.values() )
					.map( ( tag ) => {
						const fg = getTextColor( tag.color || '#e0e0e0' );
						return (
							'<span class="eventive-tag-pill" style="background-color:' +
							tag.color +
							';color:' +
							fg +
							';">' +
							tag.name +
							'</span>'
						);
					} )
					.join( '' );

				// Build HTML
				let itemHtml = '<div class="event-item">';
				if ( posterHtml ) {
					itemHtml += posterHtml;
				}
				itemHtml += '<div class="event-details">';
				itemHtml += '<h3 class="event-name">' + name + '</h3>';
				if ( startHtml ) {
					itemHtml +=
						'<p class="event-start-time">' + startHtml + '</p>';
				}
				itemHtml +=
					'<p class="event-venue"><strong>Venue:</strong> ' +
					venueName +
					'</p>';
				if ( filmMetaHtml ) {
					itemHtml += filmMetaHtml;
				}
				if ( showShortDescription && shortDesc ) {
					itemHtml +=
						'<div class="event-short-description">' +
						shortDesc +
						'</div>';
				}
				if ( showDescription && desc ) {
					itemHtml +=
						'<div class="event-description">' + desc + '</div>';
				}
				if ( tagLabels ) {
					itemHtml +=
						'<div class="eventive-tag-pills">' +
						tagLabels +
						'</div>';
				}
				itemHtml += ticketBtn;
				itemHtml += '</div></div>';
				html.push( itemHtml );
			} );

			return html.length
				? html.join( '' )
				: '<p class="no-events">No upcoming events found.</p>';
		};

		// Render events grid
		const renderEventsGrid = ( events ) => {
			if ( ! events.length ) {
				return '<p class="no-events">No upcoming events found.</p>';
			}

			const html = [];
			events.forEach( ( event ) => {
				const name = event.name || 'Untitled Event';
				let startHtml = '';
				if ( event.start_time && event.is_date !== false ) {
					const dt = new Date( event.start_time );
					if ( ! isNaN( dt ) ) {
						startHtml = dt.toLocaleDateString( undefined, {
							month: 'short',
							day: 'numeric',
						} );
					}
				}

				let imageUrl = '';
				if ( imagePref === 'cover' ) {
					imageUrl =
						event.cover_image ||
						( event.images && event.images.cover ) ||
						( event.films &&
							event.films[ 0 ] &&
							( event.films[ 0 ].cover_image ||
								( event.films[ 0 ].images &&
									event.films[ 0 ].images.cover ) ) ) ||
						'';
				} else if ( imagePref === 'poster' ) {
					imageUrl =
						event.poster_image ||
						( event.images && event.images.poster ) ||
						( event.films &&
							event.films[ 0 ] &&
							( event.films[ 0 ].poster_image ||
								( event.films[ 0 ].images &&
									event.films[ 0 ].images.poster ) ) ) ||
						'';
				}

				const ticketBtn = event.hide_tickets_button
					? ''
					: '<div class="eventive-button" data-event="' +
					  ( event.id || '' ) +
					  '"></div>';

				let cardHtml = '<div class="eventive-card">';
				if ( imageUrl ) {
					cardHtml +=
						'<img class="eventive-card-image" src="' +
						imageUrl +
						'" alt="' +
						name +
						'" />';
				}
				cardHtml += '<div class="eventive-card-content">';
				cardHtml += '<h4 class="eventive-card-title">' + name + '</h4>';
				if ( startHtml ) {
					cardHtml +=
						'<p class="eventive-card-meta">' + startHtml + '</p>';
				}
				cardHtml += ticketBtn;
				cardHtml += '</div></div>';
				html.push( cardHtml );
			} );

			return '<div class="event-grid">' + html.join( '' ) + '</div>';
		};

		let allEvents = [];

		// Render events
		const renderEvents = ( events, overrideTag ) => {
			const eventsToRender = events || allEvents;
			const filtered = filterEvents( eventsToRender, overrideTag );
			const tags = collectTags( eventsToRender );

			renderTagsFilter( tags );

			// Remove loading text
			const loadingText = block.querySelector(
				'.eventive-film-loading-text'
			);
			if ( loadingText ) {
				loadingText.remove();
			}

			block.classList.remove( 'event-list', 'event-grid' );
			block.classList.add(
				viewMode === 'grid' ? 'event-grid' : 'event-list'
			);

			block.innerHTML =
				viewMode === 'grid'
					? renderEventsGrid( filtered )
					: renderEventsList( filtered );

			setTimeout( () => {
				if (
					block.querySelector( '.eventive-button' ) &&
					window.Eventive?.rebuild
				) {
					window.Eventive.rebuild();
				}
			}, 100 );
		};

		// Store for popstate
		window.allEventiveEvents = window.allEventiveEvents || [];

		// Fetch and render
		const boot = () => {
			if ( ! window.Eventive ) {
				block.innerHTML =
					'<p class="error-message">Eventive API is not initialized. Please check your integration.</p>';
				return;
			}

			const run = () => {
				const urlTag =
					new URLSearchParams( window.location.search ).get(
						'tag-id'
					) || tagDefault;

				fetchEventsOnce( eventBucket, {
					includePast,
					includeVirtual,
					forceAll: showUndated,
				} )
					.then( ( events ) => {
						allEvents = events;
						window.allEventiveEvents = events;
						renderEvents( events, urlTag );
					} )
					.catch( () => {
						block.innerHTML =
							'<p class="error-message">Error loading events. Please try again later.</p>';
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
			if ( window.allEventiveEvents ) {
				renderEvents( window.allEventiveEvents, activeTag );
			}
		} );

		// Popstate for back/forward navigation
		window.addEventListener( 'popstate', () => {
			try {
				activeTag =
					new URL( window.location.href ).searchParams.get(
						'tag-id'
					) || '';
				highlightActiveTag();
				if ( window.allEventiveEvents ) {
					renderEvents( window.allEventiveEvents, activeTag );
				}
			} catch ( e ) {
				// Ignore
			}
		} );

		boot();
	} );
} );
