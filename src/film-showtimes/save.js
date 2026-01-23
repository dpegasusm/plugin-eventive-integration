/**
 * Eventive Film Showtimes Block - Save Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Save component for Eventive Film Showtimes block
 * Saves a placeholder div that will be replaced by React component on frontend
 *
 * @return {JSX.Element} Save component
 */
export default function save() {
	const blockProps = useBlockProps.save();

	return (
		<div { ...blockProps }>
			<div className="eventive-loading">Loading showtimes...</div>
		</div>
	);
}
