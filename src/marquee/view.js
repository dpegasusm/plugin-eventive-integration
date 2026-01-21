/**
 * Marquee Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Helper functions
 * @param obj
 * @param chain
 */
function safe( obj, chain ) {
	try {
		return chain.reduce(
			( o, k ) => ( o && o[ k ] !== undefined ? o[ k ] : undefined ),
			obj
		);
	} catch ( e ) {
		return undefined;
	}
}

function pickFirstUrl( candidates ) {
	if ( ! Array.isArray( candidates ) ) {
		return '';
	}
	for ( let i = 0; i < candidates.length; i++ ) {
		const c = candidates[ i ];
		if ( ! c ) {
			continue;
		}
		if ( typeof c === 'string' && c.trim() ) {
			return c.trim();
		}
		if (
			typeof c === 'object' &&
			typeof c.url === 'string' &&
			c.url.trim()
		) {
			return c.url.trim();
		}
	}
	return '';
}

function getImageUrlForFilm( film, useStills ) {
	const stillCandidates = [
		safe( film, [ 'images', 'still_image' ] ),
		safe( film, [ 'images', 'still' ] ),
		safe( film, [ 'images', 'stillImage' ] ),
		safe( film, [ 'images', 'still_url' ] ),
		safe( film, [ 'images', 'still', 'url' ] ),
		safe( film, [ 'images', 'still_image', 'url' ] ),
		safe( film, [ 'still_image' ] ),
		safe( film, [ 'still_url' ] ),
	];
	const posterCandidates = [
		safe( film, [ 'poster_image' ] ),
		safe( film, [ 'images', 'poster_image' ] ),
		safe( film, [ 'images', 'poster' ] ),
		safe( film, [ 'images', 'poster', 'url' ] ),
		safe( film, [ 'poster', 'url' ] ),
	];
	let chosen = '';
	if ( useStills ) {
		chosen = pickFirstUrl( stillCandidates );
	}
	if ( ! chosen ) {
		chosen = pickFirstUrl( posterCandidates );
	}
	return chosen || '';
}

function getFilmTagNames( film ) {
	const names = [];
	if ( Array.isArray( film.tags ) ) {
		film.tags.forEach( ( t ) => {
			const n =
				t && ( t.name || t.title || t.label )
					? String( t.name || t.title || t.label ).toLowerCase()
					: '';
			if ( n ) {
				names.push( n );
			}
		} );
	}
	if ( Array.isArray( film.tag_names ) ) {
		film.tag_names.forEach( ( s ) => {
			const n = s ? String( s ).toLowerCase() : '';
			if ( n ) {
				names.push( n );
			}
		} );
	}
	if ( Array.isArray( film.categories ) ) {
		film.categories.forEach( ( s ) => {
			const n = s ? String( s ).toLowerCase() : '';
			if ( n ) {
				names.push( n );
			}
		} );
	}
	if ( film.category ) {
		names.push( String( film.category ).toLowerCase() );
	}
	return Array.from( new Set( names ) );
}

function filmHasAnyTag( film, list ) {
	if ( ! list || ! list.length ) {
		return false;
	}
	const t = getFilmTagNames( film );
	return list.some( ( x ) => t.indexOf( x ) > -1 );
}

function parseTagList( str ) {
	if ( ! str ) {
		return [];
	}
	return String( str )
		.split( ',' )
		.map( ( s ) => s.trim().toLowerCase().replace( /\s+/g, ' ' ) )
		.filter( Boolean );
}

function filterByIncludeExclude( items, includeStr, excludeStr ) {
	const inc = parseTagList( includeStr ),
		exc = parseTagList( excludeStr );
	return ( items || [] ).filter( ( item ) => {
		const passInc = inc.length ? filmHasAnyTag( item, inc ) : true;
		const passExc = exc.length ? ! filmHasAnyTag( item, exc ) : true;
		return passInc && passExc;
	} );
}

/**
 * Initialize Marquee blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const marqueeBlocks = document.querySelectorAll(
		'.eventive-marquee-wrapper'
	);

	marqueeBlocks.forEach( ( wrapper ) => {
		if ( wrapper.__inited ) {
			return;
		}
		wrapper.__inited = true;

		// Get API configuration
		const endpoints = window.EventiveBlockData?.apiEndpoints || {};
		const nonce = window.EventiveBlockData?.eventNonce || '';
		const eventBucket =
			window.EventiveBlockData?.eventBucket ||
			window.EventiveBlockData?.eventBucket ||
			'';

		// Initialize wrapper decoration
		const overlay = wrapper.querySelector( '.eventive-marquee-overlay' );
		const overlayUrl = wrapper.getAttribute( 'data-overlay-url' ) || '';
		const overlayOpacity = parseFloat(
			wrapper.getAttribute( 'data-overlay-opacity' ) || '0.22'
		);
		if ( overlay ) {
			overlay.style.backgroundImage = overlayUrl
				? `url(${ overlayUrl })`
				: '';
			overlay.style.opacity = isNaN( overlayOpacity )
				? '0.22'
				: String( Math.max( 0, Math.min( 1, overlayOpacity ) ) );
		}

		const captionText = (
			wrapper.getAttribute( 'data-caption' ) || ''
		).trim();
		const captionTrack = wrapper.querySelector(
			'.eventive-marquee-caption-track'
		);
		if ( captionTrack ) {
			if ( captionText ) {
				const segment = ' • ' + captionText + ' ';
				let repeated = captionText;
				while ( repeated.length < 200 ) {
					repeated += segment;
				}
				captionTrack.textContent = repeated;
			} else {
				captionTrack.textContent = '';
			}
		}

		// Extract attributes
		const filmSyncEnabled =
			wrapper.getAttribute( 'data-film-sync-enabled' ) === 'true';
		const prettyPermalinks =
			wrapper.getAttribute( 'data-pretty-permalinks' ) === 'true';
		const detailBaseURL =
			wrapper.getAttribute( 'data-detail-base-url' ) || '';

		const marquee = wrapper.querySelector( '.eventive-marquee' );
		if ( ! marquee ) {
			return;
		}

		const tag = marquee.getAttribute( 'data-tag' ) || '';
		const number = Math.min(
			parseInt( marquee.getAttribute( 'data-number' ), 10 ) || 5,
			50
		);
		const rawStills = ( marquee.getAttribute( 'data-stills' ) || '' )
			.toString()
			.toLowerCase();
		const useStills =
			rawStills === 'true' || rawStills === '1' || rawStills === 'yes';
		const yearRound = marquee.getAttribute( 'data-year-round' ) === 'true';
		const exclude = marquee.getAttribute( 'data-exclude' ) || '';

		// Create poster slide
		const createPosterSlide = ( filmName, imageUrl, filmId ) => {
			if ( ! imageUrl ) {
				const placeholder = document.createElement( 'a' );
				placeholder.href = '#';
				placeholder.className = 'poster-slide placeholder';
				placeholder.setAttribute( 'aria-hidden', 'true' );
				return placeholder;
			}

			const filmNameSlug = String( filmName || '' )
				.toLowerCase()
				.replace( /[^\w\s-]/g, '' )
				.replace( /\s+/g, '-' )
				.trim();

			let linkHref;
			if ( filmSyncEnabled ) {
				linkHref =
					detailBaseURL.replace( /\/$/, '' ) + '/' + filmNameSlug;
			} else {
				linkHref = prettyPermalinks
					? detailBaseURL + '?film-id=' + encodeURIComponent( filmId )
					: detailBaseURL +
					  '&film-id=' +
					  encodeURIComponent( filmId );
			}

			const slide = document.createElement( 'div' );
			slide.className = 'poster-slide';
			slide.style.backgroundImage = "url('" + imageUrl + "')";
			const a = document.createElement( 'a' );
			a.href = linkHref;
			a.target = '_self';
			a.appendChild( slide );
			a.addEventListener( 'click', ( e ) => {
				e.stopPropagation();
			} );
			return a;
		};

		// Duplicate content for loop
		const duplicateContentForLoop = ( container ) => {
			const slides = Array.from( container.children );
			slides.forEach( ( s ) => {
				container.appendChild( s.cloneNode( true ) );
			} );
		};

		// Fetch and render
		const init = () => {
			const fetchData = () => {
				const params = new URLSearchParams();
				if ( yearRound ) {
					params.append( 'marquee', 'true' );
				}

				let path = `event_buckets/${ eventBucket }/films`;
				if ( params.toString() ) {
					path += `?${ params.toString() }`;
				}

				window.Eventive.request( {
					method: 'GET',
					path,
					authenticatePerson: false,
				} )
					.then( ( response ) => {
						const films = ( response && response.films ) || [];
						const filtered = filterByIncludeExclude(
							films,
							tag,
							exclude
						);

						const content = document.createElement( 'div' );
						content.className = 'marquee-content';
						const slideWidth = 210;

						filtered.slice( 0, number ).forEach( ( f ) => {
							const imageUrl = getImageUrlForFilm( f, useStills );
							content.appendChild(
								createPosterSlide( f.name, imageUrl, f.id )
							);
						} );

						let rendered = Array.from( content.children );
						let currentWidth = rendered.length * slideWidth;
						const containerWidth = marquee.offsetWidth;

						while ( currentWidth < containerWidth ) {
							rendered.forEach( ( slide ) => {
								content.appendChild( slide.cloneNode( true ) );
							} );
							rendered = Array.from( content.children );
							currentWidth = rendered.length * slideWidth;
						}

						duplicateContentForLoop( content );

						const totalWidth = content.children.length * slideWidth;
						content.style.width = totalWidth + 'px';

						const PX_PER_SECOND = 60,
							MIN_SEC = 20,
							MAX_SEC = 180;
						const durationSec = Math.max(
							MIN_SEC,
							Math.min(
								MAX_SEC,
								Math.round( totalWidth / PX_PER_SECOND )
							)
						);
						content.style.animationDuration = durationSec + 's';

						const captionSpeedAttr = (
							wrapper.getAttribute( 'data-caption-speed' ) ||
							'match'
						).toLowerCase();
						let captionDuration = durationSec;
						const asNumber = parseInt( captionSpeedAttr, 10 );
						if ( ! isNaN( asNumber ) && asNumber > 0 ) {
							captionDuration = asNumber;
						}
						if (
							captionTrack &&
							( captionTrack.textContent || '' ).trim().length
						) {
							captionTrack.style.animationDuration =
								captionDuration + 's';
							captionTrack.classList.add( 'caption-scroll' );
						}

						marquee.appendChild( content );
					} )
					.catch( ( error ) => {
						console.error(
							'[eventive-marquee] Error fetching marquee films:',
							error
						);
					} );
			};

			if ( window.Eventive && window.Eventive._ready ) {
				fetchData();
			} else if (
				window.Eventive &&
				typeof window.Eventive.on === 'function'
			) {
				window.Eventive.on( 'ready', fetchData );
			} else {
				setTimeout( () => {
					if (
						window.Eventive &&
						typeof window.Eventive.request === 'function'
					) {
						fetchData();
					} else {
						console.error(
							'[eventive-marquee] Eventive API not available'
						);
					}
				}, 1000 );
			}
		};

		init();
	} );
} );
