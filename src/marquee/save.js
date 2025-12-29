/**
 * Eventive Marquee Block - Save Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Save component - renders the block markup on the frontend
 *
 * @param {Object} props            Block properties
 * @param          props.attributes
 * @return {JSX.Element} Save component
 */
export default function Save( { attributes } ) {
	const blockProps = useBlockProps.save();

	const {
		tag,
		exclude,
		number,
		stills,
		yearRound,
		overlay,
		overlayOpacity,
		caption,
		captionSpeed,
	} = attributes;

	return (
		<div
			{ ...blockProps }
			data-tag={ tag }
			data-exclude={ exclude }
			data-number={ number }
			data-stills={ stills ? 'true' : 'false' }
			data-year-round={ yearRound ? 'true' : 'false' }
			data-overlay-url={ overlay }
			data-overlay-opacity={ overlayOpacity }
			data-caption={ caption }
			data-caption-speed={ captionSpeed }
		>
			<div className="eventive-marquee-overlay" aria-hidden="true"></div>
			<div className="eventive-marquee-container">
				<div className="eventive-marquee">
					<div
						className="eventive-marquee-caption"
						aria-live="polite"
					>
						<div className="eventive-marquee-caption-track"></div>
					</div>
				</div>
			</div>
		</div>
	);
}
