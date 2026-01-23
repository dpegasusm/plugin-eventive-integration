/**
 * Film Meta Block - React Frontend Component
 */
import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * Available meta fields with their labels and formatters
 */
const META_FIELDS = {
	_eventive_runtime: {
		label: 'Runtime',
		format: ( value ) => {
			if ( ! value ) return 'Runtime not available';
			const hours = Math.floor( value / 60 );
			const minutes = value % 60;
			if ( hours > 0 ) {
				return `${ hours }h ${ minutes }m`;
			}
			return `${ minutes }m`;
		},
	},
	_eventive_year: {
		label: 'Year',
		format: ( value ) => value || 'Year not available',
	},
	_eventive_language: {
		label: 'Language',
		format: ( value ) => value || 'Language not available',
	},
	_eventive_country: {
		label: 'Country',
		format: ( value ) => value || 'Country not available',
	},
	_eventive_director: {
		label: 'Director',
		format: ( value ) => value || 'Director not available',
	},
};

/**
 * FilmMeta React Component
 */
function FilmMeta( { metaField, label, showLabel } ) {
	const [ metaValue, setMetaValue ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		// Get the current post ID from the page
		const postId = document.body.classList.contains( 'single-eventive_film' )
			? document.querySelector( 'article[id^="post-"]' )?.id?.replace( 'post-', '' )
			: null;

		if ( ! postId ) {
			setError( 'Unable to determine the current post ID.' );
			setLoading( false );
			return;
		}

		// Fetch the film meta from WordPress REST API
		fetch( `/wp-json/wp/v2/eventive_film/${ postId }` )
			.then( ( response ) => {
				if ( ! response.ok ) {
					throw new Error( 'Failed to fetch post data' );
				}
				return response.json();
			} )
			.then( ( post ) => {
				const value = post.meta?.[ metaField ];
				setMetaValue( value );
				setLoading( false );
			} )
			.catch( ( err ) => {
				console.error( '[eventive-film-meta] Error fetching meta:', err );
				setError( 'Unable to load metadata' );
				setLoading( false );
			} );
	}, [ metaField ] );

	if ( loading ) {
		return <div className="eventive-loading">Loading...</div>;
	}

	if ( error ) {
		return <div className="eventive-error">{ error }</div>;
	}

	// Get field config
	const fieldConfig = META_FIELDS[ metaField ] || {};
	const displayLabel = label || fieldConfig.label || metaField;
	const formattedValue = fieldConfig.format
		? fieldConfig.format( metaValue )
		: metaValue || 'No value';

	return (
		<div className="eventive-film-meta-content">
			{ showLabel && (
				<span className="eventive-film-meta-label">{ displayLabel }: </span>
			) }
			<span className="eventive-film-meta-value">{ formattedValue }</span>
		</div>
	);
}

/**
 * Initialize Film Meta blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const metaBlocks = document.querySelectorAll(
		'.wp-block-eventive-film-meta'
	);

	metaBlocks.forEach( ( block ) => {
		// Get block attributes from data attributes
		const metaField =
			block.dataset.metaField || '_eventive_runtime';
		const label = block.dataset.label || '';
		const showLabel =
			block.dataset.showLabel !== 'false';

		// Mount React component
		const root = createRoot( block );
		root.render(
			<FilmMeta
				metaField={ metaField }
				label={ label }
				showLabel={ showLabel }
			/>
		);
	} );
} );
