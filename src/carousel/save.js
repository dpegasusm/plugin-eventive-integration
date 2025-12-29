/**
 * React hook that is used to mark the block wrapper element.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * The save function defines the structure of the block as it should be saved to the database.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @param {Object} props            Block properties.
 * @param {Object} props.attributes Block attributes.
 * @return {Element} Element to render.
 */
export default function Save( { attributes } ) {
	const { limit = 10, showDescription = true } = attributes;

	const blockProps = useBlockProps.save( {
		'data-limit': limit,
		'data-show-description': showDescription ? 'true' : 'false',
	} );

	return (
		<div { ...blockProps }>{ /* React will mount here via view.js */ }</div>
	);
}
