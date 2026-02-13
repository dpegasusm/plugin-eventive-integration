/**
 * Eventive Login Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect, useRef } from '@wordpress/element';

// Safari/ITP: request first-party storage access
async function requestStorageAccessIfNeeded() {
	try {
		if ( ! document.requestStorageAccess ) {
			return;
		}
		const has =
			typeof document.hasStorageAccess === 'function'
				? await document.hasStorageAccess()
				: false;
		if ( ! has ) {
			try {
				await document.requestStorageAccess();
			} catch ( _ ) {}
		}
	} catch ( _ ) {}
}

// Attempt to read persisted Eventive person token from localStorage
function getStoredEventiveToken() {
	try {
		const keys = [
			'eventivePersonToken',
			'eventiveAppPersonToken',
			'eventive_token',
			'eventive_person_token',
		];
		for ( let i = 0; i < keys.length; i++ ) {
			const v = localStorage.getItem( keys[ i ] );
			if ( v && typeof v === 'string' && v.trim() ) {
				return v.trim();
			}
		}
	} catch ( _ ) {}
	return null;
}

// Version-safe wrapper to hydrate login state with a token
function loginWithEventiveTokenCompat( token ) {
	const EVT = window.Eventive;
	try {
		if ( EVT && typeof EVT.loginWithToken === 'function' ) {
			const p = EVT.loginWithToken( { eventiveToken: token } );
			if ( p && typeof p.then === 'function' ) {
				return p.catch( () => EVT.loginWithToken( token ) );
			}
			return EVT.loginWithToken( token );
		}
	} catch ( _ ) {}
	return Promise.reject(
		new Error( 'Eventive.loginWithToken is unavailable.' )
	);
}

/**
 * Login Component
 * @param root0
 * @param root0.loginLinkText
 * @param root0.bucket
 */
function LoginApp( { loginLinkText, bucket } ) {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ showModal, setShowModal ] = useState( false );
	const [ email, setEmail ] = useState( '' );
	const [ password, setPassword ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ userName, setUserName ] = useState( '' );
	const [ isSubmitting, setIsSubmitting ] = useState( false );

	const hasFetchedRef = useRef( false );

	useEffect( () => {
		let cancelled = false;
		let tries = 0;
		const maxTries = 60;

		const checkLogin = async () => {
			if ( cancelled ) {
				return;
			}

			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				tries++;
				if ( tries < maxTries ) {
					setTimeout( checkLogin, 100 );
				} else {
					setIsLoading( false );
				}
				return;
			}

			if ( hasFetchedRef.current ) {
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn ) {
					hasFetchedRef.current = true;
					// Fetch user name - prefer first_name
					try {
						const resp = await window.Eventive.request( {
							method: 'GET',
							path: 'people/self',
							authenticatePerson: true,
						} );
						if ( cancelled ) {
							return;
						}
						const person = resp && ( resp.person || resp );
						const name =
							person?.first_name ||
							person?.name ||
							person?.full_name ||
							person?.email ||
							'Friend';
						setUserName( name );
					} catch ( e ) {
						if ( ! cancelled ) {
							setUserName( 'Friend' );
						}
					}
				} else {
					// Check if we have a stored token and try to hydrate
					const token = getStoredEventiveToken();
					if ( token ) {
						try {
							await loginWithEventiveTokenCompat( token );
							if ( cancelled ) {
								return;
							}
							const stillLoggedIn = window.Eventive.isLoggedIn();
							if ( stillLoggedIn ) {
								hasFetchedRef.current = true;
								setIsLoggedIn( true );
								const resp = await window.Eventive.request( {
									method: 'GET',
									path: 'people/self',
									authenticatePerson: true,
								} );
								if ( cancelled ) {
									return;
								}
								const person = resp && ( resp.person || resp );
								const name =
									person?.first_name ||
									person?.name ||
									person?.full_name ||
									person?.email ||
									'Friend';
								setUserName( name );
							}
						} catch ( _ ) {}
					}
				}
			} catch ( loginError ) {
				// Silently handle check errors
			} finally {
				if ( ! cancelled ) {
					setIsLoading( false );
				}
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLogin );
		}
		checkLogin();

		return () => {
			cancelled = true;
			if ( window.Eventive && window.Eventive.off ) {
				window.Eventive.off( 'ready', checkLogin );
			}
		};
	}, [] );

	const handleLogin = async ( e ) => {
		e.preventDefault();
		setError( '' );
		setIsSubmitting( true );

		const emailVal = email.trim();
		const passwordVal = password.trim();

		if ( ! emailVal || ! passwordVal ) {
			setError( 'Please enter your email and password.' );
			setIsSubmitting( false );
			return;
		}

		try {
			if ( ! window.Eventive ) {
				setError( 'Eventive is not available' );
				setIsSubmitting( false );
				return;
			}

			// Determine effective event bucket
			let effectiveBucket = bucket;
			if ( ! effectiveBucket || effectiveBucket === '' ) {
				effectiveBucket =
					window.Eventive.event_bucket ||
					( window.Eventive.config &&
						window.Eventive.config.event_bucket ) ||
					'';
			}

			if ( ! effectiveBucket ) {
				setError(
					'Missing event bucket. Please set a default in settings.'
				);
				setIsSubmitting( false );
				return;
			}

			const body = {
				email: emailVal,
				password: passwordVal,
				event_bucket: effectiveBucket,
			};

			// Safari: explicitly request storage access before making auth requests
			await requestStorageAccessIfNeeded();

			// Try fetch-based login first
			let json;
			try {
				const res = await fetch(
					'https://api.eventive.org/people/login',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json;charset=UTF-8',
						},
						body: JSON.stringify( body ),
					}
				);

				if ( ! res.ok ) {
					const txt = await res.text();
					throw new Error(
						'Login failed. (' +
							res.status +
							') ' +
							( txt || '' ).slice( 0, 200 )
					);
				}
				json = await res.json();
			} catch ( fetchErr ) {
				// Fallback to Eventive.request
				if ( window.Eventive.request ) {
					json = await window.Eventive.request( {
						method: 'POST',
						path: 'people/login',
						body,
						authenticatePerson: false,
					} );
				} else {
					throw fetchErr;
				}
			}

			const token = json && ( json.token || json.person_token );
			if ( ! token ) {
				throw new Error( 'No token in response' );
			}

			// Hydrate the token into Eventive
			await loginWithEventiveTokenCompat( token );

			// Store bucket preference
			try {
				localStorage.setItem(
					'evt_last_bucket',
					String( effectiveBucket || '' )
				);
			} catch ( _ ) {}

			// Fetch user info
			try {
				const resp = await window.Eventive.request( {
					method: 'GET',
					path: 'people/self',
					authenticatePerson: true,
				} );
				const person = resp && ( resp.person || resp );
				const name =
					person?.first_name ||
					person?.name ||
					person?.full_name ||
					person?.email ||
					'Friend';
				setUserName( name );
				setIsLoggedIn( true );
			} catch ( _ ) {
				setUserName( 'Friend' );
				setIsLoggedIn( true );
			}

			// Close modal and clear form
			setShowModal( false );
			setEmail( '' );
			setPassword( '' );

			// Force page reload to update other blocks
			await requestStorageAccessIfNeeded();
			setTimeout( () => {
				try {
					window.location.reload();
				} catch ( _ ) {
					window.location.href = window.location.href;
				}
			}, 120 );
		} catch ( err ) {
			let msg = 'Login failed.';
			if ( err && err.status ) {
				msg += ' (' + err.status + ')';
			}
			if ( err && err.message ) {
				msg += ' ' + err.message;
			}
			setError( msg );
			console.error( 'Login error:', err );
		} finally {
			setIsSubmitting( false );
		}
	};

	const handleLogout = async () => {
		try {
			const EVT = window.Eventive;

			// Clear tokens from localStorage
			const keys = [
				'eventivePersonToken',
				'eventiveAppPersonToken',
				'eventive_token',
				'eventive_person_token',
			];
			keys.forEach( ( k ) => {
				try {
					localStorage.removeItem( k );
				} catch ( _ ) {}
			} );

			// Call logout via request
			if ( EVT && EVT.request ) {
				try {
					await EVT.request( {
						method: 'POST',
						path: 'people/logout',
						authenticatePerson: true,
					} );
				} catch ( _ ) {}
			}

			// Call Eventive.logout if available
			if ( EVT && typeof EVT.logout === 'function' ) {
				try {
					const p = EVT.logout();
					if ( p && typeof p.then === 'function' ) {
						await p;
					}
				} catch ( _ ) {}
			}

			setIsLoggedIn( false );
			setUserName( '' );

			// Reload page to update other blocks
			try {
				window.location.reload();
			} catch ( _ ) {
				window.location.href = window.location.href;
			}
		} catch ( error ) {
			console.error( 'Logout error:', error );
		}
	};

	const openModal = async ( e ) => {
		e.preventDefault();
		await requestStorageAccessIfNeeded();
		setShowModal( true );
		setError( '' );
	};

	const closeModal = () => {
		setShowModal( false );
		setEmail( '' );
		setPassword( '' );
		setError( '' );
	};

	// Close modal on ESC key
	useEffect( () => {
		const handleEsc = ( ev ) => {
			if ( ev.key === 'Escape' && showModal ) {
				closeModal();
			}
		};

		if ( showModal ) {
			document.addEventListener( 'keydown', handleEsc );
			document.body.style.overflow = 'hidden';
		}

		return () => {
			document.removeEventListener( 'keydown', handleEsc );
			document.body.style.overflow = '';
		};
	}, [ showModal ] );

	if ( isLoading ) {
		return <div className="eventive-login-message">Loading...</div>;
	}

	return (
		<div className="eventive-login">
			<p className="eventive-login-message">
				{ ! isLoggedIn ? (
					<a href="#" onClick={ openModal } className="login-trigger">
						{ loginLinkText }
					</a>
				) : (
					<>
						<span className="welcome-text">
							Welcome, { userName }!
						</span>{ ' ' }
						<a
							href="#"
							onClick={ handleLogout }
							className="logout-link"
						>
							Log out
						</a>
					</>
				) }
			</p>

			{ showModal && (
				<div
					className="eventive-modal-overlay eventive-login-modal"
					onClick={ ( e ) =>
						e.target.classList.contains( 'eventive-modal-overlay' ) &&
						closeModal()
					}
				>
					<div className="eventive-modal-panel eventive-modal-panel--small eventive-login-form">
						<button
							className="eventive-modal-close-btn"
							onClick={ closeModal }
							aria-label="Close"
						>
							×
						</button>
						<p className="eventive-modal-title">
							Log in using your Eventive Account
						</p>
						<form onSubmit={ handleLogin }>
							<label htmlFor="email">Email</label>
							<input
								type="text"
								id="email"
								value={ email }
								onChange={ ( e ) => setEmail( e.target.value ) }
								required
								disabled={ isSubmitting }
							/>
							<label htmlFor="password">Password</label>
							<input
								type="password"
								id="password"
								value={ password }
								onChange={ ( e ) =>
									setPassword( e.target.value )
								}
								required
								disabled={ isSubmitting }
							/>
							{ error && (
								<div className="error-message">{ error }</div>
							) }
							<div className="button-row">
								<button type="submit" disabled={ isSubmitting }>
									{ isSubmitting ? 'Logging in…' : 'LOGIN' }
								</button>
								<button
									type="button"
									onClick={ closeModal }
									disabled={ isSubmitting }
								>
									CANCEL
								</button>
							</div>
						</form>
						<div className="eventive-modal-footer">
							<div className="eventive-footer-note">
								<a
									href="https://eventive.org"
									target="_blank"
									rel="noopener noreferrer"
								>
									Powered by{ ' ' }
									<img
										src="https://festival.eofilmfest.com/img/eventive.png"
										alt="Eventive"
									/>
								</a>
							</div>
							<div>
								<a
									href="https://eventive.org/terms"
									target="_blank"
									rel="noopener noreferrer"
								>
									Terms
								</a>{ ' ' }
								·{ ' ' }
								<a
									href="https://eventive.org/privacy"
									target="_blank"
									rel="noopener noreferrer"
								>
									Privacy
								</a>{ ' ' }
								·{ ' ' }
								<a
									href="https://status.eventive.org/"
									target="_blank"
									rel="noopener noreferrer"
								>
									System Status
								</a>
							</div>
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
	const blocks = document.querySelectorAll( '.wp-block-eventive-login' );

	blocks.forEach( ( block ) => {
		const loginLinkText =
			block.dataset.loginLinkText || 'Log in to your account';
		const bucket = block.dataset.eventBucket || '';
		const root = createRoot( block );
		root.render(
			<LoginApp loginLinkText={ loginLinkText } bucket={ bucket } />
		);
	} );
} );
