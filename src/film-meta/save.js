/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Save component for Film Meta block
 * Saves block attributes as data attributes for the React component
 * Note: postId is provided via EventiveBlockData (localized in PHP)
 *
 * @param {Object} props Block properties
 * @return {JSX.Element} Save component
 */
export default function save( { attributes } ) {
	const { metaField, label, showLabel } = attributes;

	const blockProps = useBlockProps.save( {
		'data-meta-field': metaField,
		'data-label': label,
		'data-show-label': String( showLabel ),
	} );

	return (
		<div { ...blockProps }>
			<div className="eventive-loading">Loading...</div>
		</div>
	);
}
