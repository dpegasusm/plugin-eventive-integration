/**
 * Eventive Film Guide Block - Save Component
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
		tagName,
		excludeTag,
		filmId,
		showEvents,
		showFilter,
		image,
		view,
		showTags,
		showDescription,
		showDetails,
		yearRound,
		search,
		showViewSwitcher,
	} = attributes;

	return (
		<div
			{ ...blockProps }
			data-tag-name={ tagName }
			data-exclude-tag={ excludeTag }
			data-film-id={ filmId }
			data-show-events={ showEvents ? 'true' : 'false' }
			data-show-filter={ showFilter ? 'true' : 'false' }
			data-image={ image }
			data-view={ view }
			data-show-tags={ showTags ? 'true' : 'false' }
			data-show-description={ showDescription ? 'true' : 'false' }
			data-show-details={ showDetails ? 'true' : 'false' }
			data-year-round={ yearRound ? 'true' : 'false' }
			data-search={ search ? 'true' : 'false' }
			data-show-view-switcher={ showViewSwitcher ? 'true' : 'false' }
		>
			<div className="eventive-film-guide-container">
				<p>Loading film guide...</p>
			</div>
		</div>
	);
}
