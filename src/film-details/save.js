/**
 * Eventive Film Details Block - Save Component
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
	const { filmId, showEvents, showDetails, showTags, excludeVirtual } =
		attributes;

	return (
		<div
			{ ...blockProps }
			data-film-id={ filmId }
			data-show-events={ showEvents ? 'true' : 'false' }
			data-show-details={ showDetails ? 'true' : 'false' }
			data-show-tags={ showTags ? 'true' : 'false' }
			data-exclude-virtual={ excludeVirtual ? 'true' : 'false' }
		>
			<div className="eventive-film-details">
				<p>Loading film details...</p>
			</div>
		</div>
	);
}
