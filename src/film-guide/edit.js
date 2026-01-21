/**
 * Eventive Film Guide Block - Edit Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
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
				<PanelBody title={ __( 'Film Guide Settings', 'eventive' ) }>
					<TextControl
						label={ __( 'Tag Name (comma-separated)', 'eventive' ) }
						value={ attributes.tagName }
						onChange={ ( value ) =>
							setAttributes( { tagName: value } )
						}
						help={ __(
							'Filter by tag name(s) or ID(s)',
							'eventive'
						) }
					/>
					<TextControl
						label={ __(
							'Exclude Tag (comma-separated)',
							'eventive'
						) }
						value={ attributes.excludeTag }
						onChange={ ( value ) =>
							setAttributes( { excludeTag: value } )
						}
						help={ __(
							'Exclude films with these tag(s)',
							'eventive'
						) }
					/>
					<TextControl
						label={ __( 'Film ID', 'eventive' ) }
						value={ attributes.filmId }
						onChange={ ( value ) =>
							setAttributes( { filmId: value } )
						}
						help={ __(
							'Display only this specific film',
							'eventive'
						) }
					/>
					<ToggleControl
						label={ __( 'Show Events', 'eventive' ) }
						checked={ attributes.showEvents }
						onChange={ ( value ) =>
							setAttributes( { showEvents: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Filter', 'eventive' ) }
						checked={ attributes.showFilter }
						onChange={ ( value ) =>
							setAttributes( { showFilter: value } )
						}
					/>
					<SelectControl
						label={ __( 'Image Type', 'eventive' ) }
						value={ attributes.image }
						options={ [
							{ label: 'Poster', value: 'poster' },
							{ label: 'Cover', value: 'cover' },
							{ label: 'Still', value: 'still' },
						] }
						onChange={ ( value ) =>
							setAttributes( { image: value } )
						}
					/>
					<SelectControl
						label={ __( 'View Mode', 'eventive' ) }
						value={ attributes.view }
						options={ [
							{ label: 'Grid', value: 'grid' },
							{ label: 'List', value: 'list' },
						] }
						onChange={ ( value ) =>
							setAttributes( { view: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Tags', 'eventive' ) }
						checked={ attributes.showTags }
						onChange={ ( value ) =>
							setAttributes( { showTags: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Description', 'eventive' ) }
						checked={ attributes.showDescription }
						onChange={ ( value ) =>
							setAttributes( { showDescription: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Details', 'eventive' ) }
						checked={ attributes.showDetails }
						onChange={ ( value ) =>
							setAttributes( { showDetails: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Year Round Mode', 'eventive' ) }
						checked={ attributes.yearRound }
						onChange={ ( value ) =>
							setAttributes( { yearRound: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show Search', 'eventive' ) }
						checked={ attributes.search }
						onChange={ ( value ) =>
							setAttributes( { search: value } )
						}
					/>
					<ToggleControl
						label={ __( 'Show View Switcher', 'eventive' ) }
						checked={ attributes.showViewSwitcher }
						onChange={ ( value ) =>
							setAttributes( { showViewSwitcher: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3 className='eventive-block-placeholder__title'>
						{ __( 'Eventive Film Guide', 'eventive' ) }
					</h3>
					<div className="eventive-block-placeholder__description">
						<p>
							{ __(
								'Film guide will display on the frontend.',
								'eventive'
							) }
						</p>
						<p>
							<strong>{ __( 'Settings:', 'eventive' ) }</strong>
						</p>
						<ul>
							{ attributes.tagName && (
								<li>
									{ __( 'Tag:', 'eventive' ) }{ ' ' }
									{ attributes.tagName }
								</li>
							) }
							{ attributes.filmId && (
								<li>
									{ __( 'Film ID:', 'eventive' ) }{ ' ' }
									{ attributes.filmId }
								</li>
							) }
							<li>
								{ __( 'View:', 'eventive' ) } { attributes.view }
							</li>
							<li>
								{ __( 'Image:', 'eventive' ) } { attributes.image }
							</li>
						</ul>
					</div>
				</div>
			</div>
		</>
	);
}
