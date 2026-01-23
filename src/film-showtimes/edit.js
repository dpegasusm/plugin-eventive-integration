/**
 * Eventive Film Showtimes Block - Editor Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

/**
 * Edit component for Eventive Film Showtimes block
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
					{ __( 'Eventive Film Showtimes', 'eventive' ) }
				</h3>
				<div className="eventive-block-placeholder__description">
					<p>
						{ __(
							'This block will display upcoming showtimes for the current film when published.',
							'eventive'
						) }
					</p>
					<p style={ { fontSize: '0.9em', color: '#666' } }>
						{ __(
							'Note: This block only works on Eventive Film post types.',
							'eventive'
						) }
					</p>
				</div>
			</div>
		</div>
	);
}
