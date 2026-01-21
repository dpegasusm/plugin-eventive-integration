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
			<div className="eventive-block-placeholder">
				<h3 className="eventive-block-placeholder__title">
					{ __( 'Eventive Account', 'eventive' ) }
				</h3>
				<div className="eventive-block-placeholder__description">
					<p>
						{ __(
							'Displays user account with details, passes, and tickets',
							'eventive'
						) }
					</p>
				</div>
			</div>
		</div>
	);
}
