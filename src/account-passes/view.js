/**
 * Eventive Account Passes Block - Frontend View Script
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

function formatCurrency( cents ) {
	try {
		return new Intl.NumberFormat( undefined, {
			style: 'currency',
			currency: 'USD',
		} ).format( cents / 100 );
	} catch ( _ ) {
		return '$' + ( cents / 100 || 0 );
	}
}

/**
 * Account Passes Component
 * @param root0
 * @param root0.bucket
 */
function AccountPassesApp( { bucket } ) {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ passes, setPasses ] = useState( [] );
	const [ showEditModal, setShowEditModal ] = useState( false );
	const [ showBarcodeModal, setShowBarcodeModal ] = useState( false );
	const [ editingPass, setEditingPass ] = useState( null );
	const [ editingIdx, setEditingIdx ] = useState( -1 );
	const [ barcodePass, setBarcodePass ] = useState( null );
	const [ editFormData, setEditFormData ] = useState( {} );

	const hasFetchedRef = useRef( false );

	useEffect( () => {
		let cancelled = false;
		let tries = 0;
		const maxTries = 60; // ~6 seconds at 100ms intervals

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
					fetchPasses( cancelled );
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

	const fetchPasses = ( cancelled ) => {
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

		// Primary attempt: people/self/passes
		window.Eventive.request( {
			method: 'GET',
			path: 'people/self/passes',
			qs,
			authenticatePerson: true,
		} )
			.then( ( res ) => {
				if ( cancelled ) {
					return;
				}
				const list = ( res && ( res.passes || res ) ) || [];
				setPasses( list );
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

				// Fallback for non-auth errors: people/self/passes_including_global
				window.Eventive.request( {
					method: 'GET',
					path: 'people/self/passes_including_global',
					qs,
					authenticatePerson: true,
				} )
					.then( ( res2 ) => {
						if ( cancelled ) {
							return;
						}
						const list =
							( res2 && ( res2.passes || res2 ) ) || [];
						setPasses( list );
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

	const handleShowBarcode = ( pass ) => {
		setBarcodePass( pass );
		setShowBarcodeModal( true );
	};

	const handleEditPass = ( pass, idx ) => {
		setEditingPass( pass );
		setEditingIdx( idx );
		setEditFormData( {
			name: pickFirst( pass.name, pass.pass_name, '' ),
			supplementary: pass.supplementary_data || {},
		} );
		setShowEditModal( true );
	};

	const handleSaveEdit = ( e ) => {
		e.preventDefault();

		const payload = {};
		if ( editFormData.name && editFormData.name.trim() !== '' ) {
			payload.name = editFormData.name.trim();
		}

		if (
			editFormData.supplementary &&
			Object.keys( editFormData.supplementary ).length
		) {
			payload.supplementary_data = editFormData.supplementary;
		}

		const passId =
			editingPass.id || ( editingPass.pass && editingPass.pass.id );
		if ( ! passId ) {
			console.warn( '[passes] missing pass id' );
			return;
		}

		window.Eventive.request( {
			method: 'POST',
			path: 'passes/' + encodeURIComponent( passId ),
			body: payload,
			authenticatePerson: true,
		} )
			.then( () => {
				closeModals();
				fetchPasses(); // Refresh the list
			} )
			.catch( ( err ) => {
				console.error( 'Failed to update pass:', err );
				alert( 'Failed to update pass.' );
			} );
	};

	const closeModals = () => {
		setShowEditModal( false );
		setShowBarcodeModal( false );
		setEditingPass( null );
		setEditingIdx( -1 );
		setBarcodePass( null );
		setEditFormData( {} );
	};

	// Close modal on ESC key
	useEffect( () => {
		const handleEsc = ( e ) => {
			if ( e.key === 'Escape' ) {
				closeModals();
			}
		};

		if ( showEditModal || showBarcodeModal ) {
			document.addEventListener( 'keydown', handleEsc );
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener( 'keydown', handleEsc );
			document.body.style.overflow = '';
		};
	}, [ showEditModal, showBarcodeModal ] );

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
				Please log in to view your passes.
			</div>
		);
	}

	return (
		<div className="eventive-account-passes">
			<div className="eventive-passes-list">
				<h2>My Passes</h2>
				{ passes.length === 0 ? (
					<p>No passes found for this account.</p>
				) : (
					<div className="eventive-passes-grid">
						{ passes.map( ( pass, idx ) => {
							const name = pickFirst(
								pass.name,
								pass.pass_name,
								pass.title,
								'Pass'
							);
							const type = pickFirst(
								pass.type,
								pass.pass && pass.pass.type
							);
							const eventsRemaining =
								pass.events_remaining != null
									? `${ pass.events_remaining } left`
									: '';
							const sale =
								pass.gross_cents != null
									? formatCurrency( pass.gross_cents )
									: '';
							const benefits =
								pass.benefits && Array.isArray( pass.benefits )
									? pass.benefits.join( ', ' )
									: '';

							const metaBits = [ type, eventsRemaining, sale ]
								.filter( Boolean )
								.join( ' • ' );

							return (
								<div key={ idx } className="eventive-pass-card">
									<div className="eventive-pass-card__body">
										<div className="eventive-pass-card__title">
											{ name }
										</div>
										{ metaBits && (
											<div className="eventive-pass-card__meta">
												{ metaBits }
											</div>
										) }
										{ benefits && (
											<div className="eventive-pass-card__benefits">
												{ benefits }
											</div>
										) }
									</div>
									<div className="eventive-pass-card__actions">
										<button
											className="evt-btn evt-btn-secondary"
											onClick={ () =>
												handleEditPass( pass, idx )
											}
										>
											Edit
										</button>
										<button
											className="evt-btn evt-btn-primary"
											onClick={ () =>
												handleShowBarcode( pass )
											}
										>
											Show Barcode
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
					className="eventive-modal-overlay eventive-modal-overlay--dark"
					onClick={ ( e ) =>
						e.target.classList.contains(
							'eventive-modal-overlay'
						) && closeModals()
					}
				>
					<div className="eventive-modal-panel eventive-modal-panel--small show-pass-barcode-modal-content">
						<button
							className="eventive-modal-close-btn"
							onClick={ closeModals }
							aria-label="Close"
						>
							×
						</button>
						<h3 className="barcode-modal-title">
							My Pass Credentials
						</h3>
						<div className="barcode-meta">
							{ pickFirst(
								barcodePass.name,
								barcodePass.pass_name,
								'Pass'
							) }
						</div>
						{ ( () => {
							const codePath = pickFirst(
								barcodePass.qr_code_path,
								barcodePass.barcode_path,
								barcodePass.barcode && barcodePass.barcode.path
							);
							const imgUrl = ensureAbsolute( codePath );
							return imgUrl ? (
								<img
									className="barcode-img"
									src={ imgUrl }
									alt={ `${
										barcodePass.name || 'Pass'
									} QR Code` }
								/>
							) : (
								<p>No barcode available</p>
							);
						} )() }
						<div className="barcode-tip">
							Present this code at entry. Tip: increase screen
							brightness for easier scanning.
						</div>
					</div>
				</div>
			) }

			{ /* Edit Modal */ }
			{ showEditModal && editingPass && (
				<div
					className="eventive-modal-overlay"
					onClick={ ( e ) =>
						e.target.classList.contains(
							'eventive-modal-overlay'
						) && closeModals()
					}
				>
					<div className="eventive-modal-panel edit-pass-modal-content">
						<button
							className="eventive-modal-close-btn"
							onClick={ closeModals }
							aria-label="Close"
						>
							×
						</button>
						<h3>Edit Pass Details</h3>
						<form onSubmit={ handleSaveEdit }>
							<div className="form-group">
								<label>Pass Name</label>
								<input
									type="text"
									value={ editFormData.name || '' }
									onChange={ ( e ) =>
										setEditFormData( {
											...editFormData,
											name: e.target.value,
										} )
									}
									required
								/>
							</div>

							{ /* Render supplementary fields */ }
							{ editingPass.supplementary_data &&
								( () => {
									const supp = editingPass.supplementary_data;
									if ( Array.isArray( supp ) ) {
										return supp.map( ( f, idx ) => {
											const key = f.key || f.name || f.id;
											const label =
												f.label || f.name || key;
											const val =
												editFormData.supplementary?.[
													key
												] != null
													? editFormData
															.supplementary[
															key
													  ]
													: f.value != null
													? f.value
													: '';

											return (
												<div
													key={ idx }
													className="form-group"
												>
													<label>
														{ label || key }
													</label>
													<input
														type="text"
														value={ val }
														onChange={ ( e ) =>
															setEditFormData( {
																...editFormData,
																supplementary: {
																	...editFormData.supplementary,
																	[ key ]:
																		e.target
																			.value,
																},
															} )
														}
													/>
												</div>
											);
										} );
									} else if (
										typeof supp === 'object' &&
										supp !== null
									) {
										return Object.keys( supp ).map(
											( key ) => {
												const val =
													editFormData
														.supplementary?.[
														key
													] != null
														? editFormData
																.supplementary[
																key
														  ]
														: supp[ key ] != null
														? supp[ key ]
														: '';

												return (
													<div
														key={ key }
														className="form-group"
													>
														<label>{ key }</label>
														<input
															type="text"
															value={ val }
															onChange={ ( e ) =>
																setEditFormData(
																	{
																		...editFormData,
																		supplementary:
																			{
																				...editFormData.supplementary,
																				[ key ]:
																					e
																						.target
																						.value,
																			},
																	}
																)
															}
														/>
													</div>
												);
											}
										);
									}
									return null;
								} )() }

							<div className="form-submit-row">
								<button
									type="submit"
									className="pass-submit-row-button"
								>
									Save Changes
								</button>
							</div>
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
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-account-passes'
	);

	blocks.forEach( ( block ) => {
		// Get bucket from localized data
		const bucket = window.EventiveBlockData?.eventBucket || '';

		const root = createRoot( block );
		root.render( <AccountPassesApp bucket={ bucket } /> );
	} );
} );
