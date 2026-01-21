/**
 * Film Guide Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

/**
 * Helper functions
 * @param str
 */
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

/**
 * Initialize Film Guide blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const filmGuideBlocks = document.querySelectorAll(
		'.wp-block-eventive-film-guide'
	);

	filmGuideBlocks.forEach( ( block ) => {
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
		const includeTags = JSON.parse(
			block.getAttribute( 'data-include-tags' ) || '[]'
		);
		const excludeTags = JSON.parse(
			block.getAttribute( 'data-exclude-tags' ) || '[]'
		);
		const imageType =
			block.getAttribute( 'data-image-type' ) || 'poster_image';
		const viewMode = block.getAttribute( 'data-view' ) || 'grid';
		const showEvents = block.getAttribute( 'data-show-events' ) === 'true';
		const showDetails =
			block.getAttribute( 'data-show-details' ) === 'true';
		const showDescription =
			block.getAttribute( 'data-show-description' ) === 'true';
		const showTags = block.getAttribute( 'data-show-tags' ) === 'true';
		const yearRound = block.getAttribute( 'data-year-round' ) === 'true';
		const showSearch = block.getAttribute( 'data-show-search' ) === 'true';

		let activeTagFilter = '';
		let searchTerm = '';
		let allFilms = [];

		// Collect tags from films
		const collectTags = ( films ) => {
			const tagMap = new Map();
			films.forEach( ( film ) => {
				const tags = Array.isArray( film.tags ) ? film.tags : [];
				tags.forEach( ( t ) => {
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
		const renderTagsFilter = ( tags ) => {
			let filterEl = block.querySelector(
				'.eventive-film-guide-tags-filter'
			);
			if ( ! filterEl ) {
				filterEl = document.createElement( 'div' );
				filterEl.className = 'eventive-film-guide-tags-filter';
				block.insertBefore( filterEl, block.firstChild );
			}

			if ( ! tags.length ) {
				filterEl.innerHTML = '';
				return;
			}

			const allBtn = `<button class="eventive-tag-btn ${
				! activeTagFilter ? 'active' : ''
			}" data-tag-id="">All</button>`;
			const tagBtns = tags
				.map( ( tag ) => {
					const color = tag.color || '#ccc';
					const txtColor = textColor( color );
					const isActive = activeTagFilter === tag.id;
					return `<button class="eventive-tag-btn ${
						isActive ? 'active' : ''
					}" data-tag-id="${
						tag.id
					}" style="background-color:${ color };color:${ txtColor };">${
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
						renderFilms();
					} );
				} );
		};

		// Render search bar
		const renderSearch = () => {
			if ( ! showSearch ) {
				return;
			}

			let searchEl = block.querySelector( '.eventive-film-guide-search' );
			if ( ! searchEl ) {
				searchEl = document.createElement( 'div' );
				searchEl.className = 'eventive-film-guide-search';
				const filterEl = block.querySelector(
					'.eventive-film-guide-tags-filter'
				);
				if ( filterEl ) {
					filterEl.after( searchEl );
				} else {
					block.insertBefore( searchEl, block.firstChild );
				}
			}

			searchEl.innerHTML =
				'<input type="search" placeholder="Search films..." class="eventive-search-input" />';

			const input = searchEl.querySelector( '.eventive-search-input' );
			input.addEventListener( 'input', ( e ) => {
				searchTerm = e.target.value.toLowerCase();
				renderFilms();
			} );
		};

		// Filter films
		const filterFilms = ( films ) => {
			let filtered = [ ...films ];

			// Filter by include tags
			if ( includeTags.length ) {
				filtered = filtered.filter( ( film ) => {
					const filmTags = Array.isArray( film.tags )
						? film.tags
						: [];
					return filmTags.some( ( t ) =>
						includeTags.includes( String( t.id ) )
					);
				} );
			}

			// Filter by exclude tags
			if ( excludeTags.length ) {
				filtered = filtered.filter( ( film ) => {
					const filmTags = Array.isArray( film.tags )
						? film.tags
						: [];
					return ! filmTags.some( ( t ) =>
						excludeTags.includes( String( t.id ) )
					);
				} );
			}

			// Filter by active tag
			if ( activeTagFilter ) {
				filtered = filtered.filter( ( film ) => {
					const filmTags = Array.isArray( film.tags )
						? film.tags
						: [];
					return filmTags.some(
						( t ) => String( t.id ) === activeTagFilter
					);
				} );
			}

			// Filter by search term
			if ( searchTerm ) {
				filtered = filtered.filter( ( film ) => {
					const name = ( film.name || '' ).toLowerCase();
					const desc = (
						film.description ||
						film.short_description ||
						''
					).toLowerCase();
					return (
						name.includes( searchTerm ) ||
						desc.includes( searchTerm )
					);
				} );
			}

			// Sort by name
			filtered.sort( ( a, b ) =>
				( a.name || '' ).localeCompare( b.name || '' )
			);

			return filtered;
		};

		// Render films grid
		const renderFilmsGrid = ( films ) => {
			if ( ! films.length ) {
				return '<div class="eventive-no-films">No films found.</div>';
			}

			return `<div class="catalog-film-container grid">${ films
				.map( ( film ) => {
					const imageUrl =
						film[ imageType ] ||
						film.poster_image ||
						film.cover_image;
					const tagsHTML = showTags
						? ( film.tags || [] )
								.map(
									( tag ) =>
										`<span class="film-tag-pill" style="background-color:${
											tag.color || '#ccc'
										};color:${ textColor( tag.color ) };">${
											tag.name
										}</span>`
								)
								.join( '' )
						: '';

					return `
						<div class="film-card">
							${
								imageUrl
									? `<div class="film-card-image"><img src="${ imageUrl }" alt="${
											film.name || ''
									  }" /></div>`
									: ''
							}
							<div class="film-card-content">
								<h3 class="film-card-title">${ film.name || '' }</h3>
								${
									showDescription && film.short_description
										? `<p class="film-card-description">${ film.short_description }</p>`
										: ''
								}
								${ tagsHTML ? `<div class="film-card-tags">${ tagsHTML }</div>` : '' }
								${
									showDetails
										? `<div class="film-card-details">
									${
										film.credits?.director
											? `<div><strong>Director:</strong> ${ film.credits.director }</div>`
											: ''
									}
									${
										film.details?.runtime
											? `<div><strong>Runtime:</strong> ${ film.details.runtime } min</div>`
											: ''
									}
									${
										film.details?.year
											? `<div><strong>Year:</strong> ${ film.details.year }</div>`
											: ''
									}
								</div>`
										: ''
								}
							</div>
						</div>`;
				} )
				.join( '' ) }</div>`;
		};

		// Render films list
		const renderFilmsList = ( films ) => {
			if ( ! films.length ) {
				return '<div class="eventive-no-films">No films found.</div>';
			}

			return `<div class="catalog-film-container list">${ films
				.map( ( film ) => {
					const imageUrl =
						film[ imageType ] ||
						film.poster_image ||
						film.cover_image;
					const tagsHTML = showTags
						? ( film.tags || [] )
								.map(
									( tag ) =>
										`<span class="film-tag-pill" style="background-color:${
											tag.color || '#ccc'
										};color:${ textColor( tag.color ) };">${
											tag.name
										}</span>`
								)
								.join( '' )
						: '';

					return `
						<div class="film-list-item">
							${
								imageUrl
									? `<div class="film-list-image"><img src="${ imageUrl }" alt="${
											film.name || ''
									  }" /></div>`
									: ''
							}
							<div class="film-list-content">
								<h3 class="film-list-title">${ film.name || '' }</h3>
								${
									showDescription && film.description
										? `<div class="film-list-description">${ film.description }</div>`
										: ''
								}
								${ tagsHTML ? `<div class="film-list-tags">${ tagsHTML }</div>` : '' }
								${
									showDetails
										? `<div class="film-list-details">
									${
										film.credits?.director
											? `<div><strong>Director:</strong> ${ film.credits.director }</div>`
											: ''
									}
									${
										film.details?.runtime
											? `<div><strong>Runtime:</strong> ${ film.details.runtime } min</div>`
											: ''
									}
									${
										film.details?.year
											? `<div><strong>Year:</strong> ${ film.details.year }</div>`
											: ''
									}
								</div>`
										: ''
								}
							</div>
						</div>`;
				} )
				.join( '' ) }</div>`;
		};

		// Render films
		const renderFilms = () => {
			const filtered = filterFilms( allFilms );
			const tags = collectTags( filtered );

			renderTagsFilter( tags );
			renderSearch();

			let containerEl = block.querySelector(
				'.eventive-films-container'
			);
			if ( ! containerEl ) {
				containerEl = document.createElement( 'div' );
				containerEl.className = 'eventive-films-container';
				block.appendChild( containerEl );
			}

			containerEl.innerHTML =
				viewMode === 'list'
					? renderFilmsList( filtered )
					: renderFilmsGrid( filtered );
		};

		// Fetch and render
		const init = () => {
			const fetchData = () => {
				const params = new URLSearchParams();
				params.append( 'include', 'tags' );
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
						allFilms = ( response && response.films ) || [];
						renderFilms();
					} )
					.catch( ( error ) => {
						console.error(
							'[eventive-film-guide] Error fetching films:',
							error
						);
						block.innerHTML =
							'<div class="eventive-error">Error loading films.</div>';
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
							'[eventive-film-guide] Eventive API not available'
						);
						block.innerHTML =
							'<div class="eventive-error">Error loading films.</div>';
					}
				}, 1000 );
			}
		};

		init();
	} );
} );
