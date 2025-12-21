<?php

/**
 * Shortcode: [eventive-account]
 *
 * Renders the full Eventive account page, including:
 * - Account details section ([eventive-account-details])
 * - Passes section ([eventive-account-passes])
 * - Tickets section ([eventive-account-tickets])
 *
 * Each section is rendered via its own shortcode, allowing for modular styling and logic.
 * The output is wrapped in a container div for layout and styling.
 *
 * Usage:
 *   [eventive-account]
 */
function eventive_account_shortcode() {
    ob_start();
    // Unique IDs to avoid collisions when multiple instances are used (Elementor-safe)
    $instance_id         = 'acct_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $wrapper_id          = $instance_id . '_wrap';
    $login_check_id      = $instance_id . '_login_check';
    $content_id          = $instance_id . '_content';
    $logout_link_id      = $instance_id . '_logout_link';
    $login_required_id   = $instance_id . '_login_required';
    ?>
    <div id="<?php echo esc_attr($wrapper_id); ?>" class="eventive-account-container" data-instance="<?php echo esc_attr($instance_id); ?>">
        <div id="<?php echo esc_attr($login_check_id); ?>" style="display: none;"></div>
        <div id="<?php echo esc_attr($content_id); ?>" style="display: none;">
            <div class="account-actions" style="display:none; margin: 0 0 12px 0; text-align: right;">
                <a href="#" id="<?php echo esc_attr($logout_link_id); ?>" class="eventive-logout-link" style="text-decoration: underline; font-weight: 600;">Log out</a>
            </div>
            <div class="top-section">
                <div class="account-details">
                    <?php echo do_shortcode('[eventive-account-details]'); ?>
                </div>
                <div class="account-passes">
                    <?php echo do_shortcode('[eventive-account-passes]'); ?>
                </div>
            </div>
            <div class="account-tickets">
                <?php echo do_shortcode('[eventive-account-tickets]'); ?>
            </div>
        </div>
        <div id="<?php echo esc_attr($login_required_id); ?>" style="display: none; text-align: center; margin-top: 20px;">
            <p style="text-align: center;">You are not logged in. Please log in to view your account.</p>
            <?php echo do_shortcode('[eventive-login]'); ?>
        </div>
    </div>
    <?php
    // Ensure the Eventive loader handle exists so our inline initializer attaches correctly
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }

// Ensure the Eventive loader is present first
if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
    if ( function_exists('add_eventive_dynamic_scripts') ) {
        add_eventive_dynamic_scripts();
    }
}

// Enqueue external initializer
wp_enqueue_script(
    'eventive-account-init',
    plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-account.js',
    array('eventive-loader'),
    '1.0.0',
    true
);

    return ob_get_clean();
}
add_shortcode('eventive-account', 'eventive_account_shortcode');