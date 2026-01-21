/**
 * Film Sync Plugin
 * Adds Eventive sync controls to the block editor sidebar
 *
 * @package Eventive
 * @since 1.0.0
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { useSelect, useDispatch } from '@wordpress/data';
import { ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const FilmSyncPanel = () => {
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
			name="eventive-film-sync"
			title={ __( 'Eventive Sync', 'eventive' ) }
		>
			<ToggleControl
				label={ __( 'Sync this film from Eventive', 'eventive' ) }
				checked={ meta._eventive_sync_enabled !== false }
				onChange={ ( value ) =>
					updateMeta( '_eventive_sync_enabled', value )
				}
				help={ __(
					'When disabled, this film will be skipped during sync operations',
					'eventive'
				) }
			/>
		</PluginDocumentSettingPanel>
	);
};

registerPlugin( 'eventive-film-sync', {
	render: FilmSyncPanel,
} );
