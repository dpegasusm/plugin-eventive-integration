/**
 * Eventive Film Details Block - Frontend React Component
 */
import { createRoot } from '@wordpress/element';

// Import the original JS logic
import './eventive-film-details.js';

/**
 * Initialize all film details blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-film-details'
	);

	blocks.forEach( ( block ) => {
		// Get film ID from data attribute or URL parameter
		let filmId = block.getAttribute( 'data-film-id' ) || '';
		const urlParams = new URLSearchParams( window.location.search );
		const urlFilmId = urlParams.get( 'film-id' );
		if ( urlFilmId ) {
			filmId = urlFilmId;
		}

		if ( ! filmId ) {
			block.innerHTML =
				'<div class="error-message">Please provide a valid film ID.</div>';
			return;
		}

		// Extract attributes from data attributes
		const showEvents =
			block.getAttribute( 'data-show-events' ) === 'true';
		const showDetails =
			block.getAttribute( 'data-show-details' ) === 'true';
		const showTags = block.getAttribute( 'data-show-tags' ) === 'true';
		const excludeVirtual =
			block.getAttribute( 'data-exclude-virtual' ) === 'true';

		// Get WP options passed from PHP via global variables
		const eventBucket = window.eventiveOptions?.eventBucket || '';

		// Generate unique container ID
		const containerId =
			'film-details-container-' +
			Math.random().toString( 36 ).substring( 2, 9 );

		// Replace the block content with the container
		block.innerHTML = `<div id="${ containerId }" class="eventive-film-details"></div>`;

		// Push configuration for the original JS to consume
		window.__EVT_FILM_DETAILS = window.__EVT_FILM_DETAILS || [];
		window.__EVT_FILM_DETAILS.push( {
			containerId,
			filmId,
			eventBucket,
			showEvents,
			showDetails,
			showTags,
			excludeVirtual,
		} );
	} );
} );
