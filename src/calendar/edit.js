/**
 * Eventive Calendar Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

/**
 * Edit component for Eventive Calendar block
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
					{ __( 'Eventive Calendar', 'eventive' ) }
				</h3>
				<div className="eventive-block-placeholder__description">
					<p>
						{ __(
							'Monthly calendar view of Eventive events',
							'eventive'
						) }
					</p>
				</div>
			</div>
		</div>
	);
}
