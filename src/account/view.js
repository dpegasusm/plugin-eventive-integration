/**
 * Eventive Account Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot, useState, useEffect, useRef } from '@wordpress/element';

/**
 * Account component
 * @param root0
 * @param root0.childNodes
 */
function EventiveAccount( { childNodes } ) {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const childBlocksRef = useRef( null );

	useEffect( () => {
		// Wait for Eventive to be ready
		const checkLogin = () => {
			if (
				window.Eventive &&
				typeof window.Eventive.isLoggedIn === 'function'
			) {
				try {
					const loggedIn = window.Eventive.isLoggedIn();
					setIsLoggedIn( loggedIn );
				} catch ( e ) {
					setIsLoggedIn( false );
				} finally {
					setIsLoading( false );
				}
			}
		};

		const handleLogin = () => {
			setIsLoggedIn( true );
		};

		const handleLogoutEvent = () => {
			setIsLoggedIn( false );
		};

		if ( ! window.Eventive || ! window.Eventive.on ) {
			// If loader not present yet, show login prompt as safe default
			setIsLoading( false );
			setIsLoggedIn( false );
			return;
		}

		// Check if Eventive is already ready
		if ( window.Eventive._ready || window.Eventive.ready ) {
			checkLogin();
		} else {
			window.Eventive.on( 'ready', checkLogin );
		}

		// Also listen for auth state changes
		try {
			window.Eventive.on( 'login', handleLogin );
			window.Eventive.on( 'logout', handleLogoutEvent );
		} catch ( _ ) {}

		return () => {
			if ( window.Eventive && window.Eventive.off ) {
				try {
					window.Eventive.off( 'ready', checkLogin );
					window.Eventive.off( 'login', handleLogin );
					window.Eventive.off( 'logout', handleLogoutEvent );
				} catch ( _ ) {}
			}
		};
	}, [] );

	// Move child nodes into the ref container after render
	useEffect( () => {
		if ( childBlocksRef.current && childNodes && childNodes.length > 0 ) {
			// Clear any existing content first
			childBlocksRef.current.innerHTML = '';
			// Append the actual DOM nodes (not HTML strings)
			childNodes.forEach( ( node ) => {
				childBlocksRef.current.appendChild( node );
			} );
		}
	}, [ isLoggedIn, isLoading, childNodes ] );

	const handleLogout = async ( e ) => {
		e.preventDefault();

		// Use global handler when available
		if ( typeof window.handleLogout === 'function' ) {
			try {
				window.handleLogout();
				return;
			} catch ( err ) {
				console.error( 'handleLogout error:', err );
			}
		}

		// Fallback logout flow
		try {
			// Clear storage
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

			try {
				sessionStorage.clear();
			} catch ( _ ) {}

			document.cookie = 'eventive-personState=; path=/; max-age=0';

			// Call Eventive logout
			if ( window.Eventive && window.Eventive.logout ) {
				try {
					await window.Eventive.logout();
				} catch ( err ) {
					console.error( 'Eventive.logout() failed:', err );
				}
			}

			// Call logout endpoint
			if ( window.Eventive && window.Eventive.request ) {
				try {
					await window.Eventive.request( {
						method: 'POST',
						path: 'people/logout',
						authenticatePerson: true,
					} );
				} catch ( _ ) {}
			}

			// Reload page
			window.location.reload();
		} catch ( err ) {
			console.error( 'Unexpected logout error:', err );
			window.location.reload();
		}
	};

	if ( isLoading ) {
		return (
			<div className="eventive-account-container">
				<p className="eventive-loading">Loading...</p>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-account-container">
				<div className="eventive-notice">
					<p>
						You are not logged in. Please log in to view your
						account.
					</p>
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
			<div
				ref={ childBlocksRef }
				className="eventive-account-child-blocks"
			/>
		</div>
	);
}

/**
 * Initialize the block on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll(
		'.wp-block-eventive-account'
	);

	containers.forEach( ( container ) => {
		// Idempotent guard - don't initialize twice
		if ( container.__evtInited ) {
			return;
		}
		container.__evtInited = true;

		// Extract the actual DOM nodes (not HTML strings) before React takes over
		const childNodes = Array.from( container.childNodes );

		const root = createRoot( container );
		root.render( <EventiveAccount childNodes={ childNodes } /> );
	} );
} );
