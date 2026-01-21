/**
 * Eventive Marquee Block - Edit Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';

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
				<PanelBody title={ __( 'Marquee Settings', 'eventive' ) }>
					<TextControl
						label={ __( 'Tag Filter', 'eventive' ) }
						value={ attributes.tag }
						onChange={ ( value ) =>
							setAttributes( { tag: value } )
						}
						help={ __(
							'Filter by tag name (comma-separated)',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Exclude Tags', 'eventive' ) }
						value={ attributes.exclude }
						onChange={ ( value ) =>
							setAttributes( { exclude: value } )
						}
						help={ __(
							'Exclude films with these tags',
							'eventive'
						) }
					/>
					<RangeControl
						label={ __( 'Number of Films', 'eventive' ) }
						value={ attributes.number }
						onChange={ ( value ) =>
							setAttributes( { number: value } )
						}
						min={ 1 }
						max={ 50 }
					/>
					<ToggleControl
						label={ __( 'Use Still Images', 'eventive' ) }
						checked={ attributes.stills }
						onChange={ ( value ) =>
							setAttributes( { stills: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Year Round Mode', 'eventive' ) }
						checked={ attributes.yearRound }
						onChange={ ( value ) =>
							setAttributes( { yearRound: value } )
						}
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Overlay & Caption', 'eventive' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Overlay Image URL', 'eventive' ) }
						value={ attributes.overlay }
						onChange={ ( value ) =>
							setAttributes( { overlay: value } )
						}
						help={ __(
							'Background pattern/image URL',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Overlay Opacity', 'eventive' ) }
						value={ attributes.overlayOpacity }
						onChange={ ( value ) =>
							setAttributes( { overlayOpacity: value } )
						}
						help={ __( '0 to 1 (e.g., 0.22)', 'eventive' ) }
					/>
					<TextControl
						label={ __( 'Caption Text', 'eventive' ) }
						value={ attributes.caption }
						onChange={ ( value ) =>
							setAttributes( { caption: value } )
						}
						help={ __( 'Scrolling text caption', 'eventive' ) }
					/>
					<TextControl
						label={ __( 'Caption Speed', 'eventive' ) }
						value={ attributes.captionSpeed }
						onChange={ ( value ) =>
							setAttributes( { captionSpeed: value } )
						}
						help={ __(
							'"match" or seconds (e.g., "45")',
							'eventive'
						) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3 className="eventive-block-placeholder__title">
						{ __( 'Eventive Marquee', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
							{ __(
								'Film marquee will display on the frontend.',
								'eventive'
							) }
						</p>
						<p>
							<strong>{ __( 'Settings:', 'eventive' ) }</strong>
						</p>
						<ul>
							{ attributes.tag && (
								<li>
									{ __( 'Tag:', 'eventive' ) } { attributes.tag }
								</li>
							) }
							<li>
								{ __( 'Number:', 'eventive' ) }{ ' ' }
								{ attributes.number }
							</li>
							{ attributes.stills && (
								<li>{ __( 'Using still images', 'eventive' ) }</li>
							) }
							{ attributes.caption && (
								<li>
									{ __( 'Caption:', 'eventive' ) }{ ' ' }
									{ attributes.caption }
								</li>
							) }
						</ul>
					</div>
				</div>
			</div>
		</>
	);
}
