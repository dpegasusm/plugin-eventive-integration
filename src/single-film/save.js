/**
 * Eventive Single Film Block - Save Component
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
	const { filmId, eventId } = attributes;

	return (
		<div
			{ ...blockProps }
			data-film-id={ filmId }
			data-event-id={ eventId }
		>
			<div id="single-film-or-event-container">
				<div id="hero-section">
					{ /* Hero background will be dynamically loaded */ }
				</div>
				<div id="details-container">
					{ /* Film or Event details will be dynamically loaded */ }
				</div>
			</div>
		</div>
	);
}
