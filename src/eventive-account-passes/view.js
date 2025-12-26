/**
 * Eventive Account Passes Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * Account Passes Component
 */
function AccountPassesApp() {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ passes, setPasses ] = useState( [] );
	const [ showEditModal, setShowEditModal ] = useState( false );
	const [ showBarcodeModal, setShowBarcodeModal ] = useState( false );
	const [ editingPass, setEditingPass ] = useState( null );
	const [ barcodePass, setBarcodePass ] = useState( null );

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
					await fetchPasses();
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

	const fetchPasses = async () => {
		try {
			const resp = await window.Eventive.request( {
				method: 'GET',
				path: 'people/self/passes',
				authenticatePerson: true,
			} );

			const list = ( resp && ( resp.passes || resp ) ) || [];
			setPasses( list );
		} catch ( error ) {
			console.error( 'Error fetching passes:', error );
		}
	};

	const handleShowBarcode = ( pass ) => {
		setBarcodePass( pass );
		setShowBarcodeModal( true );
	};

	const handleEditPass = ( pass ) => {
		setEditingPass( pass );
		setShowEditModal( true );
	};

	const closeModals = () => {
		setShowEditModal( false );
		setShowBarcodeModal( false );
		setEditingPass( null );
		setBarcodePass( null );
	};

	const formatCurrency = ( cents ) => {
		try {
			return new Intl.NumberFormat( undefined, {
				style: 'currency',
				currency: 'USD',
			} ).format( cents / 100 );
		} catch ( _ ) {
			return '$' + ( cents / 100 || 0 );
		}
	};

	if ( isLoading ) {
		return (
			<div className="eventive-login-container" style={ { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' } }>
				<div className="loader"></div>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-notice" style={ { textAlign: 'center' } }>
				Please log in to view your passes.
			</div>
		);
	}

	return (
		<div className="eventive-account-passes">
			<div className="eventive-passes-list">
				<h2>My Passes</h2>
				{ passes.length === 0 ? (
					<p>No passes found.</p>
				) : (
					<div className="eventive-passes-grid">
						{ passes.map( ( pass, idx ) => {
							const name = pass.name || pass.pass_name || pass.title || 'Pass';
							const type = pass.type || ( pass.pass && pass.pass.type );
							const eventsRemaining = pass.events_remaining != null ? `${ pass.events_remaining } left` : '';
							const sale = pass.gross_cents != null ? formatCurrency( pass.gross_cents ) : '';
							const metaBits = [ type, eventsRemaining, sale ].filter( Boolean ).join( ' • ' );

							return (
								<div key={ idx } className="eventive-pass-card">
									<div className="eventive-pass-card__body">
										<div className="eventive-pass-card__title">{ name }</div>
										{ metaBits && <div className="eventive-pass-card__meta">{ metaBits }</div> }
									</div>
									<div className="eventive-pass-card__actions">
										<button
											className="eventive-pass-btn eventive-pass-btn--primary"
											onClick={ () => handleShowBarcode( pass ) }
										>
											Show Pass
										</button>
										<button
											className="eventive-pass-btn eventive-pass-btn--secondary"
											onClick={ () => handleEditPass( pass ) }
										>
											Edit Details
										</button>
									</div>
								</div>
							);
						} ) }
					</div>
				) }
			</div>

			{ /* Barcode Modal */ }
			{ showBarcodeModal && barcodePass && (
				<div
					className="eventive-show-pass-barcode-modal"
					onClick={ ( e ) => e.target.classList.contains( 'eventive-show-pass-barcode-modal' ) && closeModals() }
				>
					<div className="show-pass-barcode-modal-content">
						<button className="modal-close-btn" onClick={ closeModals }>
							×
						</button>
						<h3>My Pass Credentials</h3>
						<div className="barcode-meta">
							{ barcodePass.name || 'Pass' }
						</div>
						{ barcodePass.barcode_url && (
							<img
								src={ barcodePass.barcode_url }
								alt="Pass QR Code"
								className="barcode-img"
							/>
						) }
					</div>
				</div>
			) }

			{ /* Edit Modal */ }
			{ showEditModal && editingPass && (
				<div
					className="eventive-edit-pass-modal"
					onClick={ ( e ) => e.target.classList.contains( 'eventive-edit-pass-modal' ) && closeModals() }
				>
					<div className="edit-pass-modal-content">
						<button className="modal-close-btn" onClick={ closeModals }>
							×
						</button>
						<h3>Edit Pass Details</h3>
						<form>
							<div className="form-group">
								<label>Pass Name</label>
								<input type="text" defaultValue={ editingPass.name } />
							</div>
							<button type="button" className="pass-submit-row-button">
								Save Changes
							</button>
						</form>
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
	const blocks = document.querySelectorAll( '.wp-block-eventive-account-passes' );

	blocks.forEach( ( block ) => {
		const root = createRoot( block );
		root.render( <AccountPassesApp /> );
	} );
} );
