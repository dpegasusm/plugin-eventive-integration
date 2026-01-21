/**
 * Eventive Account Tickets Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * Account Tickets Component
 */
function AccountTicketsApp() {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ tickets, setTickets ] = useState( [] );
	const [ showBarcodeModal, setShowBarcodeModal ] = useState( false );
	const [ selectedTicket, setSelectedTicket ] = useState( null );

	useEffect( () => {
		const checkLoginAndFetch = async () => {
			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				setTimeout( checkLoginAndFetch, 100 );
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn ) {
					await fetchTickets();
				}
			} catch ( error ) {
				console.error( 'Error checking login:', error );
			} finally {
				setIsLoading( false );
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLoginAndFetch );
		}

		checkLoginAndFetch();
	}, [] );

	const fetchTickets = async () => {
		try {
			const resp = await window.Eventive.request( {
				method: 'GET',
				path: 'tickets?self=true',
				authenticatePerson: true,
			} );

			const list = ( resp && ( resp.tickets || resp ) ) || [];
			setTickets( list );
		} catch ( error ) {
			console.error(
				'[eventive-account-tickets] Error fetching tickets:',
				error
			);
		}
	};

	const handleShowBarcode = ( ticket ) => {
		setSelectedTicket( ticket );
		setShowBarcodeModal( true );
	};

	const closeModal = () => {
		setShowBarcodeModal( false );
		setSelectedTicket( null );
	};

	if ( isLoading ) {
		return (
			<div
				className="eventive-login-container"
				style={ {
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '100px',
				} }
			>
				<div className="loader"></div>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-notice" style={ { textAlign: 'center' } }>
				Please log in to view your tickets.
			</div>
		);
	}

	return (
		<div className="eventive-account-tickets">
			<div className="eventive-tickets-column">
				<h2>Tickets</h2>
				{ tickets.length === 0 ? (
					<p>No tickets found.</p>
				) : (
					<div className="eventive-tickets-list">
						{ tickets.map( ( ticket, idx ) => {
							const filmName =
								ticket.film_name ||
								ticket.event_name ||
								'Event';
							const showTime =
								ticket.showtime || ticket.start_time;

							return (
								<div
									key={ idx }
									className="eventive-ticket-card"
								>
									<div className="eventive-ticket-card__body">
										<div className="eventive-ticket-card__title">
											{ filmName }
										</div>
										{ showTime && (
											<div className="eventive-ticket-card__time">
												{ new Date(
													showTime
												).toLocaleString() }
											</div>
										) }
									</div>
									<div className="eventive-ticket-card__actions">
										<button
											className="eventive-ticket-btn"
											onClick={ () =>
												handleShowBarcode( ticket )
											}
										>
											View Ticket
										</button>
									</div>
								</div>
							);
						} ) }
					</div>
				) }
			</div>

			{ /* Barcode Modal */ }
			{ showBarcodeModal && selectedTicket && (
				<div
					className="eventive-ticket-barcode-modal"
					onClick={ ( e ) =>
						e.target.classList.contains(
							'eventive-ticket-barcode-modal'
						) && closeModal()
					}
				>
					<div className="barcode-modal-inner">
						<button
							className="modal-close-btn"
							onClick={ closeModal }
						>
							×
						</button>
						<div className="barcode-modal-body">
							<h3>
								{ selectedTicket.film_name ||
									selectedTicket.event_name }
							</h3>
							{ selectedTicket.barcode_url && (
								<img
									src={ selectedTicket.barcode_url }
									alt="Ticket Barcode"
									className="barcode-img"
								/>
							) }
							{ selectedTicket.showtime && (
								<p className="ticket-time">
									{ new Date(
										selectedTicket.showtime
									).toLocaleString() }
								</p>
							) }
						</div>
					</div>
				</div>
			) }
		</div>
	);
}

/**
 * Initialize block on all matching elements
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-account-tickets'
	);

	blocks.forEach( ( block ) => {
		const root = createRoot( block );
		root.render( <AccountTicketsApp /> );
	} );
} );
