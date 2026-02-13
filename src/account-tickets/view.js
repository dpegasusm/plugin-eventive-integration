/**
 * Eventive Account Tickets Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect, useRef } from '@wordpress/element';

// Helper functions
function pickFirst( ...args ) {
	for ( let i = 0; i < args.length; i++ ) {
		const v = args[ i ];
		if ( v !== undefined && v !== null && v !== '' ) {
			return v;
		}
	}
	return '';
}

function ensureAbsolute( url ) {
	if ( ! url ) {
		return url;
	}
	if ( /^https?:\/\//i.test( url ) ) {
		return url;
	}
	return (
		'https://api.eventive.org' +
		( url.charAt( 0 ) === '/' ? '' : '/' ) +
		url
	);
}

function fmtDT( iso ) {
	try {
		const d = new Date( iso );
		if ( ! iso || isNaN( d ) ) {
			return '';
		}
		return d.toLocaleString( [], {
			dateStyle: 'medium',
			timeStyle: 'short',
		} );
	} catch ( _ ) {
		return iso || '';
	}
}

function ticketTitle( t ) {
	const ev = t.event || t.screening || t.showing || {};
	return pickFirst( t.name, ev.name, ev.title, 'Ticket' );
}

function ticketWhenWhere( t ) {
	const ev = t.event || t.screening || t.showing || {};
	const dt = pickFirst(
		ev.start_time,
		ev.begins_at,
		ev.starts_at,
		t.starts_at
	);
	const venue = pickFirst(
		ev.venue && ev.venue.name,
		ev.venue_name,
		t.venue_name
	);
	const bits = [];
	if ( dt ) {
		bits.push( fmtDT( dt ) );
	}
	if ( venue ) {
		bits.push( venue );
	}
	return bits.join( ' • ' );
}

function ticketSeatInfo( t ) {
	const seat = pickFirst( t.seat_label, t.seat, t.seat && t.seat.name );
	const row = pickFirst( t.row_label, t.row );
	const sec = pickFirst( t.section_label, t.section );
	const parts = [];
	if ( sec ) {
		parts.push( 'Sec ' + sec );
	}
	if ( row ) {
		parts.push( 'Row ' + row );
	}
	if ( seat ) {
		parts.push( 'Seat ' + seat );
	}
	return parts.join( ' · ' );
}

function isVirtual( t ) {
	const ev = t.event || t.screening || t.showing || {};
	return !! pickFirst( t.is_virtual, ev.is_virtual, ev.virtual );
}

function virtualUrl( t ) {
	return pickFirst(
		t.virtual_url,
		t.watch_url,
		t.player_url,
		t.event && t.event.virtual_url
	);
}

function ticketQR( t ) {
	return ensureAbsolute(
		pickFirst( t.qr_code_path, t.barcode_path, t.barcode && t.barcode.path )
	);
}

function toStartMs( t ) {
	const ev = t.event || t.screening || t.showing || {};
	const dt = pickFirst(
		ev.start_time,
		ev.begins_at,
		ev.starts_at,
		t.starts_at
	);
	const ms = Date.parse( dt || '' );
	return isNaN( ms ) ? null : ms;
}

function isPastEvent( t ) {
	const ms = toStartMs( t );
	if ( ms === null ) {
		return false;
	}
	return ms < Date.now();
}

function getUnlockedUntilMs( t ) {
	const ev = t.event || t.screening || t.showing || {};
	const u = pickFirst(
		t.unlocked_until,
		t.virtual_unlocked_until,
		ev.unlocked_until,
		ev.virtual_unlocked_until
	);
	const ms = Date.parse( u || '' );
	return isNaN( ms ) ? null : ms;
}

function isVirtualExpired( t ) {
	if ( ! isVirtual( t ) ) {
		return false;
	}
	const ms = getUnlockedUntilMs( t );
	if ( ms === null ) {
		return false;
	}
	return ms < Date.now();
}

function scannedAtText( t ) {
	const s = pickFirst( t.scanned_at, t.scan && t.scan.scanned_at );
	if ( ! s ) {
		return '';
	}
	try {
		const d = new Date( s );
		return d.toLocaleString( [], {
			dateStyle: 'medium',
			timeStyle: 'short',
		} );
	} catch ( _ ) {
		return String( s );
	}
}

function getEventId( t ) {
	return t.event && t.event.id ? t.event.id : '';
}

/**
 * Account Tickets Component
 * @param root0
 * @param root0.bucket
 */
function AccountTicketsApp( { bucket } ) {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ tickets, setTickets ] = useState( [] );
	const [ filter, setFilter ] = useState( 'all' );
	const [ showBarcodeModal, setShowBarcodeModal ] = useState( false );
	const [ selectedTicket, setSelectedTicket ] = useState( null );

	const hasFetchedRef = useRef( false );

	useEffect( () => {
		let cancelled = false;
		let tries = 0;
		const maxTries = 60;

		const checkLoginAndFetch = () => {
			if ( cancelled ) {
				return;
			}

			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				tries++;
				if ( tries < maxTries ) {
					setTimeout( checkLoginAndFetch, 100 );
				} else {
					setIsLoading( false );
				}
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn && ! hasFetchedRef.current ) {
					hasFetchedRef.current = true;
					fetchTickets( cancelled );
				}
			} catch ( error ) {
				// Silently handle check errors
			} finally {
				setIsLoading( false );
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLoginAndFetch );
		}
		checkLoginAndFetch();

		return () => {
			cancelled = true;
			if ( window.Eventive && window.Eventive.off ) {
				window.Eventive.off( 'ready', checkLoginAndFetch );
			}
		};
	}, [] );

	const fetchTickets = ( cancelled ) => {
		// Double-check login before making any authenticated request
		if (
			! window.Eventive ||
			! window.Eventive.isLoggedIn ||
			! window.Eventive.isLoggedIn()
		) {
			setIsLoggedIn( false );
			setIsLoading( false );
			hasFetchedRef.current = false;
			return;
		}

		const qs = {};
		if ( bucket ) {
			try {
				qs.conditions = JSON.stringify( { event_bucket: bucket } );
			} catch ( _ ) {}
		}

		// Primary attempt: people/self/tickets
		window.Eventive.request( {
			method: 'GET',
			path: 'people/self/tickets',
			qs,
			authenticatePerson: true,
		} )
			.then( ( res ) => {
				if ( cancelled ) {
					return;
				}
				const list = ( res && ( res.tickets || res ) ) || [];
				setTickets( list );
			} )
			.catch( ( err ) => {
				if ( cancelled ) {
					return;
				}
				// If the error is auth-related, mark as not logged in
				const errMsg =
					( err && ( err.message || err.error || '' ) ) + '';
				if (
					errMsg.includes( 'InvalidCredentials' ) ||
					errMsg.includes( '401' ) ||
					errMsg.includes( 'Unauthorized' ) ||
					errMsg.includes( 'not logged in' )
				) {
					setIsLoggedIn( false );
					setIsLoading( false );
					hasFetchedRef.current = false;
					return;
				}

				// Fallback for non-auth errors: people/self/tickets_including_global
				window.Eventive.request( {
					method: 'GET',
					path: 'people/self/tickets_including_global',
					qs,
					authenticatePerson: true,
				} )
					.then( ( res2 ) => {
						if ( cancelled ) {
							return;
						}
						const list =
							( res2 && ( res2.tickets || res2 ) ) || [];
						setTickets( list );
					} )
					.catch( ( fallbackErr ) => {
						if ( cancelled ) {
							return;
						}
						const fbMsg =
							( fallbackErr &&
								( fallbackErr.message ||
									fallbackErr.error ||
									'' ) ) + '';
						if (
							fbMsg.includes( 'InvalidCredentials' ) ||
							fbMsg.includes( '401' ) ||
							fbMsg.includes( 'Unauthorized' ) ||
							fbMsg.includes( 'not logged in' )
						) {
							setIsLoggedIn( false );
							hasFetchedRef.current = false;
						}
					} );
			} );
	};

	const handleShowBarcode = ( ticket ) => {
		setSelectedTicket( ticket );
		setShowBarcodeModal( true );
	};

	const closeModal = () => {
		setShowBarcodeModal( false );
		setSelectedTicket( null );
	};

	// Close modal on ESC key
	useEffect( () => {
		const handleEsc = ( e ) => {
			if ( e.key === 'Escape' ) {
				closeModal();
			}
		};

		if ( showBarcodeModal ) {
			document.addEventListener( 'keydown', handleEsc );
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener( 'keydown', handleEsc );
			document.body.style.overflow = '';
		};
	}, [ showBarcodeModal ] );

	// Rebuild Eventive buttons when tickets change
	useEffect( () => {
		if ( tickets.length > 0 ) {
			setTimeout( () => {
				if ( window.Eventive && window.Eventive.rebuild ) {
					try {
						window.Eventive.rebuild();
					} catch ( e ) {}
				}
			}, 100 );
		}
	}, [ tickets, filter ] );

	// Group tickets by category
	const groupTickets = () => {
		const now = Date.now();
		const upcoming = [];
		const virtuals = [];
		const past = [];

		tickets.forEach( ( t ) => {
			const ms = toStartMs( t );
			if ( isVirtual( t ) ) {
				virtuals.push( t );
				return;
			}
			if ( ms === null ) {
				past.push( t );
				return;
			}
			if ( ms >= now ) {
				upcoming.push( t );
			} else {
				past.push( t );
			}
		} );

		return { upcoming, virtuals, past };
	};

	const renderTicketCard = ( ticket, idx ) => {
		const title = ticketTitle( ticket );
		const meta = ticketWhenWhere( ticket );
		const seat = ticketSeatInfo( ticket );
		const virt = isVirtual( ticket );
		const past = isPastEvent( ticket );
		const scanned = scannedAtText( ticket );
		const expired = isVirtualExpired( ticket );
		const evtId = getEventId( ticket );

		return (
			<div key={ idx } className="eventive-ticket-card">
				<div className="eventive-ticket-card__body">
					<div className="eventive-ticket-card__title">{ title }</div>
					<div>
						{ scanned && (
							<span className="evt-badge evt-badge-scanned">
								Scanned { scanned }
							</span>
						) }
						{ ! virt && past && (
							<span className="evt-badge evt-badge-past">
								Event passed
							</span>
						) }
						{ virt && expired && (
							<span className="evt-badge evt-badge-expired">
								Virtual window closed
							</span>
						) }
					</div>
					<div className="eventive-ticket-card__meta">{ meta }</div>
					{ seat && (
						<div className="eventive-ticket-card__seat">
							{ seat }
						</div>
					) }
				</div>
				<div className="eventive-ticket-card__actions">
					{ virt ? (
						expired ? (
							<span className="evt-badge evt-badge-expired">
								Virtual window closed
							</span>
						) : (
							<div
								className="eventive-button"
								data-event={ evtId || '' }
							></div>
						)
					) : (
						<>
							<button
								className="evt-btn evt-btn-secondary"
								onClick={ () => handleShowBarcode( ticket ) }
							>
								Show Code
							</button>
							{ evtId && (
								<div
									className="eventive-button"
									data-vote-event={ evtId }
									data-vote="true"
								></div>
							) }
						</>
					) }
				</div>
			</div>
		);
	};

	if ( isLoading ) {
		return (
			<div className="eventive-login-container">
				<div className="loader"></div>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-notice">
				Please log in to view your tickets.
			</div>
		);
	}

	if ( tickets.length === 0 ) {
		return (
			<div className="eventive-account-tickets">
				<div className="eventive-tickets-column">
					<h2>Tickets</h2>
					<p>No tickets found for this account.</p>
				</div>
			</div>
		);
	}

	const { upcoming, virtuals, past } = groupTickets();

	// Apply filter
	let displayUpcoming = upcoming;
	let displayVirtuals = virtuals;
	let displayPast = past;

	if ( filter === 'upcoming' ) {
		displayVirtuals = [];
		displayPast = [];
	} else if ( filter === 'virtual' ) {
		displayUpcoming = [];
		displayPast = [];
	} else if ( filter === 'past' ) {
		displayUpcoming = [];
		displayVirtuals = [];
	}

	return (
		<div className="eventive-account-tickets">
			<div className="eventive-tickets-column">
				<h2>Tickets</h2>

				{ /* Filter Bar */ }
				<div className="eventive-ticket-filters">
					<label htmlFor="ticket-filter">Show:</label>
					<select
						id="ticket-filter"
						className="eventive-ticket-filter-select"
						value={ filter }
						onChange={ ( e ) => setFilter( e.target.value ) }
					>
						<option value="all">All</option>
						<option value="upcoming">Upcoming</option>
						<option value="virtual">Virtual</option>
						<option value="past">Past</option>
					</select>
				</div>

				{ /* Upcoming Tickets */ }
				{ displayUpcoming.length > 0 && (
					<>
						<h3 className="eventive-ticket-section">Upcoming</h3>
						{ displayUpcoming.map( renderTicketCard ) }
					</>
				) }

				{ /* Virtual Tickets */ }
				{ displayVirtuals.length > 0 && (
					<>
						<h3 className="eventive-ticket-section">Virtual</h3>
						{ displayVirtuals.map( renderTicketCard ) }
					</>
				) }

				{ /* Past Tickets */ }
				{ displayPast.length > 0 && (
					<>
						<h3 className="eventive-ticket-section">Past</h3>
						{ displayPast.map( renderTicketCard ) }
					</>
				) }
			</div>

			{ /* Barcode Modal */ }
			{ showBarcodeModal && selectedTicket && (
				<div
					className="eventive-modal-overlay eventive-modal-overlay--dark"
					onClick={ ( e ) =>
						e.target.classList.contains(
							'eventive-modal-overlay'
						) && closeModal()
					}
				>
					<div className="eventive-modal-panel eventive-modal-panel--small barcode-modal-inner">
						<button
							className="eventive-modal-close-btn"
							onClick={ closeModal }
							aria-label="Close"
						>
							×
						</button>
						<div className="barcode-modal-body">
							<h3>{ ticketTitle( selectedTicket ) }</h3>
							{ ticketWhenWhere( selectedTicket ) && (
								<div className="barcode-meta">
									{ ticketWhenWhere( selectedTicket ) }
								</div>
							) }
							{ scannedAtText( selectedTicket ) && (
								<div className="barcode-scanned-badge">
									<span>
										Scanned{ ' ' }
										{ scannedAtText( selectedTicket ) }
									</span>
								</div>
							) }
							{ ( () => {
								const code = ticketQR( selectedTicket );
								const past = isPastEvent( selectedTicket );
								return code ? (
									<div className="barcode-qr-container">
										<img src={ code } alt="Ticket QR" />
										{ past && (
											<div className="past-event-overlay">
												<div className="overlay-content">
													<div className="overlay-title">
														This event has passed
													</div>
													<div className="overlay-subtitle">
														Barcode disabled
													</div>
												</div>
											</div>
										) }
									</div>
								) : (
									<p>No barcode available.</p>
								);
							} )() }
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
