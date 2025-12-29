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
				<div
					style={ {
						padding: '20px',
						border: '2px dashed #ccc',
						borderRadius: '8px',
						textAlign: 'center',
						background: '#f9f9f9',
					} }
				>
					<p style={ { margin: 0, color: '#666' } }>
						<strong>{ __( 'Eventive Login', 'eventive' ) }</strong>
					</p>
					<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
						{ __( 'Login link text:', 'eventive' ) }{ ' ' }
						{ loginLinkText }
					</p>
				</div>
			</div>
		</>
	);
}
