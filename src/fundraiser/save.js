/**
 * Eventive Fundraiser Block - Save Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Save component - renders the block markup on the frontend
 *
 * @param {Object} props            Block properties
 * @param          props.attributes
 * @return {JSX.Element} Save component
 */
export default function Save( { attributes } ) {
	const blockProps = useBlockProps.save();
	const { startTime, endTime, goalAmount } = attributes;

	return (
		<div
			{ ...blockProps }
			data-start-time={ startTime }
			data-end-time={ endTime }
			data-goal-amount={ goalAmount }
		>
			<div id="eventive-donations-container">
				<p>Loading fundraiser progress...</p>
			</div>
		</div>
	);
}
