/**
 * Eventive Film Details Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
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

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Film Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<TextControl
						label={ __( 'Film ID', 'eventive' ) }
						value={ filmId }
						onChange={ ( value ) =>
							setAttributes( { filmId: value } )
						}
						help={ __(
							'Eventive film ID (can also be passed via URL parameter)',
							'eventive'
						) }
					/>
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
				<div
					style={ {
						padding: '20px',
						border: '2px dashed #ccc',
						borderRadius: '8px',
						textAlign: 'center',
						backgroundColor: '#f9f9f9',
					} }
				>
					<p style={ { margin: 0, fontWeight: 600 } }>
						🎬 { __( 'Eventive Film Details', 'eventive' ) }
					</p>
					<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
						{ filmId
							? __( `Film ID: ${ filmId }`, 'eventive' )
							: __(
									'Film details will display here (set Film ID or use URL parameter)',
									'eventive'
							  ) }
					</p>
				</div>
			</div>
		</>
	);
}
