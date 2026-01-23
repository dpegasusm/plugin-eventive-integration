/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import './editor.scss';

/**
 * Available meta fields with their labels and formatters
 */
const META_FIELDS = {
	_eventive_runtime: {
		label: __( 'Runtime', 'eventive' ),
		format: ( value ) => {
			if ( ! value ) return __( 'Runtime not available', 'eventive' );
			const hours = Math.floor( value / 60 );
			const minutes = value % 60;
			if ( hours > 0 ) {
				return `${ hours }h ${ minutes }m`;
			}
			return `${ minutes }m`;
		},
	},
	_eventive_year: {
		label: __( 'Year', 'eventive' ),
		format: ( value ) => value || __( 'Year not available', 'eventive' ),
	},
	_eventive_language: {
		label: __( 'Language', 'eventive' ),
		format: ( value ) => value || __( 'Language not available', 'eventive' ),
	},
	_eventive_country: {
		label: __( 'Country', 'eventive' ),
		format: ( value ) => value || __( 'Country not available', 'eventive' ),
	},
	_eventive_director: {
		label: __( 'Director', 'eventive' ),
		format: ( value ) => value || __( 'Director not available', 'eventive' ),
	},
};

/**
 * Edit component for Film Meta block
 *
 * @param {Object} props Block properties
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const { metaField, label, showLabel } = attributes;
	const [ metaValue, setMetaValue ] = useState( null );
	const [ loading, setLoading ] = useState( true );

	const blockProps = useBlockProps( {
		className: 'eventive-film-meta-block',
	} );

	// Get the current post ID
	const postId = useSelect( ( select ) => {
		return select( 'core/editor' ).getCurrentPostId();
	}, [] );

	// Fetch meta value
	useEffect( () => {
		if ( ! postId ) {
			setLoading( false );
			return;
		}

		setLoading( true );

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
			.catch( ( error ) => {
				console.error( '[eventive-film-meta] Error fetching meta:', error );
				setMetaValue( null );
				setLoading( false );
			} );
	}, [ postId, metaField ] );

	// Get field config
	const fieldConfig = META_FIELDS[ metaField ] || {};
	const displayLabel = label || fieldConfig.label || metaField;
	const formattedValue = fieldConfig.format
		? fieldConfig.format( metaValue )
		: metaValue || __( 'No value', 'eventive' );

	// Build meta field options
	const metaFieldOptions = Object.keys( META_FIELDS ).map( ( key ) => ( {
		label: META_FIELDS[ key ].label,
		value: key,
	} ) );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Film Meta Settings', 'eventive' ) }>
					<SelectControl
						label={ __( 'Meta Field', 'eventive' ) }
						value={ metaField }
						options={ metaFieldOptions }
						onChange={ ( value ) => setAttributes( { metaField: value } ) }
						help={ __( 'Choose which film metadata to display', 'eventive' ) }
					/>
					<ToggleControl
						label={ __( 'Show Label', 'eventive' ) }
						checked={ showLabel }
						onChange={ ( value ) => setAttributes( { showLabel: value } ) }
					/>
					{ showLabel && (
						<TextControl
							label={ __( 'Custom Label', 'eventive' ) }
							value={ label }
							onChange={ ( value ) => setAttributes( { label: value } ) }
							placeholder={ fieldConfig.label }
							help={ __( 'Leave empty to use the default label', 'eventive' ) }
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<div className="eventive-block-placeholder__icon">
						<span className="dashicon dashicons-admin-settings"></span>
					</div>
					<div className="eventive-block-placeholder__label">
						{ __( 'Eventive Film Meta', 'eventive' ) }
					</div>
					<div className="eventive-block-placeholder__description">
						{ loading ? (
							<div className="eventive-loading">
								{ __( 'Loading...', 'eventive' ) }
							</div>
						) : (
							<div className="eventive-film-meta-preview">
								{ showLabel && (
									<strong className="eventive-film-meta-label">
										{ displayLabel }:{ ' ' }
									</strong>
								) }
								<span className="eventive-film-meta-value">
									{ formattedValue }
								</span>
							</div>
						) }
					</div>
				</div>
			</div>
		</>
	);
}
