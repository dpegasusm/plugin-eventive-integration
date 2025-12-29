/**
 * Eventive Events Week Block - Save Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Save component - renders the block markup on the frontend
 *
 * @return {JSX.Element} Save component
 */
export default function Save() {
	const blockProps = useBlockProps.save();

	return (
		<div { ...blockProps }>
			<div
				id="weekly-calendar-container"
				className="weekly-calendar-container"
			>
				<div
					id="weekly-calendar-controls"
					className="weekly-calendar-controls"
				>
					<button id="prev-week" className="week-nav-btn">
						← Previous Week
					</button>
					<span id="current-week-range">Loading...</span>
					<button id="next-week" className="week-nav-btn">
						Next Week →
					</button>
				</div>
				<div id="weekly-calendar-grid" className="weekly-calendar-grid">
					<p>Loading events...</p>
				</div>
				<div id="event-modal" className="event-modal">
					<div className="modal-content">
						<span className="close-modal">&times;</span>
						<div id="modal-details"></div>
					</div>
				</div>
			</div>
		</div>
	);
}
