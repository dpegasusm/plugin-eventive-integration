/**
 * Eventive Login Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import './editor.scss';

/**
 * Edit component for Eventive Login block
 *
 * @param {Object} props               Block properties
 * @param          props.attributes
 * @param          props.setAttributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { loginLinkText } = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Login Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<TextControl
						label={ __( 'Login Link Text', 'eventive' ) }
						value={ loginLinkText }
						onChange={ ( value ) =>
							setAttributes( { loginLinkText: value } )
						}
						help={ __(
							'Text displayed for the login link',
							'eventive'
						) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3 className="eventive-block-placeholder__title">
						{ __( 'Eventive Login', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
							{ __( 'Login link text:', 'eventive' ) }{ ' ' }
							{ loginLinkText }
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
