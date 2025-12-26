/**
 * Eventive Account Tickets Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

/**
 * Edit component for Eventive Account Tickets block
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
					background: '#f9f9f9',
				} }
			>
				<p style={ { margin: 0, color: '#666' } }>
					<strong>
						{ __( 'Eventive Account Tickets', 'eventive' ) }
					</strong>
				</p>
				<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
					{ __(
						'Displays tickets for logged-in users with barcode viewing.',
						'eventive'
					) }
				</p>
			</div>
		</div>
	);
}
