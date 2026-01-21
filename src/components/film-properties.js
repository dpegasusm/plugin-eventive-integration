/**
 * Film Properties Plugin
 * Adds Eventive film metadata to the block editor sidebar
 *
 * @package Eventive
 * @since 1.0.0
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { useSelect, useDispatch } from '@wordpress/data';
import { TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const FilmPropertiesPanel = () => {
	const postType = useSelect(
		( select ) => select( 'core/editor' ).getCurrentPostType(),
		[]
	);

	// Only show for eventive_film post type
	if ( postType !== 'eventive_film' ) {
		return null;
	}

	const { editPost } = useDispatch( 'core/editor' );

	const meta = useSelect(
		( select ) =>
			select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {},
		[]
	);

	const updateMeta = ( key, value ) => {
		editPost( { meta: { [ key ]: value } } );
	};

	return (
		<PluginDocumentSettingPanel
			name="eventive-film-properties"
			title={ __( 'Eventive Film Properties', 'eventive' ) }
		>
			<TextControl
				label={ __( 'Film ID', 'eventive' ) }
				value={ meta._eventive_film_id || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_film_id', value )
				}
				help={ __( 'Eventive film ID', 'eventive' ) }
			/>

			<TextControl
				label={ __( 'Bucket ID', 'eventive' ) }
				value={ meta._eventive_bucket_id || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_bucket_id', value )
				}
				help={ __( 'Eventive bucket ID', 'eventive' ) }
			/>

			<TextControl
				label={ __( 'Director', 'eventive' ) }
				value={ meta._eventive_director || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_director', value )
				}
			/>

			<TextControl
				label={ __( 'Year', 'eventive' ) }
				value={ meta._eventive_year || '' }
				onChange={ ( value ) => updateMeta( '_eventive_year', value ) }
				type="number"
			/>

			<TextControl
				label={ __( 'Runtime (minutes)', 'eventive' ) }
				value={ meta._eventive_runtime || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_runtime', value )
				}
				type="number"
			/>

			<TextControl
				label={ __( 'Language', 'eventive' ) }
				value={ meta._eventive_language || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_language', value )
				}
			/>

			<TextControl
				label={ __( 'Country of Origin', 'eventive' ) }
				value={ meta._eventive_country || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_country', value )
				}
			/>

			<TextControl
				label={ __( 'Poster Image URL', 'eventive' ) }
				value={ meta._eventive_poster_image || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_poster_image', value )
				}
				type="url"
			/>

			<TextControl
				label={ __( 'Cover Image URL', 'eventive' ) }
				value={ meta._eventive_cover_image || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_cover_image', value )
				}
				type="url"
			/>

			<TextControl
				label={ __( 'Trailer URL', 'eventive' ) }
				value={ meta._eventive_trailer_url || '' }
				onChange={ ( value ) =>
					updateMeta( '_eventive_trailer_url', value )
				}
				type="url"
			/>
		</PluginDocumentSettingPanel>
	);
};

registerPlugin( 'eventive-film-properties', {
	render: FilmPropertiesPanel,
} );
