/**
 * Eventive Events List Block - Save Component
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
		limit,
		tagId,
		excludeTags,
		venueId,
		eventDescription,
		shortDescription,
		image,
		virtual,
		showFilter,
		view,
		showUndated,
		includePast,
		startDate,
		endDate,
	} = attributes;

	return (
		<div
			{ ...blockProps }
			data-limit={ limit }
			data-tag-id={ tagId }
			data-exclude-tags={ excludeTags }
			data-venue-id={ venueId }
			data-event-description={ eventDescription ? 'true' : 'false' }
			data-short-description={ shortDescription ? 'true' : 'false' }
			data-image={ image }
			data-virtual={ virtual ? 'true' : 'false' }
			data-show-filter={ showFilter ? 'true' : 'false' }
			data-view={ view }
			data-show-undated={ showUndated ? 'true' : 'false' }
			data-include-past={ includePast ? 'true' : 'false' }
			data-start-date={ startDate }
			data-end-date={ endDate }
		>
			<div className="event-schedule-list">
				<p>Loading events...</p>
			</div>
		</div>
	);
}
