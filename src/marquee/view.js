/**
 * Marquee Block - Frontend View Script
 */

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

function initWrapperDecor( wrapper ) {
	const overlay = wrapper.querySelector( '.eventive-marquee-overlay' );
	const url = wrapper.getAttribute( 'data-overlay-url' ) || '';
	const op = parseFloat(
		wrapper.getAttribute( 'data-overlay-opacity' ) || '0.22'
	);
	if ( overlay ) {
		overlay.style.backgroundImage = url ? 'url(' + url + ')' : '';
		overlay.style.opacity = isNaN( op )
			? '0.22'
			: String( Math.max( 0, Math.min( 1, op ) ) );
	}
	const captionText = ( wrapper.getAttribute( 'data-caption' ) || '' ).trim();
	const track = wrapper.querySelector( '.eventive-marquee-caption-track' );
	if ( track ) {
		if ( captionText ) {
			const segment = ' • ' + captionText + ' ';
			let repeated = captionText;
			while ( repeated.length < 200 ) {
				repeated += segment;
			}
			track.textContent = repeated;
		} else {
			track.textContent = '';
		}
	}
}

function createPosterSlide(
	filmName,
	imageUrl,
	filmId,
	filmSyncEnabled,
	prettyPermalinks,
	detailBaseURL
) {
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
		linkHref = detailBaseURL.replace( /\/$/, '' ) + '/' + filmNameSlug;
	} else {
		linkHref = prettyPermalinks
			? detailBaseURL + '?film-id=' + encodeURIComponent( filmId )
			: detailBaseURL + '&film-id=' + encodeURIComponent( filmId );
	}

	const slide = document.createElement( 'div' );
	slide.className = 'poster-slide';
	slide.style.backgroundImage = "url('" + imageUrl + "')";
	const a = document.createElement( 'a' );
	a.href = linkHref;
	a.target = '_self';
	a.appendChild( slide );
	a.addEventListener( 'click', function ( e ) {
		e.stopPropagation();
	} );
	return a;
}

function duplicateContentForLoop( container ) {
	const slides = Array.from( container.children );
	slides.forEach( function ( s ) {
		container.appendChild( s.cloneNode( true ) );
	} );
}

function initOneWrapper( wrapper ) {
	if ( wrapper.__evtMarqueeInited ) {
		return;
	}
	wrapper.__evtMarqueeInited = true;

	initWrapperDecor( wrapper );

	// Get configuration from window or data attributes
	const eventBucket = window.EventiveBlockData?.eventBucket || '';
	const filmSyncEnabled = window.EventiveBlockData?.filmSyncEnabled || false;
	const prettyPermalinks =
		window.EventiveBlockData?.prettyPermalinks || false;
	const detailBaseURL = window.EventiveBlockData?.filmDetailUrl || '';

	const marquee = wrapper.querySelector( '.eventive-marquee' );
	if ( ! marquee ) {
		return;
	}

	// Get attributes from block wrapper (not nested marquee element)
	const tag = wrapper.getAttribute( 'data-tag' ) || '';
	const number = Math.min(
		parseInt( wrapper.getAttribute( 'data-number' ), 10 ) || 5,
		50
	);
	const rawStills = (
		wrapper.getAttribute( 'data-stills' ) || ''
	).toLowerCase();
	const useStills =
		rawStills === 'true' || rawStills === '1' || rawStills === 'yes';
	const yearRound = wrapper.getAttribute( 'data-year-round' ) === 'true';
	const exclude = wrapper.getAttribute( 'data-exclude' ) || '';

	function run() {
		const qs = yearRound ? '?marquee=true' : '';
		window.Eventive.request( {
			method: 'GET',
			path:
				'event_buckets/' +
				encodeURIComponent( eventBucket ) +
				'/films' +
				qs,
			authenticatePerson: false,
		} )
			.then( function ( res ) {
				if ( ! res || ! res.films ) {
					return;
				}
				const filtered = filterByIncludeExclude(
					res.films,
					tag,
					exclude
				);
				const content = document.createElement( 'div' );
				content.className = 'marquee-content';
				const slideWidth = 210;
				filtered.slice( 0, number ).forEach( function ( f ) {
					const imageUrl = getImageUrlForFilm( f, useStills );
					content.appendChild(
						createPosterSlide(
							f.name,
							imageUrl,
							f.id,
							filmSyncEnabled,
							prettyPermalinks,
							detailBaseURL
						)
					);
				} );
				let rendered = Array.from( content.children );
				let currentWidth = rendered.length * slideWidth;
				const containerWidth = marquee.offsetWidth;
				while ( currentWidth < containerWidth ) {
					rendered.forEach( function ( slide ) {
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
				const track = wrapper.querySelector(
					'.eventive-marquee-caption-track'
				);
				const speedAttr = (
					wrapper.getAttribute( 'data-caption-speed' ) || 'match'
				).toLowerCase();
				let captionDuration = durationSec;
				const asNumber = parseInt( speedAttr, 10 );
				if ( ! isNaN( asNumber ) && asNumber > 0 ) {
					captionDuration = asNumber;
				}
				if ( track && ( track.textContent || '' ).trim().length ) {
					track.style.animationDuration = captionDuration + 's';
					track.classList.add( 'caption-scroll' );
				}
				marquee.appendChild( content );
			} )
			.catch( function ( err ) {
				console.error( '[eventive-marquee] fetch error', err );
			} );
	}

	let hasRun = false;

	const guardedRun = function () {
		if ( hasRun ) {
			return;
		}
		hasRun = true;

		// Clean up listener
		if ( window.Eventive && window.Eventive.off ) {
			window.Eventive.off( 'ready', guardedRun );
		}

		run();
	};

	if ( window.Eventive && typeof window.Eventive.ready === 'function' ) {
		window.Eventive.ready( guardedRun );
	} else if (
		window.Eventive &&
		window.Eventive.on &&
		typeof window.Eventive.on === 'function'
	) {
		try {
			window.Eventive.on( 'ready', guardedRun );
		} catch ( _ ) {
			guardedRun();
		}
	} else {
		// Poll until Eventive.request exists
		let tries = 0;
		( function poll() {
			if (
				window.Eventive &&
				typeof window.Eventive.request === 'function'
			) {
				guardedRun();
				return;
			}
			if ( ++tries > 60 ) {
				guardedRun();
				return;
			}
			setTimeout( poll, 50 );
		} )();
	}
}

function boot() {
	document
		.querySelectorAll( '.wp-block-eventive-marquee' )
		.forEach( initOneWrapper );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', boot, { once: true } );
} else {
	boot();
}

// Elementor live preview support
if ( window.jQuery && window.elementorFrontend ) {
	window.jQuery( window ).on( 'elementor/frontend/init', function () {
		try {
			window.elementorFrontend.hooks.addAction(
				'frontend/element_ready/shortcode.default',
				function ( scope ) {
					if ( scope && scope[ 0 ] ) {
						const wraps = scope[ 0 ].querySelectorAll(
							'.wp-block-eventive-marquee'
						);
						wraps && wraps.forEach( initOneWrapper );
					}
				}
			);
		} catch ( _ ) {}
	} );
}
