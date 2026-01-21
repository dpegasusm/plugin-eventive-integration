/**
 * Eventive Events Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import './editor.scss';

/**
 * Edit component for Eventive Events block
 *
 * @param {Object} props               Block properties
 * @param          props.attributes
 * @param          props.setAttributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const {
		tagId,
		venueId,
		image,
		description,
		showFilter,
		eventId,
		filmsBase,
	} = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Filter Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<TextControl
						label={ __( 'Tag ID', 'eventive' ) }
						value={ tagId }
						onChange={ ( value ) =>
							setAttributes( { tagId: value } )
						}
						help={ __(
							'Filter events by Eventive tag ID',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Venue ID', 'eventive' ) }
						value={ venueId }
						onChange={ ( value ) =>
							setAttributes( { venueId: value } )
						}
						help={ __(
							'Filter events by Eventive venue ID',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Event ID', 'eventive' ) }
						value={ eventId }
						onChange={ ( value ) =>
							setAttributes( { eventId: value } )
						}
						help={ __( 'Open specific event on load', 'eventive' ) }
					/>
					<ToggleControl
						label={ __( 'Show Filter', 'eventive' ) }
						checked={ showFilter }
						onChange={ ( value ) =>
							setAttributes( { showFilter: value } )
						}
						help={ __( 'Display tag filter UI', 'eventive' ) }
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Display Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'Image Type', 'eventive' ) }
						value={ image }
						options={ [
							{ label: 'Poster', value: 'poster' },
							{ label: 'Cover', value: 'cover' },
							{ label: 'Still', value: 'still' },
						] }
						onChange={ ( value ) =>
							setAttributes( { image: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Description', 'eventive' ) }
						checked={ description }
						onChange={ ( value ) =>
							setAttributes( { description: value } )
						}
					/>
					<TextControl
						label={ __( 'Films Base URL', 'eventive' ) }
						value={ filmsBase }
						onChange={ ( value ) =>
							setAttributes( { filmsBase: value } )
						}
						help={ __(
							'Optional base URL for film detail pages',
							'eventive'
						) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3 className="eventive-block-placeholder__title">
						{ __( 'Eventive Events', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
							{ __(
								'Upcoming events will display here',
								'eventive'
							) }
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
