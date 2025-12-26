/**
 * Eventive Events List Block - Editor Component
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
	RangeControl,
} from '@wordpress/components';
import './editor.scss';

/**
 * Edit component for Eventive Events List block
 *
 * @param {Object} props               Block properties
 * @param          props.attributes
 * @param          props.setAttributes
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const {
		limit,
		tagId,
		excludeTags,
		venueId,
		eventDescription,
		shortDescription,
		image,
		virtual,
		showFilter,
		view,
		showUndated,
		includePast,
		startDate,
		endDate,
	} = attributes;

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Filter Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<RangeControl
						label={ __( 'Event Limit', 'eventive' ) }
						value={ limit }
						onChange={ ( value ) =>
							setAttributes( { limit: value } )
						}
						min={ 1 }
						max={ 100 }
						help={ __(
							'Maximum number of events to display',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Tag ID', 'eventive' ) }
						value={ tagId }
						onChange={ ( value ) =>
							setAttributes( { tagId: value } )
						}
						help={ __(
							'Filter by tag ID (comma-separated for multiple)',
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
							'Exclude events with these tag IDs',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Venue ID', 'eventive' ) }
						value={ venueId }
						onChange={ ( value ) =>
							setAttributes( { venueId: value } )
						}
						help={ __( 'Filter by venue ID', 'eventive' ) }
					/>
					<TextControl
						label={ __( 'Start Date', 'eventive' ) }
						value={ startDate }
						onChange={ ( value ) =>
							setAttributes( { startDate: value } )
						}
						help={ __( 'YYYY-MM-DD format', 'eventive' ) }
					/>
					<TextControl
						label={ __( 'End Date', 'eventive' ) }
						value={ endDate }
						onChange={ ( value ) =>
							setAttributes( { endDate: value } )
						}
						help={ __( 'YYYY-MM-DD format', 'eventive' ) }
					/>
					<ToggleControl
						label={ __( 'Include Virtual', 'eventive' ) }
						checked={ virtual }
						onChange={ ( value ) =>
							setAttributes( { virtual: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Include Past', 'eventive' ) }
						checked={ includePast }
						onChange={ ( value ) =>
							setAttributes( { includePast: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Undated', 'eventive' ) }
						checked={ showUndated }
						onChange={ ( value ) =>
							setAttributes( { showUndated: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Filter UI', 'eventive' ) }
						checked={ showFilter }
						onChange={ ( value ) =>
							setAttributes( { showFilter: value } )
						}
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Display Settings', 'eventive' ) }
					initialOpen={ true }
				>
					<SelectControl
						label={ __( 'View Mode', 'eventive' ) }
						value={ view }
						options={ [
							{ label: 'List', value: 'list' },
							{ label: 'Grid', value: 'grid' },
						] }
						onChange={ ( value ) =>
							setAttributes( { view: value } )
						}
					/>
					<SelectControl
						label={ __( 'Image Type', 'eventive' ) }
						value={ image }
						options={ [
							{ label: 'Cover', value: 'cover' },
							{ label: 'Poster', value: 'poster' },
							{ label: 'None', value: 'none' },
						] }
						onChange={ ( value ) =>
							setAttributes( { image: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Event Description', 'eventive' ) }
						checked={ eventDescription }
						onChange={ ( value ) =>
							setAttributes( { eventDescription: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Short Description', 'eventive' ) }
						checked={ shortDescription }
						onChange={ ( value ) =>
							setAttributes( { shortDescription: value } )
						}
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
						📋 { __( 'Eventive Events List', 'eventive' ) }
					</p>
					<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
						{ __(
							`${ view === 'list' ? 'List' : 'Grid' } view • Limit: ${ limit }`,
							'eventive'
						) }
					</p>
				</div>
			</div>
		</>
	);
}
