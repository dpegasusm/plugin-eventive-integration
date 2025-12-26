/**
 * Film Guide Block - Frontend View Script
 */
import { createRoot } from '@wordpress/element';

// Import the existing film guide logic
import '../film-guide/eventive-film-guide.js';

/**
 * Initialize Film Guide blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const filmGuideBlocks = document.querySelectorAll( '.wp-block-eventive-film-guide' );

	filmGuideBlocks.forEach( ( block ) => {
		// The existing eventive-film-guide.js handles initialization
		// This view.js ensures proper loading order for React-based enhancements
		
		// If block needs React-based UI enhancements, initialize here
		if ( block.dataset.reactEnhanced ) {
			const root = createRoot( block );
			// Future: Add React components if needed
		}
	} );
} );
