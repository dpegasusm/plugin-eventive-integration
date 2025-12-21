<?php
/**
 * Eventive Account Tickets Shortcode (Elementor‑safe)
 * Shortcode: [eventive-account-tickets]
 *
 * Renders a tickets list for the logged‑in Eventive person. JS lives in
 * `js/eventive-account-tickets.js` and is passed per‑instance config via
 * `window.__EVT_ACCOUNT_TICKETS`.
 */
function eventive_account_tickets_shortcode() {
    // Bucket resolution (page override meta takes precedence)
    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $override_bucket = is_singular() ? get_post_meta(get_the_ID(), '_eventive_loader_override', true) : '';
    $resolved_bucket = $override_bucket ?: ($eventive_admin_options['your_eventive_event_bucket_1'] ?? '');

    // Enqueue utilities + CSS from plugin root (not /shortcodes/)
    wp_enqueue_script(
        'eventive-utils',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-utils.js',
        array(),
        '1.0.1',
        true
    );

    wp_enqueue_style(
        'eventive-account-tickets',
        plugin_dir_url( dirname(__FILE__) ) . 'css/eventive-account-tickets.css',
        array(),
        '1.0.1'
    );

    // Defensive: hide modal unless .is-open is present
    if ( function_exists('wp_add_inline_style') ) {
        wp_add_inline_style('eventive-account-tickets', '#barcode-modal{display:none}#barcode-modal.is-open{display:flex}');
    }

    // Generate unique IDs per‑instance (Elementor‑safe)
    $instance_id   = 'tix_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $wrap_id       = $instance_id . '_wrap';
    $login_id      = $instance_id . '_login';
    $list_id       = $instance_id . '_list';
    $modal_id      = $instance_id . '_barcode_modal';
    $modal_inner   = $instance_id . '_barcode_inner';
    $modal_close   = $instance_id . '_barcode_close';
    $modal_body    = $instance_id . '_barcode_body';

    ob_start();
    ?>
    <div id="<?php echo esc_attr($wrap_id); ?>" class="eventive-account-tickets" data-instance="<?php echo esc_attr($instance_id); ?>">
        <div id="<?php echo esc_attr($login_id); ?>" class="eventive-login-container" style="display:flex;justify-content:center;align-items:center;height:100px;">
            <div class="loader"></div>
        </div>
        <div id="<?php echo esc_attr($list_id); ?>" class="eventive-tickets-column" style="display:none;">
            <h2>Tickets</h2>
            <p>Loading tickets...</p>
        </div>
    </div>

    <!-- Modal for displaying ticket barcodes / virtual button -->
    <div id="<?php echo esc_attr($modal_id); ?>" class="eventive-ticket-barcode-modal" style="display:none;position:fixed;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:9999;">
      <div id="<?php echo esc_attr($modal_inner); ?>" class="barcode-modal-inner" style="background:#fff;max-width:560px;width:92vw;padding:20px;border-radius:12px;position:relative;">
        <button id="<?php echo esc_attr($modal_close); ?>" type="button" aria-label="Close" style="position:absolute;right:12px;top:10px;font-size:22px;line-height:1;background:none;border:none;cursor:pointer;">×</button>
        <div id="<?php echo esc_attr($modal_body); ?>" class="barcode-modal-body"></div>
      </div>
    </div>
    <?php
    $html = ob_get_clean();

    // Ensure Eventive loader is available on this page
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }

    // Build per‑instance config
    $cfg = array(
        'wrap'       => $wrap_id,
        'login'      => $login_id,
        'list'       => $list_id,
        'modal'      => $modal_id,
        'modalInner' => $modal_inner,
        'modalClose' => $modal_close,
        'modalBody'  => $modal_body,
        'bucket'     => $resolved_bucket,
        'bucket_source' => ($override_bucket ? 'page_meta_override' : 'plugin_default')
    );

    // Register → inline config (before) → enqueue external initializer
    wp_register_script(
        'eventive-account-tickets-init',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-account-tickets.js',
        array('eventive-loader', 'eventive-utils'),
        '1.0.0',
        true
    );

    wp_add_inline_script(
        'eventive-account-tickets-init',
        'window.__EVT_ACCOUNT_TICKETS = (window.__EVT_ACCOUNT_TICKETS||[]); window.__EVT_ACCOUNT_TICKETS.push(' . wp_json_encode($cfg) . ');',
        'before'
    );

    wp_enqueue_script('eventive-account-tickets-init');

    return $html;
}
add_shortcode('eventive-account-tickets', 'eventive_account_tickets_shortcode');