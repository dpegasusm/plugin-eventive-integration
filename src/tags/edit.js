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
				<div className="eventive-block-placeholder">
					<h3 className="eventive-block-placeholder__title">
						{ __( 'Eventive Tags Block', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
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
						<p className="eventive-block-placeholder__description">
							{ display === 'both' &&
								__( 'Showing: Films & Events', 'eventive' ) }
							{ display === 'films' &&
								__( 'Showing: Films Only', 'eventive' ) }
							{ display === 'events' &&
								__( 'Showing: Events Only', 'eventive' ) }
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
