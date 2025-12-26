/**
 * Eventive Single Film Block (Selector) - Save Component
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
	const { type, id } = attributes;

	return (
		<div
			{ ...blockProps }
			data-type={ type }
			data-id={ id }
		>
			<div className="single-film-block-container">
				<p>Loading { type }...</p>
			</div>
		</div>
	);
}
