/**
 * Fundraiser Block - Frontend View Script
 */
import { createRoot, render } from '@wordpress/element';

/**
 * Initialize Fundraiser blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const fundraiserBlocks = document.querySelectorAll(
		'.wp-block-eventive-fundraiser'
	);

	fundraiserBlocks.forEach( ( block ) => {
		const startDate = block.dataset.startTime;
		const endDate = block.dataset.endTime;
		const goalAmount = parseFloat( block.dataset.goalAmount ) || 1000;

		if ( ! startDate || ! endDate ) {
			const container = block.querySelector(
				'#eventive-donations-container'
			);
			if ( container ) {
				container.innerHTML =
					'<p>Error: Start and end dates are required.</p>';
			}
			return;
		}

		// Construct API call with nonce
		const endpoints = window.EventiveBlockData?.apiEndpoints || {};
		const nonce = window.EventiveBlockData?.eventNonce || '';

		wp.apiFetch( {
			path: `/eventive/v1/${
				endpoints.ledger || 'ledger'
			}?start_time=${ encodeURIComponent(
				startDate
			) }&end_time=${ encodeURIComponent(
				endDate
			) }&type=PAYMENT&eventive_nonce=${ nonce }`,
			method: 'GET',
		} )
			.then( ( data ) => {
				const donationsContainer = block.querySelector(
					'#eventive-donations-container'
				);
				let totalDonations = 0;

				// Process donations
				if ( data && Array.isArray( data.transactions ) ) {
					data.transactions.forEach( ( transaction ) => {
						if ( transaction.category?.ref_label === 'Donation' ) {
							totalDonations +=
								parseFloat( transaction.gross ) / 100;
						}
					} );
				}

				const progressPercent = Math.min(
					( totalDonations / goalAmount ) * 100,
					100
				).toFixed( 2 );

				if ( donationsContainer ) {
					donationsContainer.innerHTML = `
						<div>
							<h3>Fundraiser Progress</h3>
							<div class="progress-bar-container">
								<div class="progress-bar" style="--progress-percent: ${ progressPercent }%; width: ${ progressPercent }%;"></div>
							</div>
							<p>$${ totalDonations.toFixed( 2 ) } of $${ goalAmount.toFixed(
								2
							) } raised (${ progressPercent }%)</p>
						</div>
					`;
				}
			} )
			.catch( ( error ) => {
				const container = block.querySelector(
					'#eventive-donations-container'
				);
				if ( container ) {
					container.innerHTML = `<p>Error fetching donations: ${ error.message }</p>`;
				}
			} );
	} );
} );
