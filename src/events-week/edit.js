/**
 * Eventive Events Week Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

/**
 * Edit component for Eventive Events Week block
 *
 * @param {Object} props Block properties
 * @return {JSX.Element} Edit component
 */
export default function Edit() {
	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			<div
				style={ {
					padding: '20px',
					border: '2px dashed #ccc',
					borderRadius: '8px',
					textAlign: 'center',
					backgroundColor: '#f9f9f9',
				} }
			>
				<p style={ { margin: 0, fontWeight: 600 } }>
					📅 { __( 'Eventive Events Week', 'eventive' ) }
				</p>
				<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
					{ __(
						'Weekly calendar grid will display here',
						'eventive'
					) }
				</p>
			</div>
		</div>
	);
}
