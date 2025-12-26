/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * The save function defines the structure of the block as it should be saved to the database.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#save
 *
 * @param {Object} props Block properties.
 * @param {Object} props.attributes Block attributes.
 * @return {Element} Element to render.
 */
export default function Save( { attributes } ) {
	const { loginLinkText = 'Log in to your account' } = attributes;

	const blockProps = useBlockProps.save( {
		'data-login-link-text': loginLinkText,
	} );

	return (
		<div { ...blockProps }>
			{/* React will mount here via view.js */}
		</div>
	);
}
