/**
 * Eventive Events List Block - Frontend React Component
 */
import { createRoot } from '@wordpress/element';

// Import the original JS logic
import './eventive-events-list.js';

/**
 * Initialize all events list blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-events-list'
	);

	blocks.forEach( ( block ) => {
		// Extract attributes from data attributes
		const limit = parseInt( block.getAttribute( 'data-limit' ) ) || 10;
		const tagId = block.getAttribute( 'data-tag-id' ) || '';
		const excludeTags = block.getAttribute( 'data-exclude-tags' ) || '';
		const venueId = block.getAttribute( 'data-venue-id' ) || '';
		const eventDescription =
			block.getAttribute( 'data-event-description' ) === 'true';
		const shortDescription =
			block.getAttribute( 'data-short-description' ) === 'true';
		const image = block.getAttribute( 'data-image' ) || 'cover';
		const includeVirtual =
			block.getAttribute( 'data-virtual' ) === 'true';
		const showFilter =
			block.getAttribute( 'data-show-filter' ) === 'true';
		const view = block.getAttribute( 'data-view' ) || 'list';
		const showUndated =
			block.getAttribute( 'data-show-undated' ) === 'true';
		const includePast =
			block.getAttribute( 'data-include-past' ) === 'true';
		const startDate = block.getAttribute( 'data-start-date' ) || '';
		const endDate = block.getAttribute( 'data-end-date' ) || '';

		// Set data attributes for the original JS to use
		block.setAttribute( 'data-limit', limit );
		block.setAttribute( 'data-tag-id', tagId );
		block.setAttribute( 'data-exclude-tags', excludeTags );
		block.setAttribute( 'data-venue-id', venueId );
		block.setAttribute(
			'data-event-description',
			eventDescription ? 'yes' : 'no'
		);
		block.setAttribute(
			'data-short-description',
			shortDescription ? 'yes' : 'no'
		);
		block.setAttribute( 'data-image', image );
		block.setAttribute( 'data-virtual', includeVirtual ? 'yes' : 'no' );
		block.setAttribute( 'data-show-filter', showFilter ? 'yes' : 'no' );
		block.setAttribute( 'data-view', view );
		block.setAttribute( 'data-show-undated', showUndated ? 'true' : 'false' );
		block.setAttribute( 'data-include-past', includePast ? 'true' : 'false' );
		block.setAttribute( 'data-start-date', startDate );
		block.setAttribute( 'data-end-date', endDate );

		// The original eventive-events-list.js will handle the rendering
		// It looks for elements with specific data attributes
	} );
} );
