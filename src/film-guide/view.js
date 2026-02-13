/**
 * Film Guide Block - Frontend View Script
 */

// Utility functions
function debounce( fn, wait ) {
	let t;
	return function () {
		const args = arguments,
			ctx = this;
		clearTimeout( t );
		t = setTimeout( function () {
			fn.apply( ctx, args );
		}, wait );
	};
}

function lower( v ) {
	return v == null ? '' : String( v ).toLowerCase();
}

function esc( v ) {
	return v == null ? '' : String( v );
}

function slugify( str ) {
	if ( ! str ) {
		return '';
	}
	return String( str )
		.normalize( 'NFD' )
		.replace( /[\u0300-\u036f]/g, '' )
		.toLowerCase()
		.replace( /[^a-z0-9\s-]/g, '' )
		.replace( /\s+/g, '-' )
		.replace( /-+/g, '-' )
		.replace( /^-|-$/g, '' );
}

function textColor( bg ) {
	if ( ! bg ) {
		return '#000';
	}
	let hex = bg.replace( '#', '' );
	if ( hex.length === 3 ) {
		hex = hex
			.split( '' )
			.map( ( c ) => c + c )
			.join( '' );
	}
	const r = parseInt( hex.substr( 0, 2 ), 16 ) || 0,
		g = parseInt( hex.substr( 2, 2 ), 16 ) || 0,
		b = parseInt( hex.substr( 4, 2 ), 16 ) || 0;
	return ( r * 299 + g * 587 + b * 114 ) / 1000 > 128 ? '#000' : '#fff';
}

function normalizeImageType( v ) {
	const s = ( v || '' ).toString().toLowerCase();
	if ( s === 'poster' || s === 'poster-image' || s === 'poster_image' ) {
		return 'poster_image';
	}
	if ( s === 'cover' || s === 'cover-image' || s === 'cover_image' ) {
		return 'cover_image';
	}
	if ( s === 'still' || s === 'still-image' || s === 'still_image' ) {
		return 'still_image';
	}
	return s;
}

// URL helpers
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
	} catch ( _ ) {}
}

// Film cache
window.__Eventive_FilmCache = window.__Eventive_FilmCache || {};
function fetchFilmsOnce( bucket, yearRound ) {
	const key = bucket + '::' + ( yearRound ? 'marquee' : 'all' );
	const C = window.__Eventive_FilmCache;
	if ( C[ key ] ) {
		return Promise.resolve( C[ key ] );
	}
	if ( ! window.Eventive ) {
		return Promise.reject( new Error( 'Eventive not ready' ) );
	}
	const opts = {
		method: 'GET',
		path: 'event_buckets/' + encodeURIComponent( bucket ) + '/films',
		qs: { include: 'tags' },
		authenticatePerson: false,
	};
	if ( yearRound ) {
		opts.qs.marquee = true;
	}
	return window.Eventive.request( opts ).then( function ( res ) {
		const list = ( res && res.films ) || [];
		C[ key ] = list;
		return list;
	} );
}

function buildTagSets( list ) {
	const ids = new Set(),
		names = new Set();
	( list || [] ).forEach( function ( v ) {
		if ( v == null ) {
			return;
		}
		const s = String( v ).trim();
		if ( ! s ) {
			return;
		}
		ids.add( s );
		names.add( s.toLowerCase() );
	} );
	return { ids, names };
}

function filmHasAnyTag( film, idsSet, namesSet, candidate ) {
	const tags = film.tags || [];
	if ( ! tags.length ) {
		return false;
	}
	const cand = candidate ? String( candidate ).trim().toLowerCase() : null;
	for ( let i = 0; i < tags.length; i++ ) {
		const t = tags[ i ];
		const tid = t && t.id != null ? String( t.id ) : '';
		const tname = t && t.name != null ? String( t.name ).toLowerCase() : '';
		if ( cand && ! ( tid === candidate || tname === cand ) ) {
			continue;
		}
		if ( idsSet.has( tid ) || namesSet.has( tname ) ) {
			return true;
		}
	}
	return false;
}

function preprocess( list ) {
	return ( list || [] ).map( function ( f ) {
		if ( ! f ) {
			return f;
		}
		const d = String( f.description || f.short_description || '' );
		let creditsText = '';
		if ( f.credits && typeof f.credits === 'object' ) {
			try {
				creditsText = Object.values( f.credits ).flat().join( ' ' );
			} catch ( _ ) {
				creditsText = Object.values( f.credits ).join( ' ' );
			}
		}
		return Object.assign( {}, f, {
			_lc_name: lower( f.name ),
			_lc_desc: lower( d ),
			_lc_credits: lower( creditsText ),
		} );
	} );
}

/**
 * Initialize Film Guide blocks on page load
 * @param block
 */
function initInstance( block ) {
	// Prevent double initialization
	if ( ! block || block.__efgInited ) {
		return;
	}
	block.__efgInited = true;

	// Assign unique ID if missing
	if ( ! block.id ) {
		block.id = 'efg-' + Math.random().toString( 36 ).slice( 2 );
	}

	// Get configuration from window
	const bucket = window.EventiveBlockData?.eventBucket || '';
	const filmSyncEnabled = window.EventiveBlockData?.filmSyncEnabled || false;
	const prettyPermalinks =
		window.EventiveBlockData?.prettyPermalinks || false;
	const detailBaseURL = window.EventiveBlockData?.filmDetailUrl || '';

	// Parse attributes from data-* on block wrapper
	let includeTags = [];
	try {
		const tagNameAttr = block.getAttribute( 'data-tag-name' ) || '';
		includeTags = tagNameAttr
			.split( ',' )
			.map( ( s ) => s.trim() )
			.filter( Boolean );
	} catch ( e ) {}

	let excludeTags = [];
	try {
		const excludeAttr = block.getAttribute( 'data-exclude-tag' ) || '';
		excludeTags = excludeAttr
			.split( ',' )
			.map( ( s ) => s.trim() )
			.filter( Boolean );
	} catch ( e ) {}

	const specificFilmId = block.getAttribute( 'data-film-id' ) || '';
	let imageType = block.getAttribute( 'data-image' ) || 'poster';
	imageType = normalizeImageType( imageType );
	let view = block.getAttribute( 'data-view' ) || 'grid';
	const showEvents = block.getAttribute( 'data-show-events' ) === 'true';
	const showDetails = block.getAttribute( 'data-show-details' ) === 'true';
	const showDescription =
		block.getAttribute( 'data-show-description' ) === 'true';
	const showTags = block.getAttribute( 'data-show-tags' ) === 'true';
	const yearRound = block.getAttribute( 'data-year-round' ) === 'true';
	const showSearch = block.getAttribute( 'data-search' ) === 'true';
	const showFilter = block.getAttribute( 'data-show-filter' ) === 'true';
	const showViewSwitcher =
		block.getAttribute( 'data-show-view-switcher' ) === 'true';

	// Get or create container elements
	let tagsWrap = block.querySelector( '.eventive-film-guide-tags-filter' );
	if ( showFilter && ! tagsWrap ) {
		tagsWrap = document.createElement( 'div' );
		tagsWrap.className = 'eventive-film-guide-tags-filter';
		block.insertBefore( tagsWrap, block.firstChild );
	}

	let searchWrap = block.querySelector( '.eventive-film-guide-search' );
	if ( showSearch && ! searchWrap ) {
		searchWrap = document.createElement( 'div' );
		searchWrap.className = 'eventive-film-guide-search';
		const input = document.createElement( 'input' );
		input.type = 'search';
		input.placeholder = 'Search films (title, cast, crew)…';
		input.className = 'eventive-search-input';
		searchWrap.appendChild( input );
		if ( tagsWrap ) {
			tagsWrap.after( searchWrap );
		} else {
			block.insertBefore( searchWrap, block.firstChild );
		}
	}

	let controlsWrap = block.querySelector( '.eventive-film-guide-controls' );
	if ( showViewSwitcher && ! controlsWrap ) {
		controlsWrap = document.createElement( 'div' );
		controlsWrap.className = 'eventive-film-guide-controls';
		controlsWrap.innerHTML = `
			<label>
				View:
				<select class="view-selector">
					<option value="grid" ${ view === 'grid' ? 'selected' : '' }>Grid</option>
					<option value="list" ${ view === 'list' ? 'selected' : '' }>List</option>
				</select>
			</label>
			<label>
				Image:
				<select class="image-selector">
					<option value="poster_image" ${
						imageType === 'poster_image' ? 'selected' : ''
					}>Poster</option>
					<option value="cover_image" ${
						imageType === 'cover_image' ? 'selected' : ''
					}>Cover</option>
					<option value="still_image" ${
						imageType === 'still_image' ? 'selected' : ''
					}>Still</option>
				</select>
			</label>
		`;
		if ( searchWrap ) {
			searchWrap.after( controlsWrap );
		} else if ( tagsWrap ) {
			tagsWrap.after( controlsWrap );
		} else {
			block.insertBefore( controlsWrap, block.firstChild );
		}
	}

	let containerEl = block.querySelector( '.eventive-film-guide-container' );
	if ( ! containerEl ) {
		containerEl = document.createElement( 'div' );
		containerEl.className = 'eventive-film-guide-container';
		block.appendChild( containerEl );
	}

	// Clear any placeholder loading text from save.js
	const loadingText = containerEl.querySelector(
		'.eventive-film-loading-text'
	);
	if ( loadingText ) {
		loadingText.remove();
	}

	// Create grid and list containers
	let grid = containerEl.querySelector( '.catalog-film-container.grid' );
	let list = containerEl.querySelector( '.catalog-film-container.list' );
	if ( ! grid ) {
		grid = document.createElement( 'div' );
		grid.className = 'catalog-film-container grid';
		containerEl.appendChild( grid );
	}
	if ( ! list ) {
		list = document.createElement( 'div' );
		list.className = 'catalog-film-container list';
		containerEl.appendChild( list );
	}

	// Set initial display
	grid.style.display = view === 'grid' ? 'grid' : 'none';
	list.style.display = view === 'list' ? 'block' : 'none';

	// State
	const urlParams = new URLSearchParams( window.location.search );
	let activeTag = urlParams.get( 'tag-id' ) || '';
	let searchTerm = '';
	let films = [];

	const inc = buildTagSets( includeTags );
	const exc = buildTagSets( excludeTags );

	let renderScheduled = false;
	function scheduleRender() {
		if ( renderScheduled ) {
			return;
		}
		renderScheduled = true;
		requestAnimationFrame( function () {
			renderScheduled = false;
			renderNow();
		} );
	}

	// Event listeners
	if ( controlsWrap ) {
		const viewSel = controlsWrap.querySelector( '.view-selector' );
		const imgSel = controlsWrap.querySelector( '.image-selector' );
		if ( viewSel ) {
			viewSel.addEventListener( 'change', function ( e ) {
				view = e.target.value;
				grid.style.display = view === 'grid' ? 'grid' : 'none';
				list.style.display = view === 'list' ? 'block' : 'none';
				scheduleRender();
			} );
		}
		if ( imgSel ) {
			imgSel.addEventListener( 'change', function ( e ) {
				imageType = normalizeImageType( e.target.value );
				scheduleRender();
			} );
		}
	}

	if ( searchWrap ) {
		const searchInput = searchWrap.querySelector(
			'.eventive-search-input'
		);
		if ( searchInput ) {
			const apply = debounce( function () {
				searchTerm = ( searchInput.value || '' ).trim().toLowerCase();
				scheduleRender();
			}, 150 );
			searchInput.addEventListener( 'input', apply );
			searchInput.addEventListener( 'change', apply );
			searchInput.addEventListener( 'keydown', function ( ev ) {
				if ( ev.key === 'Enter' ) {
					ev.preventDefault();
					apply();
				}
			} );
		}
	}

	// Global tag selection event
	document.addEventListener( 'eventive:setActiveTag', function ( ev ) {
		try {
			const tid =
				ev &&
				ev.detail &&
				( ev.detail.tagId !== undefined ? ev.detail.tagId : ev.detail );
			if ( tid === undefined ) {
				return;
			}
			activeTag = String( tid || '' );
			setURLTagParam( activeTag, 'replace' );
			highlightActiveTag();
			scheduleRender();
		} catch ( _ ) {}
	} );

	// Tag button clicks
	if ( tagsWrap ) {
		tagsWrap.addEventListener(
			'click',
			function ( ev ) {
				const btn =
					ev.target && ev.target.closest
						? ev.target.closest( '.eventive-tag-btn' )
						: null;
				if ( ! btn ) {
					return;
				}
				ev.preventDefault();
				ev.stopPropagation();
				const tid = btn.getAttribute( 'data-tag-id' ) || '';
				activeTag = String( tid );
				setURLTagParam( activeTag, 'replace' );
				highlightActiveTag();
				scheduleRender();
			},
			true
		);
	}

	// Back/forward navigation
	window.addEventListener( 'popstate', function () {
		try {
			const v =
				new URL( window.location.href ).searchParams.get( 'tag-id' ) ||
				'';
			activeTag = v;
			highlightActiveTag();
			scheduleRender();
		} catch ( _ ) {}
	} );

	function collectAvailableTagsFromFilms( list ) {
		const map = new Map();
		( list || [] ).forEach( function ( f ) {
			const tags = Array.isArray( f.tags ) ? f.tags : [];
			tags.forEach( function ( t ) {
				if ( ! t ) {
					return;
				}
				const id = t.id != null ? String( t.id ) : '';
				const name =
					t.name || t.title || t.label || ( id ? '#' + id : '' );
				if ( ! id && ! name ) {
					return;
				}
				const cur = map.get( id || name ) || {
					id,
					name,
					color: t.color || '#e0e0e0',
					count: 0,
				};
				cur.count += 1;
				map.set( id || name, cur );
			} );
		} );
		return Array.from( map.values() );
	}

	function renderTagPillsFromFilms( list ) {
		if ( ! tagsWrap ) {
			return;
		}
		let baseFiltered = list.slice();
		if ( ! specificFilmId && ( inc.ids.size || inc.names.size ) ) {
			baseFiltered = baseFiltered.filter( function ( f ) {
				return filmHasAnyTag( f, inc.ids, inc.names );
			} );
		}
		if ( exc.ids.size || exc.names.size ) {
			baseFiltered = baseFiltered.filter( function ( f ) {
				return ! filmHasAnyTag( f, exc.ids, exc.names );
			} );
		}
		const tags = collectAvailableTagsFromFilms( baseFiltered );
		if ( ! tags.length ) {
			tagsWrap.innerHTML = '';
			return;
		}

		const resetUrl = ( function () {
			try {
				const u = new URL( window.location.href );
				u.searchParams.delete( 'tag-id' );
				return u.toString();
			} catch ( _ ) {
				return '#';
			}
		} )();

		let html = '';
		html += '<div class="eventive-tags-list">';
		html += '<button class="eventive-tag-btn" data-tag-id="">All</button>';
		tags.sort( function ( a, b ) {
			return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
		} );
		html += tags
			.map( function ( t ) {
				const fg = textColor( t.color || '#e0e0e0' );
				return (
					'<button class="eventive-tag-btn" style="background-color:' +
					esc( t.color || '#e0e0e0' ) +
					';color:' +
					fg +
					'" data-tag-id="' +
					esc( t.id || t.name ) +
					'">' +
					esc( t.name ) +
					'</button>'
				);
			} )
			.join( '' );
		html += '</div>';
		tagsWrap.innerHTML = html;
		highlightActiveTag();
	}

	function highlightActiveTag() {
		if ( ! tagsWrap ) {
			return;
		}
		try {
			const buttons = tagsWrap.querySelectorAll( '.eventive-tag-btn' );
			buttons.forEach( function ( btn ) {
				btn.classList.remove( 'active' );
			} );
			buttons.forEach( function ( btn ) {
				const id = btn.getAttribute( 'data-tag-id' );
				if ( ! activeTag ) {
					if ( ! id ) {
						btn.classList.add( 'active' );
					}
				} else if ( id === activeTag ) {
					btn.classList.add( 'active' );
				}
			} );
		} catch ( _ ) {}
	}

	function renderNow() {
		let filtered = films.slice();
		if ( specificFilmId ) {
			filtered = filtered.filter( function ( f ) {
				return String( f.id ) === String( specificFilmId );
			} );
		}
		if ( ! specificFilmId && ( inc.ids.size || inc.names.size ) ) {
			filtered = filtered.filter( function ( f ) {
				return filmHasAnyTag( f, inc.ids, inc.names );
			} );
		}
		if ( ! specificFilmId && activeTag ) {
			const at = String( activeTag ).trim();
			filtered = filtered.filter( function ( f ) {
				return filmHasAnyTag(
					f,
					new Set( [ at ] ),
					new Set( [ at.toLowerCase() ] )
				);
			} );
		}
		if ( exc.ids.size || exc.names.size ) {
			filtered = filtered.filter( function ( f ) {
				return ! filmHasAnyTag( f, exc.ids, exc.names );
			} );
		}
		if ( searchTerm ) {
			filtered = filtered.filter( function ( f ) {
				return (
					f._lc_name.indexOf( searchTerm ) > -1 ||
					f._lc_desc.indexOf( searchTerm ) > -1 ||
					f._lc_credits.indexOf( searchTerm ) > -1
				);
			} );
		}
		filtered.sort( function ( a, b ) {
			const A = ( a.name || '' ).toLowerCase(),
				B = ( b.name || '' ).toLowerCase();
			return A < B ? -1 : A > B ? 1 : 0;
		} );

		const target = view === 'list' ? list || grid : grid || list;
		if ( ! target ) {
			return;
		}
		if ( ! filtered.length ) {
			target.innerHTML =
				'<p class="no-events">No films found for the selected criteria.</p>';
			return;
		}

		target.innerHTML = '';
		let i = 0,
			batch = 20;
		function renderChunk() {
			const frag = document.createDocumentFragment();
			const end = Math.min( i + batch, filtered.length );
			for ( ; i < end; i++ ) {
				const f = filtered[ i ];
				const runtime = showDetails
					? ( f.details && f.details.runtime ) || 'N/A'
					: null;
				const director = showDetails
					? ( f.credits && f.credits.director ) || 'Unknown'
					: null;
				const year = showDetails
					? ( f.details && f.details.year ) || 'N/A'
					: null;
				const language = showDetails
					? ( f.details && f.details.language ) || 'N/A'
					: null;
				const imgKey = normalizeImageType( imageType );
				const placeholderUrl =
					( window.EventiveBlockData?.pluginUrl || '' ) +
					'assets/images/default-placeholder.svg';
				const imageSrc =
					f[ imgKey ] || f[ imageType ] || placeholderUrl;
				const shortDesc = f.short_description || '';
				const slug = slugify( f.name );
				let filmLink = '';
				if ( filmSyncEnabled ) {
					filmLink =
						esc( detailBaseURL ).replace( /\/$/, '' ) + '/' + slug;
				} else {
					filmLink = prettyPermalinks
						? detailBaseURL +
						  '?film-id=' +
						  encodeURIComponent( f.id )
						: detailBaseURL +
						  '&film-id=' +
						  encodeURIComponent( f.id );
				}

				let tagsHTML = '';
				const filmTagsArr = Array.isArray( f.tags ) ? f.tags : [];
				if ( showTags && filmTagsArr && filmTagsArr.length ) {
					const tagMap = new Map();
					filmTagsArr.forEach( function ( t ) {
						if ( ! t ) {
							return;
						}
						const id = t.id != null ? String( t.id ) : '';
						const name = t.name || t.title || id;
						if ( ! name ) {
							return;
						}
						tagMap.set( id || name, t );
					} );
					tagsHTML =
						'<div class="eventive-tag-pills">' +
						Array.from( tagMap.values() )
							.map( function ( t ) {
								const fg = textColor( t.color || '#e0e0e0' );
								return (
									'<span class="eventive-tag-pill" style="background-color:' +
									esc( t.color || '#e0e0e0' ) +
									';color:' +
									fg +
									'" data-tag-id="' +
									esc( t.id || t.name ) +
									'">' +
									esc( t.name ) +
									'</span>'
								);
							} )
							.join( '' ) +
						'</div>';
				}

				const el = document.createElement( 'div' );
				if ( view === 'list' ) {
					el.className = 'eventive-card eventive-card--horizontal';
					el.innerHTML =
						'<a href="' +
						filmLink +
						'"><img class="eventive-card-image" loading="lazy" decoding="async" src="' +
						imageSrc +
						'" alt="' +
						( f.name || 'Film' ) +
						'"/></a>' +
						'<div class="eventive-card-content">' +
						'<h2 class="eventive-card-title">' +
						( f.name || '' ) +
						'</h2>' +
						tagsHTML +
						'<span class="eventive-card-description">' +
						( showDetails
							? 'Directed by: ' +
							  director +
							  '<br />' +
							  ( runtime + ' min | ' + year + ' | ' + language )
							: '' ) +
						'</span>' +
						( showDescription && shortDesc
							? '<div class="eventive-card-description">' +
							  shortDesc +
							  '</div>'
							: '' ) +
						( showEvents
							? '<div class="eventive-card-link"><a href="' +
							  filmLink +
							  '">Details & Showtimes</a></div>'
							: '' ) +
						'</div>';
				} else {
					el.className = 'eventive-card';
					el.setAttribute( 'role', 'article' );
					el.innerHTML =
						'<a href="' +
						filmLink +
						'"><img class="eventive-card-image" loading="lazy" decoding="async" src="' +
						imageSrc +
						'" alt="' +
						( f.name || 'Film' ) +
						'"/></a>' +
						'<div class="eventive-card-content">' +
						'<h3 class="eventive-card-title">' +
						( f.name || '' ) +
						'</h3>' +
						tagsHTML +
						( showDetails
							? '<span class="eventive-card-description">' +
							  director +
							  '<br />' +
							  ( runtime +
									' min | ' +
									year +
									' | ' +
									language ) +
							  '</span>'
							: '' ) +
						( showDescription && shortDesc
							? '<div class="eventive-card-description">' +
							  shortDesc +
							  '</div>'
							: '' ) +
						( showEvents
							? '<div class="eventive-card-link"><a href="' +
							  filmLink +
							  '">Details & Showtimes</a></div>'
							: '' ) +
						'</div>';
				}
				frag.appendChild( el );
			}
			target.appendChild( frag );
			if ( i < filtered.length ) {
				requestAnimationFrame( renderChunk );
			}
		}
		requestAnimationFrame( renderChunk );
	}

	function boot() {
		if ( ! window.Eventive ) {
			const t = view === 'list' ? list : grid;
			if ( t ) {
				t.innerHTML =
					'<p class="error-message">Eventive API is not available.</p>';
			}
			return;
		}
		const run = function () {
			fetchFilmsOnce( bucket, yearRound )
				.then( function ( all ) {
					films = preprocess( all );
					renderTagPillsFromFilms( films );
					scheduleRender();
				} )
				.catch( function () {
					const t = view === 'list' ? list : grid;
					if ( t ) {
						t.innerHTML =
							'<p class="error-message">Failed to load films.</p>';
					}
				} );
		};

		let attached = false;
		try {
			if (
				window.Eventive &&
				typeof window.Eventive.ready === 'function'
			) {
				window.Eventive.ready( run );
				attached = true;
			}
		} catch ( _ ) {}
		if ( ! attached ) {
			try {
				if (
					window.Eventive &&
					window.Eventive.on &&
					typeof window.Eventive.on === 'function'
				) {
					window.Eventive.on( 'ready', run );
					attached = true;
				}
			} catch ( _ ) {}
		}
		if ( ! attached ) {
			let tries = 0;
			( function poll() {
				if (
					window.Eventive &&
					typeof window.Eventive.request === 'function'
				) {
					run();
					return;
				}
				if ( ++tries > 60 ) {
					run();
					return;
				}
				setTimeout( poll, 50 );
			} )();
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot, { once: true } );
	} else {
		boot();
	}
}

function autoInit() {
	const candidates = document.querySelectorAll(
		'.wp-block-eventive-film-guide'
	);
	if ( ! candidates || ! candidates.length ) {
		return;
	}
	candidates.forEach( function ( node ) {
		if ( ! node.getAttribute ) {
			return;
		}
		const parentGuide =
			node.parentElement &&
			node.parentElement.closest &&
			node.parentElement.closest( '.wp-block-eventive-film-guide' );
		if ( parentGuide && parentGuide !== node ) {
			return;
		}
		initInstance( node );
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', autoInit, { once: true } );
} else {
	autoInit();
}

// Elementor support
if ( window.jQuery && window.elementorFrontend ) {
	window.jQuery( window ).on( 'elementor/frontend/init', function () {
		try {
			window.elementorFrontend.hooks.addAction(
				'frontend/element_ready/shortcode.default',
				function ( scope ) {
					if ( scope && scope[ 0 ] ) {
						const wraps = scope[ 0 ].querySelectorAll(
							'.wp-block-eventive-film-guide'
						);
						if ( wraps && wraps.length ) {
							wraps.forEach( initInstance );
						}
					}
				}
			);
		} catch ( _ ) {}
	} );
}
