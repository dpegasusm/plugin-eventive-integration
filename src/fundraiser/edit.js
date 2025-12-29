/**
 * Eventive Fundraiser Block - Edit Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

/**
 * Edit component - renders the block in the editor
 *
 * @param {Object}   props               Block properties
 * @param {Object}   props.attributes    Block attributes
 * @param {Function} props.setAttributes Function to update attributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Fundraiser Settings', 'eventive' ) }>
					<TextControl
						label={ __( 'Start Date (YYYY-MM-DD)', 'eventive' ) }
						value={ attributes.startTime }
						onChange={ ( value ) =>
							setAttributes( { startTime: value } )
						}
						help={ __(
							'Start date for donation tracking',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'End Date (YYYY-MM-DD)', 'eventive' ) }
						value={ attributes.endTime }
						onChange={ ( value ) =>
							setAttributes( { endTime: value } )
						}
						help={ __(
							'End date for donation tracking',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Goal Amount ($)', 'eventive' ) }
						value={ attributes.goalAmount }
						type="number"
						onChange={ ( value ) =>
							setAttributes( {
								goalAmount: parseFloat( value ) || 1000,
							} )
						}
						help={ __( 'Fundraising goal in dollars', 'eventive' ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3>{ __( 'Eventive Fundraiser', 'eventive' ) }</h3>
					<p>
						{ __(
							'Fundraiser progress will display on the frontend.',
							'eventive'
						) }
					</p>
					{ attributes.startTime && attributes.endTime && (
						<p>
							<strong>{ __( 'Period:', 'eventive' ) }</strong>{ ' ' }
							{ attributes.startTime } { __( 'to', 'eventive' ) }{ ' ' }
							{ attributes.endTime }
						</p>
					) }
					<p>
						<strong>{ __( 'Goal:', 'eventive' ) }</strong> $
						{ attributes.goalAmount }
					</p>
				</div>
			</div>
		</>
	);
}
