/**
 * Eventive Login Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * Login Component
 * @param root0
 * @param root0.loginLinkText
 */
function LoginApp( { loginLinkText } ) {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ showModal, setShowModal ] = useState( false );
	const [ email, setEmail ] = useState( '' );
	const [ password, setPassword ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const [ userName, setUserName ] = useState( '' );

	useEffect( () => {
		const checkLogin = async () => {
			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				setTimeout( checkLogin, 100 );
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn ) {
					// Fetch user name
					try {
						const resp = await window.Eventive.request( {
							method: 'GET',
							path: 'people/self',
							authenticatePerson: true,
						} );
						const person = resp && ( resp.person || resp );
						setUserName( person?.name || person?.email || 'User' );
					} catch ( e ) {
						console.error( 'Error fetching user info:', e );
					}
				}
			} catch ( error ) {
				console.error( 'Error checking login:', error );
			} finally {
				setIsLoading( false );
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLogin );
		}

		checkLogin();
	}, [] );

	const handleLogin = async ( e ) => {
		e.preventDefault();
		setError( '' );

		try {
			if ( ! window.Eventive || ! window.Eventive.login ) {
				setError( 'Eventive is not available' );
				return;
			}

			await window.Eventive.login( {
				email,
				password,
			} );

			// Refresh login state
			const loggedIn = window.Eventive.isLoggedIn();
			setIsLoggedIn( loggedIn );

			if ( loggedIn ) {
				setShowModal( false );
				setEmail( '' );
				setPassword( '' );

				// Fetch user name
				try {
					const resp = await window.Eventive.request( {
						method: 'GET',
						path: 'people/self',
						authenticatePerson: true,
					} );
					const person = resp && ( resp.person || resp );
					setUserName( person?.name || person?.email || 'User' );
				} catch ( e ) {
					console.error( 'Error fetching user info:', e );
				}
			}
		} catch ( err ) {
			setError( 'Invalid email or password' );
			console.error( 'Login error:', err );
		}
	};

	const handleLogout = async () => {
		try {
			if ( window.Eventive && window.Eventive.logout ) {
				await window.Eventive.logout();
				setIsLoggedIn( false );
				setUserName( '' );
			}
		} catch ( error ) {
			console.error( 'Logout error:', error );
		}
	};

	const openModal = () => {
		setShowModal( true );
		setError( '' );
	};

	const closeModal = () => {
		setShowModal( false );
		setEmail( '' );
		setPassword( '' );
		setError( '' );
	};

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
					className="eventive-login-modal"
					onClick={ ( e ) =>
						e.target.classList.contains( 'eventive-login-modal' ) &&
						closeModal()
					}
				>
					<div className="eventive-login-form">
						<button
							className="eventive-modal-close"
							onClick={ closeModal }
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
							/>
							{ error && (
								<div className="error-message">{ error }</div>
							) }
							<div className="button-row">
								<button type="submit">LOGIN</button>
								<button type="button" onClick={ closeModal }>
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
		const root = createRoot( block );
		root.render( <LoginApp loginLinkText={ loginLinkText } /> );
	} );
} );
