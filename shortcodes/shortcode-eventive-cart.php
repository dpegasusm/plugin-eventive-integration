<?php
// CART FUNCTION
function eventive_cart_shortcode() {
    // Retrieve options
    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $your_eventive_secret_key = esc_js($eventive_admin_options['your_eventive_secret_key_2']);
    $your_eventive_event_bucket = esc_js($eventive_admin_options['your_eventive_event_bucket_1']);
    $site_url = esc_url(get_site_url());

    ob_start(); // Start output buffering
    ?>
    <script>
        // Embed PHP variables into JavaScript
        const EVENTIVE_CONFIG = {
            eventBucketId: "<?php echo $your_eventive_event_bucket; ?>",
            apiKey: "<?php echo $your_eventive_secret_key; ?>",
            siteURL: "<?php echo $site_url; ?>"
        };

        document.addEventListener('DOMContentLoaded', () => {
            const updateCartDisplay = async () => {
                try {
                    if (!window.Eventive || !window.Eventive.is_logged_in) {
                        console.warn('Eventive is not available or the user is not logged in.');
                        return;
                    }

                    const cart = await window.Eventive.cart.getCurrentCartOrder();
                    const cartQuantity = await window.Eventive.cart.getCartQuantity();
                    const cartTableBody = document.querySelector('#cart-order tbody');

                    // Update cart quantity display
                    document.getElementById('cart-quantity').innerText = cartQuantity;

                    // Show/hide buttons based on cart state
                    document.querySelector('[data-view-cart="true"]').style.display = cartQuantity > 0 ? 'block' : 'none';
                    document.querySelector('[data-reset-cart="true"]').style.display = cartQuantity > 0 ? 'block' : 'none';
                    document.getElementById('find-tickets-button').style.display = cartQuantity > 0 ? 'none' : 'block';

                    // Clear and repopulate cart content
                    cartTableBody.innerHTML = '';
                    if (cart && cart.subitems && cart.subitems.length > 0) {
                        cart.subitems.forEach(item => {
                            const name = item.name || (item.pass_bucket ? 'Pass' : 'Ticket');
                            const price = (item.price || 0) / 100; // Convert cents to dollars
                            const totalPrice = price * item.quantity;

                            const row = `
                                <tr>
                                    <td>${name}</td>
                                    <td>${item.quantity}</td>
                                    <td>$${price.toFixed(2)}</td>
                                    <td>$${totalPrice.toFixed(2)}</td>
                                </tr>`;
                            cartTableBody.innerHTML += row;
                        });
                    } else {
                        cartTableBody.innerHTML = `
                            <tr>
                                <td colspan="4" style="text-align: center;">Your cart is empty.</td>
                            </tr>`;
                    }

                    // Rebuild Eventive UI components if necessary
                    if (window.Eventive.rebuild) {
                        window.Eventive.rebuild();
                    }
                } catch (error) {
                    console.error('Error updating cart display:', error);
                    document.querySelector('#cart-order tbody').innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align: center; color: red;">Error loading cart data.</td>
                        </tr>`;
                }
            };

            // Reset cart functionality
            const resetCart = async () => {
                try {
                    if (window.Eventive.cart.reset) {
                        await window.Eventive.cart.reset();
                        updateCartDisplay();
                    }
                } catch (error) {
                    console.error('Error resetting cart:', error);
                }
            };

            // Attach event listener for reset cart button
            const resetCartButton = document.querySelector('[data-reset-cart="true"]');
            if (resetCartButton) {
                resetCartButton.addEventListener('click', resetCart);
            }

            // Listen for cart updates
            if (window.Eventive) {
                window.Eventive.on('cartUpdated', updateCartDisplay);
                updateCartDisplay(); // Initial update
            } else {
                console.warn('Eventive API is not available.');
            }
        });
    </script>

    <div id="cart-order-container">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div class="eventive-button" data-view-cart="true" data-label="Go To Checkout" style="margin-left: 10px; display: none;"></div>
            <div class="eventive-button" data-reset-cart="true" data-label="RESET CART" style="margin-left: 10px; display: none;"></div>
            <a href="<?php echo $site_url; ?>/festival-schedule" id="find-tickets-button" style="margin-left: 10px; display: none;">Find Tickets to Add</a>
            <span style="margin-left: 10px;">Items in cart: <span id="cart-quantity">0</span></span>
        </div>
        <table id="cart-order" border="1" style="width:100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total Price</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="4" style="text-align: center;">Loading cart...</td>
                </tr>
            </tbody>
        </table>
    </div>
    <?php
    return ob_get_clean(); // Return the buffered output
}
add_shortcode('eventive-cart', 'eventive_cart_shortcode');
?>