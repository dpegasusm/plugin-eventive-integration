/**
 * Eventive Tags Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot, useState, useEffect, useMemo } from '@wordpress/element';

/**
 * Get text color based on background brightness
 *
 * @param {string} bgColor Background color hex
 * @return {string} Black or white color
 */
function getTextColor( bgColor ) {
	const hex = bgColor.replace( '#', '' );
	if ( hex.length === 6 ) {
		const r = parseInt( hex.substr( 0, 2 ), 16 );
		const g = parseInt( hex.substr( 2, 2 ), 16 );
		const b = parseInt( hex.substr( 4, 2 ), 16 );
		const brightness = ( r * 299 + g * 587 + b * 114 ) / 1000;
		return brightness > 150 ? '#000000' : '#ffffff';
	}
	return '#000000';
}

/**
 * Normalize tag name for comparison
 *
 * @param {string} name Tag name
 * @return {string} Normalized name
 */
function normalizeTagName( name ) {
	let normalized = name.toLowerCase();
	normalized = normalized.replace( /&/g, ' and ' );
	normalized = normalized.replace( /[^a-z0-9]+/g, ' ' );
	normalized = normalized.trim().replace( /\s+/g, ' ' );
	return normalized;
}

/**
 * Build exclusion sets from comma-separated string
 *
 * @param {string} raw Comma-separated exclusion list
 * @return {Object} Sets for IDs, names, and slugs
 */
function buildExcludeSets( raw ) {
	const ids = {};
	const names = {};
	const slugs = {};

	if ( ! raw || typeof raw !== 'string' ) {
		return { ids, names, slugs };
	}

	const parts = raw
		.split( ',' )
		.map( ( p ) => p.trim() )
		.filter( ( p ) => p );

	for ( const part of parts ) {
		ids[ part ] = true;
		names[ part.toLowerCase() ] = true;
		slugs[ normalizeTagName( part ) ] = true;
	}

	return { ids, names, slugs };
}

/**
 * Collect tag IDs from nested data structure
 *
 * @param {Object|Array} data Data to search
 * @return {Object} Set of tag IDs
 */
function collectTagIds( data ) {
	const ids = {};
	const stack = [ data ];

	while ( stack.length > 0 ) {
		const node = stack.pop();

		if ( Array.isArray( node ) ) {
			node.forEach( ( item ) => {
				if ( typeof item === 'object' && item !== null ) {
					stack.push( item );
				}
			} );
		} else if ( typeof node === 'object' && node !== null ) {
			if ( node.tags && Array.isArray( node.tags ) ) {
				node.tags.forEach( ( tag ) => {
					if ( tag && tag.id ) {
						ids[ String( tag.id ) ] = true;
					}
				} );
			}
			Object.values( node ).forEach( ( value ) => {
				if ( typeof value === 'object' && value !== null ) {
					stack.push( value );
				}
			} );
		}
	}

	return ids;
}

/**
 * Tag Pill Component
 *
 * @param {Object} props          Component props
 * @param          props.tag
 * @param          props.isActive
 * @param          props.onClick
 * @param          props.resetUrl
 * @return {JSX.Element} Tag pill
 */
const TagPill = ( { tag, isActive, onClick, resetUrl } ) => {
	const textColor = getTextColor( tag.color );
	const activeClass = isActive ? 'is-active' : '';

	const handleClick = ( e ) => {
		e.preventDefault();
		onClick( tag.id );
	};

	return (
		<span
			className={ `tag-label ${ activeClass }` }
			style={ {
				backgroundColor: tag.color,
				color: textColor,
			} }
		>
			<a
				href={
					tag.id
						? `${ resetUrl }${
								resetUrl.includes( '?' ) ? '&' : '?'
						  }tag-id=${ tag.id }`
						: resetUrl
				}
				className="external-tag-filter"
				data-tag-id={ tag.id || '' }
				style={ { color: textColor } }
				onClick={ handleClick }
			>
				{ tag.name }
			</a>
		</span>
	);
};

/**
 * Tags Container Component
 *
 * @param {Object} props             Component props
 * @param          props.view
 * @param          props.display
 * @param          props.hideEmpty
 * @param          props.excludeTags
 * @return {JSX.Element} Tags container
 */
const TagsContainer = ( { view, display, hideEmpty, excludeTags } ) => {
	const [ tags, setTags ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const [ selectedTagId, setSelectedTagId ] = useState( '' );
	const [ allowedTagIds, setAllowedTagIds ] = useState( null );

	// Get current URL params
	useEffect( () => {
		const urlParams = new URLSearchParams( window.location.search );
		const tagId = urlParams.get( 'tag-id' ) || '';
		setSelectedTagId( tagId );
	}, [] );

	// Build reset URL
	const resetUrl = useMemo( () => {
		const url = new URL( window.location.href );
		const clearKeys = [
			'tag-id',
			'tag',
			'include-tags',
			'exclude-tags',
			'film-id',
			'event-id',
			'view',
			'image',
			'show-events',
			'show-details',
			'show-tags',
			'year-round',
			'search',
			'q',
			'page',
		];
		clearKeys.forEach( ( key ) => url.searchParams.delete( key ) );
		return url.toString();
	}, [] );

	useEffect( () => {
		const loadTags = () => {
			// Get event bucket from localized data
			const eventBucket = window.EventiveBlockData?.eventBucket || '';

			if ( ! eventBucket ) {
				setError( 'Event bucket not configured.' );
				setLoading( false );
				return;
			}

			// Fetch tags from Eventive API
			window.Eventive.request( {
				method: 'GET',
				path: `event_buckets/${ eventBucket }/tags`,
				authenticatePerson: false,
			} )
				.then( ( tagsData ) => {
					const tagsList = tagsData?.tags || [];

					// If display is limited to films or events, fetch and filter
					if ( display === 'films' ) {
						return window.Eventive.request( {
							method: 'GET',
							path: `event_buckets/${ eventBucket }/films`,
							authenticatePerson: false,
						} )
							.then( ( filmsData ) => {
								const allowed = collectTagIds( filmsData );
								setAllowedTagIds( allowed );
								setTags( tagsList );
								setLoading( false );
							} );
					} else if ( display === 'events' ) {
						return window.Eventive.request( {
							method: 'GET',
							path: `event_buckets/${ eventBucket }/events`,
							authenticatePerson: false,
						} )
							.then( ( eventsData ) => {
								const allowed = collectTagIds( eventsData );
								setAllowedTagIds( allowed );
								setTags( tagsList );
								setLoading( false );
							} );
					} else {
						setAllowedTagIds( null );
						setTags( tagsList );
						setLoading( false );
					}
				} )
				.catch( ( err ) => {
					console.error( '[eventive-tags] Error loading tags:', err );
					setError( err.message );
					setLoading( false );
				} );
		};

		if ( window.Eventive && window.Eventive._ready ) {
			loadTags();
		} else if ( window.Eventive && typeof window.Eventive.on === 'function' ) {
			window.Eventive.on( 'ready', loadTags );
		} else {
			setTimeout( () => {
				if ( window.Eventive && typeof window.Eventive.request === 'function' ) {
					loadTags();
				} else {
					console.error( '[eventive-tags] Eventive API not available' );
					setError( 'Eventive API not available' );
					setLoading( false );
				}
			}, 1000 );
		}
	}, [ display ] );

	const handleTagClick = ( tagId ) => {
		const url = new URL( window.location.href );
		if ( tagId ) {
			url.searchParams.set( 'tag-id', tagId );
		} else {
			url.searchParams.delete( 'tag-id' );
		}
		window.location.href = url.toString();
	};

	const handleDropdownChange = ( e ) => {
		const tagId = e.target.value;
		handleTagClick( tagId );
	};

	if ( loading ) {
		return (
			<div
				className="eventive-tags-loading"
				style={ { padding: '20px', textAlign: 'center' } }
			>
				<p>Loading tags...</p>
			</div>
		);
	}

	if ( error ) {
		return (
			<div
				className="eventive-tags-error"
				style={ {
					padding: '15px',
					backgroundColor: '#fef7f1',
					borderLeft: '4px solid #d63638',
					color: '#d63638',
				} }
			>
				<p>{ error }</p>
			</div>
		);
	}

	// Filter tags based on exclusions and allowed IDs
	const excludeSets = buildExcludeSets( excludeTags );
	const filteredTags = tags.filter( ( tag ) => {
		const rawId = String( tag.id );
		const rawName = tag.name || '';
		const norm = normalizeTagName( rawName );

		// Check exclusions
		if (
			excludeSets.ids[ rawId ] ||
			excludeSets.names[ rawName.toLowerCase() ] ||
			excludeSets.slugs[ norm ]
		) {
			return false;
		}

		// Check if tag is in allowed set (if filtering by films/events)
		if ( allowedTagIds !== null && ! allowedTagIds[ rawId ] ) {
			return false;
		}

		return true;
	} );

	if ( filteredTags.length === 0 ) {
		return (
			<div
				className="eventive-tags-empty"
				style={ { padding: '20px', textAlign: 'center' } }
			>
				<p>No tags found.</p>
			</div>
		);
	}

	if ( view === 'dropdown' ) {
		return (
			<div className="eventive-tags-dropdown">
				<span>Filter by tag</span>
				<br />
				<select
					className="eventive-tag-select"
					onChange={ handleDropdownChange }
					value={ selectedTagId }
				>
					<option value="">All</option>
					{ filteredTags.map( ( tag ) => (
						<option key={ tag.id } value={ tag.id }>
							{ tag.name }
						</option>
					) ) }
				</select>
			</div>
		);
	}

	// Pills view
	return (
		<div className="eventive-tags-pills">
			<TagPill
				tag={ { id: '', name: 'All', color: '#e0e0e0' } }
				isActive={ ! selectedTagId }
				onClick={ handleTagClick }
				resetUrl={ resetUrl }
			/>
			{ filteredTags.map( ( tag ) => (
				<TagPill
					key={ tag.id }
					tag={ tag }
					isActive={ selectedTagId === String( tag.id ) }
					onClick={ handleTagClick }
					resetUrl={ resetUrl }
				/>
			) ) }
		</div>
	);
};

/**
 * Initialize tags blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const tagContainers = document.querySelectorAll(
		'.wp-block-eventive-eventive-tags'
	);

	tagContainers.forEach( ( container ) => {
		// Check if already initialized
		if (
			container.querySelector(
				'.eventive-tags-pills, .eventive-tags-dropdown'
			)
		) {
			return;
		}

		// Get attributes from container
		const view = container.getAttribute( 'data-view' ) || 'list';
		const display = container.getAttribute( 'data-display' ) || 'both';
		const hideEmpty =
			container.getAttribute( 'data-hide-empty' ) === 'true';
		const excludeTags = container.getAttribute( 'data-exclude-tags' ) || '';

		const root = createRoot( container );
		root.render(
			<TagsContainer
				view={ view }
				display={ display }
				hideEmpty={ hideEmpty }
				excludeTags={ excludeTags }
			/>
		);
	} );
} );
