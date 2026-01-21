/**
 * Eventive Events Block - Save Component
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
	const {
		tagId,
		venueId,
		image,
		description,
		showFilter,
		eventId,
		filmsBase,
	} = attributes;

	return (
		<div
			{ ...blockProps }
			data-tag-id={ tagId }
			data-venue-id={ venueId }
			data-image={ image }
			data-description={ description ? 'true' : 'false' }
			data-show-filter={ showFilter ? 'true' : 'false' }
			data-event-id={ eventId }
			data-films-base={ filmsBase }
		>
			<div className="event-schedule-container">
				<p className='eventive-film-loading-text'>Loading events...</p>
			</div>
		</div>
	);
}
