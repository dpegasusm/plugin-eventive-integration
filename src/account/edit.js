/**
 * Eventive Account Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

/**
 * Edit component for Eventive Account block
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
					backgroundColor: '#f5f5f5',
					border: '1px solid #ddd',
					borderRadius: '4px',
					textAlign: 'center',
				} }
			>
				<p style={ { margin: 0, color: '#666' } }>
					<strong>{ __( 'Eventive Account', 'eventive' ) }</strong>
				</p>
				<p style={ { margin: '8px 0 0', fontSize: '14px' } }>
					{ __(
						'Displays user account with details, passes, and tickets',
						'eventive'
					) }
				</p>
			</div>
		</div>
	);
}
