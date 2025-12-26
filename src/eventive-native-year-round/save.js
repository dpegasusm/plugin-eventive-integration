/**
 * Eventive Native Year-Round Block - Save Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Save component - renders the block markup on the frontend
 *
 * @param {Object} props Block properties
 * @return {JSX.Element} Save component
 */
export default function Save( { attributes } ) {
	const blockProps = useBlockProps.save();
	const { image, description, venue, details } = attributes;

	return (
		<div
			{ ...blockProps }
			data-image={ image }
			data-description={ description ? 'true' : 'false' }
			data-venue={ venue ? 'true' : 'false' }
			data-details={ details ? 'true' : 'false' }
		>
			<div className="eventive-native-year-round-placeholder">
				<p>Loading year-round events...</p>
			</div>
		</div>
	);
}
