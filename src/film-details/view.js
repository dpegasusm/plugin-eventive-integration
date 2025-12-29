/**
 * Eventive Film Details Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Helper functions
 * @param str
 */
function htmlEscape( str ) {
	return ( str || '' ).replace(
		/[&<>"']/g,
		( c ) =>
			( {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			} )[ c ]
	);
}

function getContrastYIQ( hex ) {
	if ( ! hex ) {
		return '#000';
	}
	hex = String( hex ).replace( '#', '' );
	if ( hex.length === 3 ) {
		hex = hex
			.split( '' )
			.map( ( c ) => c + c )
			.join( '' );
	}
	const r = parseInt( hex.substr( 0, 2 ), 16 ) || 0,
		g = parseInt( hex.substr( 2, 2 ), 16 ) || 0,
		b = parseInt( hex.substr( 4, 2 ), 16 ) || 0;
	return ( r * 299 + g * 587 + b * 114 ) / 1000 >= 128 ? '#000' : '#fff';
}

function toEmbed( raw ) {
	try {
		const u = new URL( raw );
		const host = u.hostname.replace( /^www\./, '' ).toLowerCase();
		if ( host === 'youtu.be' ) {
			const id = ( u.pathname.split( '/' )[ 1 ] || '' ).trim();
			return id
				? `https://www.youtube.com/embed/${ id }?autoplay=1&rel=0&modestbranding=1`
				: null;
		}
		if ( host.endsWith( 'youtube.com' ) ) {
			const id =
				u.searchParams.get( 'v' ) ||
				( u.pathname.startsWith( '/shorts/' )
					? u.pathname.split( '/' )[ 2 ]
					: '' );
			return id
				? `https://www.youtube.com/embed/${ id }?autoplay=1&rel=0&modestbranding=1`
				: null;
		}
		if ( host.endsWith( 'vimeo.com' ) ) {
			const parts = u.pathname.split( '/' ).filter( Boolean );
			const id =
				host === 'player.vimeo.com'
					? parts[ 1 ] === 'video'
						? parts[ 2 ]
						: parts[ 1 ]
					: parts[ 0 ];
			return id
				? `https://player.vimeo.com/video/${ id }?autoplay=1`
				: null;
		}
		return null;
	} catch ( e ) {
		return null;
	}
}

/**
 * Initialize all film details blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-film-details'
	);

	blocks.forEach( ( block ) => {
		// Get film ID from data attribute or URL parameter
		let filmId = block.getAttribute( 'data-film-id' ) || '';
		const urlParams = new URLSearchParams( window.location.search );
		const urlFilmId = urlParams.get( 'film-id' );
		if ( urlFilmId ) {
			filmId = urlFilmId;
		}

		if ( ! filmId ) {
			block.innerHTML =
				'<div class="error-message">Please provide a valid film ID.</div>';
			return;
		}

		// Extract attributes from data attributes
		const showEvents = block.getAttribute( 'data-show-events' ) !== 'false';
		const showDetails =
			block.getAttribute( 'data-show-details' ) === 'true';
		const showTags = block.getAttribute( 'data-show-tags' ) === 'true';
		const excludeVirtual =
			block.getAttribute( 'data-exclude-virtual' ) !== 'false';

		// Get API configuration
		const endpoints = window.EventiveBlockData?.apiEndpoints || {};
		const nonce = window.EventiveBlockData?.eventNonce || '';
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.eventiveOptions?.eventBucket ||
			'';

		// Setup trailer modal
		const setupTrailer = ( container ) => {
			const btn = container.querySelector( '.film-watch-button' );
			if ( ! btn ) {
				return;
			}

			let modal = document.querySelector( '.eventive-trailer-modal' );
			let iframe;
			if ( ! modal ) {
				modal = document.createElement( 'div' );
				modal.className = 'eventive-trailer-modal';
				modal.setAttribute( 'role', 'dialog' );
				modal.setAttribute( 'aria-modal', 'true' );
				modal.style.display = 'none';
				modal.innerHTML = `
					<div class="eventive-trailer-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);"></div>
					<div class="eventive-trailer-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;border-radius:8px;display:block;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);width:min(90vw,960px);">
						<button class="eventive-trailer-close" aria-label="Close trailer" title="Close" style="position:absolute;top:6px;right:8px;border:0;background:rgba(0,0,0,0.4);color:#fff;font-size:26px;line-height:1;padding:8px 12px;border-radius:6px;cursor:pointer;z-index:2">×</button>
						<div class="eventive-trailer-embed" style="position:relative;padding-top:56.25%;width:100%;">
							<iframe class="eventive-trailer-iframe" src="" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>
						</div>
					</div>`;
				document.body.appendChild( modal );
				modal.style.zIndex = '10000';
				iframe = modal.querySelector( '.eventive-trailer-iframe' );
				const close = () => {
					iframe.src = '';
					modal.style.display = 'none';
					document.documentElement.style.overflow = '';
				};
				modal
					.querySelector( '.eventive-trailer-close' )
					.addEventListener( 'click', close );
				modal
					.querySelector( '.eventive-trailer-backdrop' )
					.addEventListener( 'click', close );
				modal.addEventListener( 'click', ( e ) => {
					const dialog = modal.querySelector(
						'.eventive-trailer-dialog'
					);
					if ( dialog && ! dialog.contains( e.target ) ) {
						close();
					}
				} );
				document.addEventListener( 'keydown', ( e ) => {
					if (
						e.key === 'Escape' &&
						modal.style.display === 'block'
					) {
						close();
					}
				} );
			} else {
				iframe = modal.querySelector( '.eventive-trailer-iframe' );
			}

			btn.addEventListener( 'click', ( ev ) => {
				ev.preventDefault();
				const embed = toEmbed(
					btn.getAttribute( 'data-trailer-url' ) || ''
				);
				if ( ! embed ) {
					console.warn( 'Unsupported trailer URL' );
					return;
				}
				iframe.src = embed;
				modal.style.display = 'block';
				document.documentElement.style.overflow = 'hidden';
			} );
		};

		// Render film details
		const renderFilm = ( film ) => {
			const tagsHTML = ( film.tags || [] )
				.map( ( tag ) => {
					const text = getContrastYIQ( tag.color || '#ccc' );
					return `<span class="film-tag-pill" style="background-color:${
						tag.color || '#ccc'
					};color:${ text };">${ htmlEscape( tag.name ) }</span>`;
				} )
				.join( '' );

			const credits = film.credits || {};
			const creditsHTML = Object.keys( credits )
				.map( ( k ) => {
					const v = credits[ k ];
					return v
						? `<div><strong>${ htmlEscape(
								k.replace( /_/g, ' ' ).toUpperCase()
						  ) }:</strong> ${ htmlEscape( String( v ) ) }</div>`
						: '';
				} )
				.join( '' );

			const trailerBtn = film.trailer_url
				? `<button class="film-watch-button" data-trailer-url="${ htmlEscape(
						film.trailer_url
				  ) }" style="width:100%;max-width:400px;margin-top:8px;padding:10px 0;background:#ff3b3b;color:#fff;font-weight:600;border:none;border-radius:4px;cursor:pointer;">▶ Watch Trailer</button>`
				: '';

			block.innerHTML = `
				<div class="hero-section" ${
					film.cover_image
						? `style="background-image:url('${ htmlEscape(
								film.cover_image
						  ) }');"`
						: ''
				}>
					<div class="film-images" style="display:flex;flex-direction:column;align-items:center;">
						<img class="film-poster" src="${ htmlEscape(
							film.poster_image || ''
						) }" alt="${ htmlEscape( film.name || 'Film' ) }">
						${ trailerBtn }
					</div>
				</div>
				<div class="film-details">
					<h2 class="film-title">${ htmlEscape( film.name || '' ) }</h2>
					${
						showDetails
							? `
						<div class="film-info">
							<div><strong>Director:</strong> ${ htmlEscape(
								( film.credits && film.credits.director ) ||
									'Unknown'
							) }</div>
							<div><strong>Runtime:</strong> ${ htmlEscape(
								String(
									( film.details && film.details.runtime ) ||
										'N/A'
								)
							) } minutes</div>
							<div><strong>Year:</strong> ${ htmlEscape(
								String(
									( film.details && film.details.year ) ||
										'N/A'
								)
							) }</div>
							<div><strong>Language:</strong> ${ htmlEscape(
								String(
									( film.details && film.details.language ) ||
										'N/A'
								)
							) }</div>
						</div>`
							: ''
					}
					<div class="film-description">${
						film.description || 'No description available.'
					}</div>
					${ showTags ? `<div class="film-tags">${ tagsHTML }</div>` : '' }
					${
						showDetails
							? `<div class="film-credits"><h3>Credits</h3>${ creditsHTML }</div>`
							: ''
					}
					${ showEvents ? '<div class="film-events"></div>' : '' }
				</div>`;

			setupTrailer( block );
		};

		// Fetch and render events
		const fetchEvents = () => {
			if ( ! showEvents ) {
				return Promise.resolve();
			}

			return window.Eventive.request( {
				method: 'GET',
				path: `event_buckets/${ eventBucket }/films/${ filmId }/events`,
				authenticatePerson: false,
			} )
				.then( ( response ) => {
					let events = [];
					if ( Array.isArray( response?.events ) ) {
						events = response.events;
					} else if ( Array.isArray( response ) ) {
						events = response;
					}

				const now = new Date();
				const upcomingDated = events
					.filter(
						( e ) =>
							e &&
							e.start_time &&
							! isNaN( new Date( e.start_time ) ) &&
							new Date( e.start_time ) > now
					)
					.filter( ( e ) => ! excludeVirtual || ! e.is_virtual );

				let undatedVirtual = [];
				if ( ! excludeVirtual ) {
					undatedVirtual = events.filter(
						( e ) =>
							e &&
							e.is_virtual === true &&
							e.is_dated === false &&
							( ! e.start_time ||
								isNaN( new Date( e.start_time ) ) )
					);
				}

				const upcoming = upcomingDated
					.concat( undatedVirtual )
					.sort( ( a, b ) => {
						const aHasDate =
							a &&
							a.start_time &&
							! isNaN( new Date( a.start_time ) );
						const bHasDate =
							b &&
							b.start_time &&
							! isNaN( new Date( b.start_time ) );
						if ( aHasDate && bHasDate ) {
							return (
								new Date( a.start_time ) -
								new Date( b.start_time )
							);
						}
						if ( aHasDate && ! bHasDate ) {
							return -1;
						}
						if ( ! aHasDate && bHasDate ) {
							return 1;
						}
						return 0;
					} );

				const listEl = block.querySelector( '.film-events' );
				if ( ! listEl ) {
					return;
				}

				if ( ! upcoming.length ) {
					listEl.innerHTML =
						'<div>Scheduled showtime coming soon!</div>';
					if ( window.Eventive?.rebuild ) {
						window.Eventive.rebuild();
					}
					return;
				}

				// Group by date and venue
				const groups = {};
				upcoming.forEach( ( ev ) => {
					if ( ! ev ) {
						return;
					}
					const hasValidStart =
						ev.start_time && ! isNaN( new Date( ev.start_time ) );
					const isUndatedVirtual =
						ev.is_virtual === true &&
						ev.is_dated === false &&
						! hasValidStart;

					const venueName =
						( ev.venue &&
							( ev.venue.name ||
								ev.venue.display_name ||
								ev.venue.slug ) ) ||
						( ev.is_virtual ? 'Virtual' : 'TBA' );
					const dt = hasValidStart ? new Date( ev.start_time ) : null;
					let key;
					let dateForGroup;
					let dateStr;

					if ( isUndatedVirtual ) {
						key = 'virtual_anytime::virtual';
						dateForGroup = new Date( 8640000000000000 );
						dateStr = 'ON-DEMAND';
					} else if ( dt ) {
						const dateKey = dt.toLocaleDateString( undefined, {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
						} );
						const venueId =
							( ev.venue && ev.venue.id ) ||
							( ev.is_virtual ? 'virtual' : 'tba' );
						key = dateKey + '::' + venueId;
						dateForGroup = dt;
						dateStr = dt
							.toLocaleDateString( undefined, {
								weekday: 'short',
								month: 'short',
								day: 'numeric',
							} )
							.toUpperCase();
					} else {
						return;
					}

					if ( ! groups[ key ] ) {
						groups[ key ] = {
							date: dateForGroup,
							dateStr,
							venueName,
							isUndatedVirtual,
							items: [],
						};
					}

					groups[ key ].items.push( {
						id: ev.id || '',
						dt,
						tz:
							ev.timezone ||
							( ev.venue && ev.venue.timezone ) ||
							undefined,
						venueName,
						isUndatedVirtual,
					} );
				} );

				const groupList = Object.values( groups )
					.sort( ( a, b ) => a.date - b.date )
					.map( ( g ) => {
						g.items.sort( ( a, b ) => a.dt - b.dt );
						return g;
					} );

				const rows = groupList
					.map( ( g ) => {
						const itemsHTML = g.items
							.map( ( it ) => {
								const timeStr = it.dt
									? it.dt
											.toLocaleTimeString( undefined, {
												hour: 'numeric',
												minute: '2-digit',
												timeZone: it.tz,
											} )
											.toLowerCase()
									: 'on demand';
								return `
									<div class="eventive-showtime-row" style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:6px 0;">
										<span class="eventive-showtime-time" style="font-weight:600;white-space:nowrap;">${ timeStr }</span>
										<span class="eventive-showtime-venue" style="opacity:.85;">${ htmlEscape(
											it.venueName
										) }</span>
										<div class="eventive-showtime-btn"><div class="eventive-button" data-event="${
											it.id
										}" data-label="${ timeStr }"></div></div>
									</div>`;
							} )
							.join( '' );

						return `
							<div class="eventive-screening" style="padding:12px 0;border-top:1px solid rgba(0,0,0,0.08);">
								<div class="eventive-screening__header" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;">
									<div class="eventive-screening__datetime" style="font-weight:700;">${
										g.dateStr
									}</div>
									<div class="eventive-screening__venue" style="opacity:0.85;">${ htmlEscape(
										g.venueName
									) }</div>
								</div>
								<div class="eventive-screening__items">${ itemsHTML }</div>
							</div>`;
					} )
					.join( '' );

				listEl.innerHTML = `<h3 class="eventive-events-title">Upcoming Events</h3><div class="eventive-events-list">${ rows }</div>`;
				if ( window.Eventive?.rebuild ) {
					window.Eventive.rebuild();
				}
			} )
			.catch( ( error ) => {
				console.error( '[eventive-film-details] Error fetching events:', error );
				const listEl = block.querySelector( '.film-events' );
				if ( listEl ) {
					listEl.innerHTML =
						'<div>Error loading events for this film.</div>';
				}
			} );
		};

		// Main fetch and render
		const init = () => {
			const fetchFilm = () => {
				window.Eventive.request( {
					method: 'GET',
					path: `films/${ filmId }`,
					authenticatePerson: false,
				} )
					.then( ( film ) => {
						renderFilm( film );
						return fetchEvents();
					} )
					.catch( ( error ) => {
						console.error( '[eventive-film-details] Error fetching film:', error );
						block.innerHTML = '<div>Error loading film details.</div>';
					} );
			};

			if ( window.Eventive && window.Eventive._ready ) {
				fetchFilm();
			} else if ( window.Eventive && typeof window.Eventive.on === 'function' ) {
				window.Eventive.on( 'ready', fetchFilm );
			} else {
				setTimeout( () => {
					if ( window.Eventive && typeof window.Eventive.request === 'function' ) {
						fetchFilm();
					} else {
						console.error( '[eventive-film-details] Eventive API not available' );
						block.innerHTML = '<div>Error loading film details.</div>';
					}
				}, 1000 );
			}
		};

		init();
	} );
} );
