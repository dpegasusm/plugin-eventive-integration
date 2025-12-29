/**
 * Eventive Carousel Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import './editor.scss';

/**
 * Edit component for Eventive Carousel block
 *
 * @param {Object} props               Block properties
 * @param          props.attributes
 * @param          props.setAttributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { limit, showDescription } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Carousel Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<RangeControl
						label={ __( 'Number of Events', 'eventive' ) }
						value={ limit }
						onChange={ ( value ) =>
							setAttributes( { limit: value } )
						}
						min={ 1 }
						max={ 10 }
						help={ __(
							'Maximum number of upcoming events to display',
							'eventive'
						) }
					/>
					<ToggleControl
						label={ __( 'Show Description', 'eventive' ) }
						checked={ showDescription }
						onChange={ ( value ) =>
							setAttributes( { showDescription: value } )
						}
						help={ __(
							'Display event descriptions in carousel',
							'eventive'
						) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div
					style={ {
						padding: '20px',
						backgroundColor: '#f5f5f5',
						border: '1px solid #ddd',
						borderRadius: '4px',
						textAlign: 'center',
					} }
				>
					<p style={ { margin: 0, color: '#666' } }>
						<strong>
							{ __( 'Eventive Carousel', 'eventive' ) }
						</strong>
					</p>
					<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
						{ __(
							`Displaying up to ${ limit } upcoming events`,
							'eventive'
						) }
					</p>
				</div>
			</div>
		</>
	);
}
