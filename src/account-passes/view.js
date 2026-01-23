/**
 * Eventive Account Passes Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

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
		'https://api.eventive.org' + ( url.charAt( 0 ) === '/' ? '' : '/' ) + url
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

	useEffect( () => {
		const checkLoginAndFetch = () => {
			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				setTimeout( checkLoginAndFetch, 100 );
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn ) {
					fetchPasses();
				}
			} catch ( error ) {
				console.error( 'Error checking login:', error );
			} finally {
				setIsLoading( false );
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLoginAndFetch );
		} else {
			checkLoginAndFetch();
		}
	}, [] );

	const fetchPasses = () => {
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
				const list = ( res && ( res.passes || res ) ) || [];
				setPasses( list );
			} )
			.catch( () => {
				// Fallback: people/self/passes_including_global
				window.Eventive.request( {
					method: 'GET',
					path: 'people/self/passes_including_global',
					qs,
					authenticatePerson: true,
				} )
					.then( ( res ) => {
						const list = ( res && ( res.passes || res ) ) || [];
						setPasses( list );
					} )
					.catch( ( err ) => {
						console.error(
							'[eventive-account-passes] Error fetching passes:',
							err
						);
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
					className="eventive-show-pass-barcode-modal is-open"
					style={ {
						display: 'flex',
						position: 'fixed',
						inset: 0,
						alignItems: 'center',
						justifyContent: 'center',
						background: 'rgba(0,0,0,0.85)',
						zIndex: 9999,
					} }
					onClick={ ( e ) =>
						e.target.classList.contains(
							'eventive-show-pass-barcode-modal'
						) && closeModals()
					}
				>
					<div
						className="show-pass-barcode-modal-content"
						style={ {
							background: '#fff',
							maxWidth: '520px',
							width: '95%',
							padding: '20px',
							borderRadius: '8px',
							position: 'relative',
							textAlign: 'center',
						} }
					>
						<button
							className="modal-close-btn"
							onClick={ closeModals }
							style={ {
								position: 'absolute',
								right: '12px',
								top: '10px',
								fontSize: '22px',
								lineHeight: 1,
								background: 'none',
								border: 'none',
								cursor: 'pointer',
							} }
							aria-label="Close"
						>
							×
						</button>
						<h3
							style={ {
								marginTop: 0,
								fontSize: '1.1em',
								textDecoration: 'underline',
							} }
						>
							My Pass Credentials
						</h3>
						<div
							style={ {
								marginBottom: '10px',
								fontSize: '14px',
								opacity: 0.8,
							} }
						>
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
								barcodePass.barcode &&
									barcodePass.barcode.path
							);
							const imgUrl = ensureAbsolute( codePath );
							return imgUrl ? (
								<img
									src={ imgUrl }
									alt={ `${
										barcodePass.name || 'Pass'
									} QR Code` }
									style={ {
										maxWidth: '320px',
										width: '100%',
										height: 'auto',
										border: '1px solid #eee',
										borderRadius: '8px',
										padding: '12px',
									} }
								/>
							) : (
								<p>No barcode available</p>
							);
						} )() }
						<div
							style={ {
								marginTop: '10px',
								fontSize: '12px',
								opacity: 0.8,
							} }
						>
							Present this code at entry. Tip: increase screen
							brightness for easier scanning.
						</div>
					</div>
				</div>
			) }

			{ /* Edit Modal */ }
			{ showEditModal && editingPass && (
				<div
					className="eventive-edit-pass-modal is-open"
					style={ {
						display: 'flex',
						position: 'fixed',
						inset: 0,
						alignItems: 'center',
						justifyContent: 'center',
						background: 'rgba(0,0,0,0.4)',
						zIndex: 9999,
					} }
					onClick={ ( e ) =>
						e.target.classList.contains(
							'eventive-edit-pass-modal'
						) && closeModals()
					}
				>
					<div
						className="edit-pass-modal-content"
						style={ {
							background: '#fff',
							maxWidth: '640px',
							width: '95%',
							padding: '20px',
							borderRadius: '8px',
							position: 'relative',
						} }
					>
						<button
							className="modal-close-btn"
							onClick={ closeModals }
							style={ {
								position: 'absolute',
								right: '12px',
								top: '10px',
								fontSize: '22px',
								lineHeight: 1,
								background: 'none',
								border: 'none',
								cursor: 'pointer',
							} }
							aria-label="Close"
						>
							×
						</button>
						<h3 style={ { marginTop: 0 } }>Edit Pass Details</h3>
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
									const supp =
										editingPass.supplementary_data;
									if ( Array.isArray( supp ) ) {
										return supp.map( ( f, idx ) => {
											const key =
												f.key || f.name || f.id;
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

							<div style={ { marginTop: '14px' } }>
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
