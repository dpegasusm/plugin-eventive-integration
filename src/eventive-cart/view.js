/**
 * Eventive Cart Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * Cart Component
 */
function CartApp() {
	const [ cartItems, setCartItems ] = useState( [] );
	const [ cartQuantity, setCartQuantity ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( true );

	useEffect( () => {
		const initCart = async () => {
			if ( ! window.Eventive || ! window.Eventive.cart ) {
				setTimeout( initCart, 100 );
				return;
			}

			await updateCartDisplay();
			setIsLoading( false );

			// Listen for cart updates
			if ( window.Eventive.on ) {
				window.Eventive.on( 'cartUpdated', updateCartDisplay );
			}
		};

		initCart();

		return () => {
			if ( window.Eventive && window.Eventive.off ) {
				window.Eventive.off( 'cartUpdated', updateCartDisplay );
			}
		};
	}, [] );

	const updateCartDisplay = async () => {
		try {
			if ( ! window.Eventive || ! window.Eventive.cart ) {
				return;
			}

			const cart = await window.Eventive.cart.getCurrentCartOrder();
			const quantity = await window.Eventive.cart.getCartQuantity();

			setCartQuantity( quantity );

			if ( cart && cart.subitems && cart.subitems.length > 0 ) {
				setCartItems( cart.subitems );
			} else {
				setCartItems( [] );
			}

			// Rebuild Eventive UI components if necessary
			if ( window.Eventive.rebuild ) {
				window.Eventive.rebuild();
			}
		} catch ( error ) {
			console.error( 'Error updating cart display:', error );
		}
	};

	const handleResetCart = async () => {
		try {
			if ( window.Eventive.cart.reset ) {
				await window.Eventive.cart.reset();
				await updateCartDisplay();
			}
		} catch ( error ) {
			console.error( 'Error resetting cart:', error );
		}
	};

	const formatPrice = ( cents ) => {
		return '$' + ( cents / 100 ).toFixed( 2 );
	};

	if ( isLoading ) {
		return (
			<div className="cart-loading">
				<p>Loading cart...</p>
			</div>
		);
	}

	return (
		<div className="eventive-cart-container">
			<div className="cart-header">
				<div className="cart-actions">
					{ cartQuantity > 0 && (
						<>
							<div
								className="eventive-button"
								data-view-cart="true"
								data-label="Go To Checkout"
							></div>
							<button
								className="reset-cart-btn"
								onClick={ handleResetCart }
							>
								RESET CART
							</button>
						</>
					) }
					{ cartQuantity === 0 && (
						<a
							href="/festival-schedule"
							className="find-tickets-link"
						>
							Find Tickets to Add
						</a>
					) }
					<span className="cart-quantity">
						Items in cart: <strong>{ cartQuantity }</strong>
					</span>
				</div>
			</div>

			<table className="cart-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Quantity</th>
						<th>Price</th>
						<th>Total Price</th>
					</tr>
				</thead>
				<tbody>
					{ cartItems.length === 0 ? (
						<tr>
							<td colSpan="4" style={ { textAlign: 'center' } }>
								Your cart is empty.
							</td>
						</tr>
					) : (
						cartItems.map( ( item, idx ) => {
							const name =
								item.name ||
								( item.pass_bucket ? 'Pass' : 'Ticket' );
							const price = ( item.price || 0 ) / 100;
							const totalPrice = price * item.quantity;

							return (
								<tr key={ idx }>
									<td>{ name }</td>
									<td>{ item.quantity }</td>
									<td>{ formatPrice( item.price || 0 ) }</td>
									<td>{ formatPrice( totalPrice * 100 ) }</td>
								</tr>
							);
						} )
					) }
				</tbody>
			</table>
		</div>
	);
}

/**
 * Initialize block on all matching elements
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll( '.wp-block-eventive-cart' );

	blocks.forEach( ( block ) => {
		const root = createRoot( block );
		root.render( <CartApp /> );
	} );
} );
