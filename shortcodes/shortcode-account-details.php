<?php
/**
 * Shortcode: [eventive-account-details]
 *
 * Renders the Eventive Account Details section for a logged-in user.
 *
 * Features:
 * - Shows a loader while verifying login state and fetching account data from the Eventive API.
 * - If logged in, displays a table of editable user fields (name, email, phone, mailing address, SMS tickets enabled).
 * - Allows in-place editing of each field with "Edit", "Submit", and "Cancel" buttons.
 * - Submits updates to a custom WordPress REST endpoint and updates the UI on success.
 * - Handles login state and hides content if the user is not authenticated.
 * - Uses JavaScript for fetching, rendering, editing, and updating account data, as well as for UI interactivity.
 *
 * Dependencies:
 * - Requires Eventive Everywhere JS API and a utility JS file (eventive-utils.js).
 *
 * Usage:
 *   [eventive-account-details]
 */
function eventive_account_details_shortcode() {
    // Enqueue utility script (shared helpers)
    wp_enqueue_script(
        'eventive-utils',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-utils.js',
        array(),
        '1.0.0',
        true
    );

    // Enqueue CSS for account details
    wp_enqueue_style(
        'eventive-account-details',
        plugin_dir_url( dirname(__FILE__) ) . 'css/eventive-account-details.css',
        array(),
        '1.0.0'
    );

    wp_enqueue_script( 'wp-api-fetch' );
    wp_enqueue_script( 'wp-api' );
    ob_start(); // Start output buffering

    // Unique IDs (Elementor-safe, supports multiple instances)
    $instance_id   = 'acctd_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $wrapper_id    = $instance_id . '_wrap';
    $login_wrap_id = $instance_id . '_login';
    $content_id    = $instance_id . '_content';
    $table_id      = $instance_id . '_table';
    ?>
    <div id="<?php echo esc_attr($wrapper_id); ?>" class="eventive-account-details" data-instance="<?php echo esc_attr($instance_id); ?>">
        <div id="<?php echo esc_attr($login_wrap_id); ?>" class="eventive-login-container" style="display: flex; justify-content: center; align-items: center; height: 100px;">
            <div class="loader"></div>
        </div>
        <div id="<?php echo esc_attr($content_id); ?>" class="eventive-account-details-content" style="display: none;">
            <h2>My Account Details</h2>
            <table id="<?php echo esc_attr($table_id); ?>" class="styled-table">
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Value</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
            <div class="eventive-account-actions" style="margin-top:16px;">
                <div class="eventive-button" data-payment="true" data-label="Manage Payment Details"></div>
            </div>
        </div>
    </div>
    <?php

    // Ensure Eventive loader is present so our initializer can hook to it
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }

    // Pass instance selectors to the external script via a tiny inline config (safe JSON)
    $cfg = array(
        'wrap'    => $wrapper_id,
        'login'   => $login_wrap_id,
        'content' => $content_id,
        'table'   => $table_id,
    );


    // Register the initializer first so wp_add_inline_script can attach to the handle
    wp_register_script(
        'eventive-account-details-init',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-account-details.js',
        array('eventive-loader', 'eventive-utils', 'wp-api-fetch'),
        '1.0.1',
        true
    );

    // Inject per-instance config BEFORE the script executes
    wp_add_inline_script(
        'eventive-account-details-init',
        'window.__EVT_ACCOUNT_DETAILS = (window.__EVT_ACCOUNT_DETAILS||[]); window.__EVT_ACCOUNT_DETAILS.push(' . wp_json_encode($cfg) . ');',
        'before'
    );

    // Now enqueue the script
    wp_enqueue_script('eventive-account-details-init');

    return ob_get_clean();
}
add_shortcode('eventive-account-details', 'eventive_account_details_shortcode');