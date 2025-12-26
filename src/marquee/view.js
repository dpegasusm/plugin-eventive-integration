/**
 * Marquee Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

// Import the existing marquee logic
import '../marquee/eventive-marquee.js';

/**
 * Initialize Marquee blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const marqueeBlocks = document.querySelectorAll( '.wp-block-eventive-marquee' );

	marqueeBlocks.forEach( ( block ) => {
		// The existing eventive-marquee.js handles initialization
		// This view.js ensures proper loading order
	} );
} );
