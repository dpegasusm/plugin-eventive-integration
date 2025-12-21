<?php
/**
 * Eventive Account Passes Shortcode
 *
 * Shortcode: [eventive-account-passes]
 *
 * Description:
 * Displays a user's active Eventive passes once they are logged in via Eventive Everywhere.
 * Hides the interface if the user is not authenticated.
 *
 * Features:
 * - Shows loading spinner while checking login state and fetching data.
 * - Hides all content if user is not logged in.
 * - Calls the Eventive API to retrieve user passes (people/self/passes).
 * - Displays pass information such as name, pass bucket, renewal date, and usage stats.
 * - Edit Pass Details modal with dynamic supplementary fields from schema.
 *
 * Dependencies:
 * - eventive-utils.js (required for `EventiveUtils.hideLoader`)
 * - Eventive JS SDK (loader.js) must be initialized in the page for Eventive API calls.
 *
 * Notes:
 * - Uses page-level _eventive_loader_override if set, otherwise plugin default bucket.
 * - No bucket switcher or localStorage overrides (single source of truth).
 */
function eventive_account_passes_shortcode() {
    $eventive_admin_options = get_option('eventive_admin_options_option_name');

    // Robust page context even when nested inside other shortcodes/builders
    $page_id = function_exists('get_queried_object_id') ? get_queried_object_id() : ( get_the_ID() ?: 0 );
    $override_bucket_raw = $page_id ? get_post_meta($page_id, '_eventive_loader_override', true) : '';
    $override_bucket = is_string($override_bucket_raw) ? trim($override_bucket_raw) : '';

    // Final bucket: page override wins, else plugin default
    $plugin_default_bucket = isset($eventive_admin_options['your_eventive_event_bucket_1'])
        ? trim((string) $eventive_admin_options['your_eventive_event_bucket_1'])
        : '';
    $resolved_bucket = $override_bucket ?: $plugin_default_bucket;

    // Enqueue the utility script
    wp_enqueue_script(
        'eventive-utils',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-utils.js',
        array(),
        '1.0.1',
        true
    );
    // Enqueue passes CSS (ensures modal is hidden by default)
    wp_enqueue_style(
        'eventive-account-passes',
        plugin_dir_url( dirname(__FILE__) ) . 'css/eventive-account-passes.css',
        array(),
        '1.0.0'
    );

    // (No longer localize script; per-instance config is now injected.)

    ob_start();
    // Unique IDs so multiple instances can coexist
    $instance_id            = 'pass_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $wrap_id                = $instance_id . '_wrap';
    $login_id               = $instance_id . '_login';
    $list_id                = $instance_id . '_list';
    $edit_modal_id          = $instance_id . '_edit_modal';
    $edit_modal_content_id  = $instance_id . '_edit_modal_content';
    $edit_close_id          = $instance_id . '_edit_close';
    $edit_form_id           = $instance_id . '_edit_form';
    $edit_name_id           = $instance_id . '_edit_name';
    $edit_idx_id            = $instance_id . '_edit_idx';
    $edit_fields_id         = $instance_id . '_edit_fields';
    $barcode_modal_id       = $instance_id . '_barcode_modal';
    $barcode_modal_content  = $instance_id . '_barcode_modal_content';
    $barcode_close_id       = $instance_id . '_barcode_close';
    $barcode_img_id         = $instance_id . '_barcode_img';
    $barcode_meta_id        = $instance_id . '_barcode_meta';
    $barcode_legend_id      = $instance_id . '_barcode_legend';
    ?>
    <div id="<?php echo esc_attr($wrap_id); ?>" class="eventive-account-passes" data-instance="<?php echo esc_attr($instance_id); ?>">
      <div id="<?php echo esc_attr($login_id); ?>" class="eventive-login-container" style="display:flex;justify-content:center;align-items:center;height:100px;">
        <div class="loader"></div>
      </div>
      <div id="<?php echo esc_attr($list_id); ?>" class="eventive-passes-list" style="display:none;">
        <h2>My Passes</h2>
        <p>Loading passes...</p>
      </div>
    </div>

    <!-- Edit Pass Modal -->
    <div id="<?php echo esc_attr($edit_modal_id); ?>" class="eventive-edit-pass-modal" style="display:none;position:fixed;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,.4);z-index:9999;">
      <div id="<?php echo esc_attr($edit_modal_content_id); ?>" class="edit-pass-modal-content" style="background:#fff;max-width:640px;width:95%;padding:20px;border-radius:8px;position:relative;">
        <button id="<?php echo esc_attr($edit_close_id); ?>" class="eventive-close-edit-pass-modal" type="button" aria-label="Close" style="position:absolute;right:12px;top:10px;font-size:22px;line-height:1;background:none;border:none;cursor:pointer;">×</button>
        <h3 style="margin-top:0;">Edit Pass Details</h3>
        <form id="<?php echo esc_attr($edit_form_id); ?>">
          <input type="hidden" name="pass_idx" id="<?php echo esc_attr($edit_idx_id); ?>" />
          <div class="form-group">
            <label for="<?php echo esc_attr($edit_name_id); ?>">Pass Name</label>
            <input type="text" id="<?php echo esc_attr($edit_name_id); ?>" name="name" required />
          </div>
          <div id="<?php echo esc_attr($edit_fields_id); ?>" class="supplementary-fields"></div>
          <div style="margin-top:14px;">
            <button type="submit" class="pass-submit-row-button">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Show Pass Barcode Modal -->
    <div id="<?php echo esc_attr($barcode_modal_id); ?>" class="eventive-show-pass-barcode-modal" style="display:none;position:fixed;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,.4);z-index:9999;">
      <div id="<?php echo esc_attr($barcode_modal_content); ?>" class="show-pass-barcode-modal-content" style="background:#fff;max-width:520px;width:95%;padding:20px;border-radius:8px;position:relative;text-align:center;">
        <button id="<?php echo esc_attr($barcode_close_id); ?>" type="button" aria-label="Close" style="position:absolute;right:12px;top:10px;font-size:22px;line-height:1;background:none;border:none;cursor:pointer;">×</button>
        <h3 style="margin-top:0; font-size: 1.1em; text-decoration: underline;">My Pass Credentials</h3>
        <div id="<?php echo esc_attr($barcode_meta_id); ?>" style="margin-bottom:10px;font-size:14px;opacity:.8;"></div>
        <img id="<?php echo esc_attr($barcode_img_id); ?>" alt="Pass QR Code" style="max-width:320px;width:100%;height:auto;border:1px solid #eee;border-radius:8px;padding:12px;" />
        <div id="<?php echo esc_attr($barcode_legend_id); ?>" style="margin-top:10px;font-size:12px;opacity:.8;"></div>
      </div>
    </div>
    <?php
    // Ensure Eventive loader exists (so our init can hook into it)
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }

    // Build per-instance config (ids + bucket)
    $cfg = array(
        'wrap'               => $wrap_id,
        'login'              => $login_id,
        'list'               => $list_id,
        'edit_modal'         => $edit_modal_id,
        'edit_close'         => $edit_close_id,
        'edit_form'          => $edit_form_id,
        'edit_name'          => $edit_name_id,
        'edit_idx'           => $edit_idx_id,
        'edit_fields'        => $edit_fields_id,
        'barcode_modal'      => $barcode_modal_id,
        'barcode_close'      => $barcode_close_id,
        'barcode_img'        => $barcode_img_id,
        'barcode_meta'       => $barcode_meta_id,
        'barcode_legend'     => $barcode_legend_id,
        'bucket'             => $resolved_bucket,
        'bucket_source'      => ($override_bucket ? 'page_meta_override' : 'plugin_default')
    );

    // Register initializer so inline config can attach to it
    wp_register_script(
        'eventive-account-passes-init',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-account-passes.js',
        array('eventive-loader', 'eventive-utils'),
        '1.0.0',
        true
    );

    // Push config BEFORE the script runs
    wp_add_inline_script(
        'eventive-account-passes-init',
        'window.__EVT_ACCOUNT_PASSES = (window.__EVT_ACCOUNT_PASSES||[]); window.__EVT_ACCOUNT_PASSES.push(' . wp_json_encode($cfg) . ');',
        'before'
    );

    // Enqueue initializer
    wp_enqueue_script('eventive-account-passes-init');

    return ob_get_clean();
}
add_shortcode('eventive-account-passes', 'eventive_account_passes_shortcode');