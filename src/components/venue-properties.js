/**
 * Venue Properties Plugin
 * Adds Eventive venue metadata to the block editor sidebar
 *
 * @package Eventive
 * @since 1.0.0
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { useSelect, useDispatch } from '@wordpress/data';
import { TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const VenuePropertiesPanel = () => {
	const postType = useSelect(
		(select) => select('core/editor').getCurrentPostType(),
		[]
	);

	// Only show for eventive_venue post type
	if (postType !== 'eventive_venue') {
		return null;
	}

	const { editPost } = useDispatch('core/editor');

	const meta = useSelect(
		(select) => select('core/editor').getEditedPostAttribute('meta') || {},
		[]
	);

	const updateMeta = (key, value) => {
		editPost({ meta: { [key]: value } });
	};

	return (
		<PluginDocumentSettingPanel
			name="eventive-venue-properties"
			title={__('Eventive Venue Properties', 'eventive')}
		>
			<TextControl
				label={__('Venue ID', 'eventive')}
				value={meta._eventive_venue_id || ''}
				onChange={(value) => updateMeta('_eventive_venue_id', value)}
				help={__('Eventive venue ID', 'eventive')}
			/>

			<TextControl
				label={__('Bucket ID', 'eventive')}
				value={meta._eventive_bucket_id || ''}
				onChange={(value) => updateMeta('_eventive_bucket_id', value)}
				help={__('Eventive bucket ID', 'eventive')}
			/>

			<TextControl
				label={__('Address', 'eventive')}
				value={meta._eventive_venue_address || ''}
				onChange={(value) => updateMeta('_eventive_venue_address', value)}
			/>

			<TextControl
				label={__('City', 'eventive')}
				value={meta._eventive_venue_city || ''}
				onChange={(value) => updateMeta('_eventive_venue_city', value)}
			/>

			<TextControl
				label={__('State', 'eventive')}
				value={meta._eventive_venue_state || ''}
				onChange={(value) => updateMeta('_eventive_venue_state', value)}
			/>

			<TextControl
				label={__('Zip Code', 'eventive')}
				value={meta._eventive_venue_zip || ''}
				onChange={(value) => updateMeta('_eventive_venue_zip', value)}
			/>

			<TextControl
				label={__('Country', 'eventive')}
				value={meta._eventive_venue_country || ''}
				onChange={(value) => updateMeta('_eventive_venue_country', value)}
			/>

			<TextControl
				label={__('Latitude', 'eventive')}
				value={meta._eventive_venue_lat || ''}
				onChange={(value) => updateMeta('_eventive_venue_lat', value)}
				help={__('Geographic latitude coordinate', 'eventive')}
			/>

			<TextControl
				label={__('Longitude', 'eventive')}
				value={meta._eventive_venue_long || ''}
				onChange={(value) => updateMeta('_eventive_venue_long', value)}
				help={__('Geographic longitude coordinate', 'eventive')}
			/>

			<TextControl
				label={__('Venue URL', 'eventive')}
				value={meta._eventive_venue_url || ''}
				onChange={(value) => updateMeta('_eventive_venue_url', value)}
				type="url"
				help={__('Official venue website', 'eventive')}
			/>

			<TextControl
				label={__('Venue Color', 'eventive')}
				value={meta._eventive_venue_color || ''}
				onChange={(value) => updateMeta('_eventive_venue_color', value)}
				type="color"
				help={__('Hex color code from Eventive', 'eventive')}
			/>

			<ToggleControl
				label={__('Use Reserved Seating', 'eventive')}
				checked={meta._eventive_use_reserved_seating || false}
				onChange={(value) => updateMeta('_eventive_use_reserved_seating', value)}
				help={__('Whether this venue uses reserved seating', 'eventive')}
			/>
		</PluginDocumentSettingPanel>
	);
};

registerPlugin('eventive-venue-properties', {
	render: VenuePropertiesPanel,
});
