/**
 * Eventive Venues Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { Placeholder, Spinner } from '@wordpress/components';
import './editor.scss';

/**
 * Edit component for Eventive Venues block
 *
 * @return {JSX.Element} Edit component
 */
export default function Edit() {
	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			<Placeholder
				icon="location-alt"
				label={__('Eventive Venues', 'eventive')}
				instructions={__(
					'This block displays a list of venues from your Eventive account. The venues will be loaded dynamically on the frontend.',
					'eventive'
				)}
			>
				<div style={{ padding: '20px', textAlign: 'center' }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '40px',
							border: '2px dashed #ddd',
							borderRadius: '4px',
							backgroundColor: '#f9f9f9',
						}}
					>
						<span
							className="dashicons dashicons-location-alt"
							style={{ fontSize: '48px', color: '#666', marginRight: '10px' }}
						></span>
						<div style={{ textAlign: 'left' }}>
							<strong>{__('Eventive Venues Block', 'eventive')}</strong>
							<p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>
								{__('Venues will be displayed here on the frontend', 'eventive')}
							</p>
						</div>
					</div>
				</div>
			</Placeholder>
		</div>
	);
}