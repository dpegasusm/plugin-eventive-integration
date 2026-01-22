/**
 * Eventive Film Details Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import './editor.scss';

/**
 * Edit component for Eventive Film Details block
 *
 * @param {Object} props               Block properties
 * @param          props.attributes
 * @param          props.setAttributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { filmId, showEvents, showDetails, showTags, excludeVirtual } =
		attributes;
	const [ films, setFilms ] = useState( [] );
	const [ loadingFilms, setLoadingFilms ] = useState( true );

	useEffect( () => {
		// Fetch films
		const fetchFilms = async () => {
			try {
				const params = new URLSearchParams( {
					eventive_nonce: window.EventiveBlockData?.eventNonce || '',
				} );

				const data = await apiFetch( {
					path: `eventive/v1/films?${ params.toString() }`,
					method: 'GET',
				} );

				const filmList = ( data.films || data || [] ).map(
					( film ) => ( {
						label: film.name || film.title || 'Untitled',
						value: film.id,
					} )
				);

				filmList.sort( ( a, b ) => a.label.localeCompare( b.label ) );
				setFilms( filmList );
			} catch ( error ) {
				console.error( 'Error fetching films:', error );
			} finally {
				setLoadingFilms( false );
			}
		};

		fetchFilms();
	}, [] );

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Film Settings', 'eventive' ) }
					initialOpen={ true }
				>
					{ loadingFilms ? (
						<div style={ { padding: '10px 0' } }>
							<Spinner />{ ' ' }
							{ __( 'Loading films...', 'eventive' ) }
						</div>
					) : (
						<SelectControl
							label={ __( 'Select Film', 'eventive' ) }
							value={ filmId }
							options={ [
								{
									label: __( '-- Select a Film --', 'eventive' ),
									value: '',
								},
								...films,
							] }
							onChange={ ( value ) =>
								setAttributes( { filmId: value } )
							}
							help={ __(
								'Choose a film to display (can also be passed via URL parameter)',
								'eventive'
							) }
						/>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Display Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<ToggleControl
						label={ __( 'Show Events', 'eventive' ) }
						checked={ showEvents }
						onChange={ ( value ) =>
							setAttributes( { showEvents: value } )
						}
						help={ __(
							'Display event listings for this film',
							'eventive'
						) }
					/>
					<ToggleControl
						label={ __( 'Show Details', 'eventive' ) }
						checked={ showDetails }
						onChange={ ( value ) =>
							setAttributes( { showDetails: value } )
						}
						help={ __(
							'Display film details (description, cast, etc.)',
							'eventive'
						) }
					/>
					<ToggleControl
						label={ __( 'Show Tags', 'eventive' ) }
						checked={ showTags }
						onChange={ ( value ) =>
							setAttributes( { showTags: value } )
						}
						help={ __( 'Display film tags/genres', 'eventive' ) }
					/>
					<ToggleControl
						label={ __( 'Exclude Virtual', 'eventive' ) }
						checked={ excludeVirtual }
						onChange={ ( value ) =>
							setAttributes( { excludeVirtual: value } )
						}
						help={ __(
							'Exclude virtual events from display',
							'eventive'
						) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3 className="eventive-block-placeholder__title">
						{ __( 'Eventive Film Details', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
							{ filmId
								? `${ __( 'Selected Film:', 'eventive' ) } ${
										films.find( ( f ) => f.value === filmId )
											?.label || filmId
								  }`
								: __(
										'Film details will display here (set Film ID or use URL parameter)',
										'eventive'
								  ) }
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
