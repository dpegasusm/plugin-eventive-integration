/**
 * Eventive Tags Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import './editor.scss';

/**
 * Edit component for Eventive Tags block
 *
 * @param {Object} props               Block properties
 * @param          props.attributes
 * @param          props.setAttributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { view, display, hideEmpty, excludeTags } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Tag Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Display Style', 'eventive' ) }
						value={ view }
						options={ [
							{
								label: __( 'Pills (List)', 'eventive' ),
								value: 'list',
							},
							{
								label: __( 'Dropdown', 'eventive' ),
								value: 'dropdown',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { view: value } )
						}
					/>
					<SelectControl
						label={ __( 'Filter By', 'eventive' ) }
						value={ display }
						options={ [
							{
								label: __( 'Both Films & Events', 'eventive' ),
								value: 'both',
							},
							{
								label: __( 'Films Only', 'eventive' ),
								value: 'films',
							},
							{
								label: __( 'Events Only', 'eventive' ),
								value: 'events',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { display: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Hide Empty Tags', 'eventive' ) }
						checked={ hideEmpty }
						onChange={ ( value ) =>
							setAttributes( { hideEmpty: value } )
						}
						help={ __(
							'Hide tags that have no associated films or events',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Exclude Tags', 'eventive' ) }
						value={ excludeTags }
						onChange={ ( value ) =>
							setAttributes( { excludeTags: value } )
						}
						help={ __(
							'Comma-separated list of tag IDs or names to exclude',
							'eventive'
						) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div
					style={ {
						padding: '20px',
						border: '2px dashed #ddd',
						borderRadius: '4px',
						backgroundColor: '#f9f9f9',
						textAlign: 'center',
					} }
				>
					<span
						className="dashicons dashicons-tag"
						style={ {
							fontSize: '48px',
							color: '#666',
							marginBottom: '10px',
							display: 'block',
						} }
					></span>
					<strong>{ __( 'Eventive Tags Block', 'eventive' ) }</strong>
					<p
						style={ {
							margin: '10px 0 0',
							color: '#666',
							fontSize: '14px',
						} }
					>
						{ view === 'dropdown'
							? __(
									'Tags will be displayed as a dropdown on the frontend',
									'eventive'
							  )
							: __(
									'Tags will be displayed as filter pills on the frontend',
									'eventive'
							  ) }
					</p>
					<p
						style={ {
							margin: '5px 0 0',
							color: '#999',
							fontSize: '12px',
						} }
					>
						{ display === 'both' &&
							__( 'Showing: Films & Events', 'eventive' ) }
						{ display === 'films' &&
							__( 'Showing: Films Only', 'eventive' ) }
						{ display === 'events' &&
							__( 'Showing: Events Only', 'eventive' ) }
					</p>
				</div>
			</div>
		</>
	);
}
