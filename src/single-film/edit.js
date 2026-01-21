/**
 * Eventive Single Film Block - Edit Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

import './editor.scss';

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
				<PanelBody title={ __( 'Single Film Settings', 'eventive' ) }>
					<TextControl
						label={ __( 'Film ID', 'eventive' ) }
						value={ attributes.filmId }
						onChange={ ( value ) =>
							setAttributes( { filmId: value } )
						}
						help={ __( 'Eventive film ID to display', 'eventive' ) }
					/>
					<TextControl
						label={ __( 'Event ID', 'eventive' ) }
						value={ attributes.eventId }
						onChange={ ( value ) =>
							setAttributes( { eventId: value } )
						}
						help={ __(
							'Eventive event ID to display',
							'eventive'
						) }
					/>
					<p className="components-base-control__help">
						{ __(
							'Provide either a Film ID or Event ID (not both).',
							'eventive'
						) }
					</p>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3 className="eventive-block-placeholder__title">
						{ __( 'Eventive Single Film', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
							{ __(
								'Film or event details will display on the frontend.',
								'eventive'
							) }
						</p>
						{ attributes.filmId && (
							<p>
								<strong>
									{ __( 'Film ID:', 'eventive' ) }
								</strong>{ ' ' }
								{ attributes.filmId }
							</p>
						) }
						{ attributes.eventId && (
							<p>
								<strong>
									{ __( 'Event ID:', 'eventive' ) }
								</strong>{ ' ' }
								{ attributes.eventId }
							</p>
						) }
						{ ! attributes.filmId && ! attributes.eventId && (
							<p className="warning">
								{ __(
									'Please provide either a Film ID or Event ID in the block settings.',
									'eventive'
								) }
							</p>
						) }
					</div>
				</div>
			</div>
		</>
	);
}
