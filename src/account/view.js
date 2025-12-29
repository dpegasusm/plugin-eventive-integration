/**
 * Eventive Account Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot, useState, useEffect } from '@wordpress/element';

/**
 * Account component
 */
function EventiveAccount() {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );

	useEffect( () => {
		// Wait for Eventive to be ready
		const checkLogin = () => {
			if (
				window.Eventive &&
				typeof window.Eventive.isLoggedIn === 'function'
			) {
				setIsLoggedIn( window.Eventive.isLoggedIn() );
				setIsLoading( false );
			}
		};

		if ( window.Eventive && window.Eventive.ready ) {
			window.Eventive.ready( checkLogin );
		} else if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLogin );
		} else {
			// Fallback polling
			let attempts = 0;
			const poll = setInterval( () => {
				if (
					window.Eventive &&
					typeof window.Eventive.isLoggedIn === 'function'
				) {
					checkLogin();
					clearInterval( poll );
				} else if ( ++attempts > 50 ) {
					setIsLoading( false );
					clearInterval( poll );
				}
			}, 100 );
		}
	}, [] );

	const handleLogout = ( e ) => {
		e.preventDefault();
		if ( typeof window.handleLogout === 'function' ) {
			window.handleLogout();
			return;
		}
		// Fallback logout
		try {
			localStorage.clear();
		} catch ( _ ) {}
		try {
			sessionStorage.clear();
		} catch ( _ ) {}
		document.cookie = 'eventive-personState=; path=/; max-age=0';
		if ( window.Eventive && window.Eventive.logout ) {
			window.Eventive.logout()
				.then( () => window.location.reload() )
				.catch( () => window.location.reload() );
		} else {
			window.location.reload();
		}
	};

	if ( isLoading ) {
		return (
			<div className="eventive-account-container">
				<p style={ { textAlign: 'center' } }>Loading...</p>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-account-container">
				<p style={ { textAlign: 'center' } }>
					You are not logged in. Please log in to view your account.
				</p>
				<div className="eventive-login-placeholder">
					{ /* Login form would be rendered by eventive-login block */ }
				</div>
			</div>
		);
	}

	return (
		<div className="eventive-account-container">
			<div className="account-actions">
				<a
					href="#"
					onClick={ handleLogout }
					className="eventive-logout-link"
				>
					Log out
				</a>
			</div>
			<div className="top-section">
				<div className="account-details">
					{ /* Account details would be rendered by eventive-account-details block */ }
					<div className="eventive-account-details-placeholder" />
				</div>
				<div className="account-passes">
					{ /* Passes would be rendered by eventive-account-passes block */ }
					<div className="eventive-account-passes-placeholder" />
				</div>
			</div>
			<div className="account-tickets">
				{ /* Tickets would be rendered by eventive-account-tickets block */ }
				<div className="eventive-account-tickets-placeholder" />
			</div>
		</div>
	);
}

/**
 * Initialize the block on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll(
		'.wp-block-eventive-eventive-account'
	);

	containers.forEach( ( container ) => {
		if ( ! container.querySelector( '.eventive-account-container' ) ) {
			const root = createRoot( container );
			root.render( <EventiveAccount /> );
		}
	} );
} );
