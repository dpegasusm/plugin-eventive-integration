/**
 * Film Meta Block - React Frontend Component
 */
import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

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
function FilmMeta( { postId, metaField, label, showLabel } ) {
	const [ metaValue, setMetaValue ] = useState( null );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		if ( ! postId ) {
			setError( 'Unable to determine the current post ID.' );
			setLoading( false );
			return;
		}

		// Fetch the film meta from WordPress REST API
		apiFetch( {
			path: `/wp/v2/eventive_film/${ postId }`,
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
	}, [ postId, metaField ] );

	if ( loading ) {
		return <span className="eventive-loading">Loading...</span>;
	}

	if ( error ) {
		return <span className="eventive-error">{ error }</span>;
	}

	// Get field config
	const fieldConfig = META_FIELDS[ metaField ] || {};
	const displayLabel = label || fieldConfig.label || metaField;
	const formattedValue = fieldConfig.format
		? fieldConfig.format( metaValue )
		: metaValue || 'No value';

	return (
		<>
			{ showLabel && (
				<span className="eventive-film-meta-label">{ displayLabel }: </span>
			) }
			<span className="eventive-film-meta-value">{ formattedValue }</span>
		</>
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
		// Get post ID from EventiveBlockData (localized from PHP)
		const postId = window.EventiveBlockData?.postId || '';
		
		// Get block attributes from data attributes
		const metaField = block.dataset.metaField || '_eventive_runtime';
		const label = block.dataset.label || '';
		const showLabel = block.dataset.showLabel !== 'false';

		if ( ! postId ) {
			block.innerHTML = '<div class="eventive-error">This block requires it be placed on a Eventive Film post type.</div>';
			return;
		}

		// Mount React component
		const root = createRoot( block );
		root.render(
			<FilmMeta
				postId={ postId }
				metaField={ metaField }
				label={ label }
				showLabel={ showLabel }
			/>
		);
	} );
} );
