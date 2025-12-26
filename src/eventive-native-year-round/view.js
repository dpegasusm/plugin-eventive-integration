/**
 * Eventive Native Year-Round Block - Frontend React Component
 */
import { createRoot } from '@wordpress/element';

// Import the original JS logic
import './eventive-native-year-round.js';

/**
 * Initialize all native year-round blocks on the page
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-native-year-round'
	);

	blocks.forEach( ( block ) => {
		// Extract attributes from data attributes
		const imageType = block.getAttribute( 'data-image' ) || 'poster';
		const showDescription =
			block.getAttribute( 'data-description' ) === 'true';
		const showVenue = block.getAttribute( 'data-venue' ) === 'true';
		const showDetails = block.getAttribute( 'data-details' ) === 'true';

		// Generate unique IDs for this instance
		const uid =
			'nyr_' + Math.random().toString( 36 ).substring( 2, 9 );
		const ids = {
			root: uid + '_root',
			calWrap: uid + '_calendar_wrap',
			buttons: uid + '_calendar_buttons',
			prev: uid + '_prev',
			next: uid + '_next',
			events: uid + '_events',
		};

		// Get WP options passed from PHP via global variables
		const eventBucket =
			window.eventiveOptions?.eventBucket || '';
		const apiKey = window.eventiveOptions?.apiKey || '';
		const filmDetailBaseURL =
			window.eventiveOptions?.filmDetailBaseURL || '';
		const usePrettyPermalinks =
			window.eventiveOptions?.usePrettyPermalinks || false;
		const filmSyncEnabled =
			window.eventiveOptions?.filmSyncEnabled || false;

		// Push configuration for this instance
		window.__EVT_NATIVE_YR = window.__EVT_NATIVE_YR || [];
		window.__EVT_NATIVE_YR.push( {
			ids,
			eventBucket,
			apiKey,
			imageType,
			showDescription,
			showVenue,
			showDetails,
			filmDetailBaseURL,
			usePrettyPermalinks,
			filmSyncEnabled,
		} );

		// Create the container structure
		block.innerHTML = `
			<div id="${ ids.root }" class="eventive-native-year-round-container">
				<div id="${ ids.calWrap }" class="eventive-calendar-wrap">
					<div id="${ ids.buttons }" class="eventive-calendar-buttons">
						<button id="${ ids.prev }" class="eventive-nav-btn prev">← Previous Week</button>
						<span class="week-label">Loading...</span>
						<button id="${ ids.next }" class="eventive-nav-btn next">Next Week →</button>
					</div>
					<div id="${ ids.events }" class="eventive-events-container">
						<p>Loading events...</p>
					</div>
				</div>
			</div>
		`;
	} );
} );
