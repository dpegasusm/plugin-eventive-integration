<?php
/**
 * Shortcode: [eventive-login]
 * Elementor‑safe: No inline JS. Per‑instance config is pushed to window globals
 * and consumed by external initializers in /js.
 */

// [eventive-login]
function eventive_login_shortcode( $atts = array() ) {
    // Shortcode attributes (Elementor / WP-safe)
    $atts = shortcode_atts(
        array(
            'login-link-text' => '',
        ),
        $atts,
        'eventive-login'
    );

    // Determine login link text (fallback to default if not provided)
    $login_link_text = trim( (string) $atts['login-link-text'] );
    if ( $login_link_text === '' ) {
        $login_link_text = 'Log in to your account';
    }
    // Enqueue CSS
    wp_enqueue_style(
        'eventive-login-style',
        plugin_dir_url(__FILE__) . '../css/eventive-login.css',
        array(),
        '1.0.2'
    );

    // Resolve bucket defaults
    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $override_bucket = is_singular() ? get_post_meta(get_the_ID(), '_eventive_loader_override', true) : '';
    $default_event_bucket = $override_bucket ?: ($eventive_admin_options['your_eventive_event_bucket_1'] ?? '');

    // Generate unique IDs (Elementor‑safe, multi‑instance)
    $uid = uniqid('evt_login_');
    $container_id  = 'eventive-login-container-' . $uid;
    $message_id    = 'eventive-login-message-' . $uid;
    $trigger_id    = 'eventive-login-trigger-' . $uid;
    $welcome_id    = 'eventive-welcome-text-' . $uid;
    $logout_id     = 'eventive-logout-link-' . $uid;
    $modal_id      = 'eventive-login-modal-' . $uid;
    $email_id      = 'emailField-' . $uid;
    $password_id   = 'passwordField-' . $uid;
    $error_id      = 'eventive-login-error-' . $uid;
    $login_btn_id  = 'eventive-login-button-' . $uid;
    $cancel_btn_id = 'eventive-cancel-button-' . $uid;

    // Ensure loader is registered/enqueued (don’t block if not present)
    if ( function_exists('add_eventive_dynamic_scripts') ) {
        add_eventive_dynamic_scripts(); // registers + enqueues your loader handle internally
    } else {
        // If a loader handle is already registered but not enqueued, enqueue it
        if ( wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
            wp_enqueue_script('eventive-loader');
        }
    }

    // Make the initializer depend on jQuery and the loader when available
    $deps = array('jquery');
    if ( wp_script_is('eventive-loader', 'registered') ) {
        $deps[] = 'eventive-loader';
    }

    // Register external initializer
    wp_register_script(
        'eventive-login-init',
        plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-login.js',
        $deps,
        '1.0.2',
        true
    );

    // Per‑instance config pushed BEFORE the script runs
    $cfg = array(
        'uid'            => $uid,
        'bucket'         => $default_event_bucket,
        'container'      => $container_id,
        'message'        => $message_id,
        'trigger'        => $trigger_id,
        'welcome'        => $welcome_id,
        'logout'         => $logout_id,
        'modal'          => $modal_id,
        'email'          => $email_id,
        'password'       => $password_id,
        'error'          => $error_id,
        'loginBtn'       => $login_btn_id,
        'cancelBtn'      => $cancel_btn_id,
        'loginLinkText'  => $login_link_text,
    );

    wp_add_inline_script(
        'eventive-login-init',
        'window.__EVT_LOGIN_INSTANCES = (window.__EVT_LOGIN_INSTANCES||[]); window.__EVT_LOGIN_INSTANCES.push(' . wp_json_encode($cfg) . ');',
        'before'
    );

    // Enqueue initializer
    wp_enqueue_script('eventive-login-init');

    wp_add_inline_script(
        'eventive-login-init',
        '(function(){
    if(window.jQuery && window.elementorFrontend){
      try{
        jQuery(window).on("elementor/frontend/init", function(){
          try{ /* instances are initialized by eventive-login.js when Eventive is ready */ }catch(e){}
        });
      }catch(e){}
    }
  })();',
        'after'
    );

    ob_start();
    ?>
    <style data-eventive-inline>
      /* FOUC guard: only while container is in initial-hide state */
      .eventive-initial-hide { visibility: hidden !important; }
      .eventive-initial-hide .eventive-modal { display: none !important; }
      .eventive-initial-hide .hidden { display: none !important; }
    </style>
    <div id="<?php echo esc_attr($container_id); ?>" data-login-id="<?php echo esc_attr($uid); ?>" data-event-bucket="<?php echo esc_attr($default_event_bucket); ?>" class="eventive-initial-hide">
        <p id="<?php echo esc_attr($message_id); ?>" class="eventive-login-message" aria-live="polite" aria-busy="true">
            <a href="#" id="<?php echo esc_attr($trigger_id); ?>" class="hidden" aria-hidden="true"><?php echo esc_html( $login_link_text ); ?></a>
            <span id="<?php echo esc_attr($welcome_id); ?>" class="hidden" aria-hidden="true"></span>
            <a href="#" id="<?php echo esc_attr($logout_id); ?>" class="hidden" aria-hidden="true">Log out</a>
        </p>

        <!-- Modal -->
        <div id="<?php echo esc_attr($modal_id); ?>" class="eventive-modal eventive-login-modal hidden" role="dialog" aria-modal="true" aria-labelledby="<?php echo esc_attr($message_id); ?>">
            <div class="eventive-login-form" aria-live="polite">
                <button type="button" class="eventive-modal-close" aria-label="Close" style="position:absolute; top:8px; right:8px; background:none; border:none; font-size:20px; line-height:1; cursor:pointer;">×</button>
                <p class="eventive-modal-title">Log in using your Eventive Account</p>
                <label for="<?php echo esc_attr($email_id); ?>">Email</label>
                <input type="text" id="<?php echo esc_attr($email_id); ?>" name="email" />
                <label for="<?php echo esc_attr($password_id); ?>">Password</label>
                <input type="password" id="<?php echo esc_attr($password_id); ?>" name="password" />
                <div id="<?php echo esc_attr($error_id); ?>" class="hidden"></div>
                <div class="button-row">
                    <button id="<?php echo esc_attr($login_btn_id); ?>">LOGIN</button>
                    <button id="<?php echo esc_attr($cancel_btn_id); ?>">CANCEL</button>
                </div>
                <div class="eventive-modal-footer">
                    <div>
                        <div class="eventive-footer-note">
                            <a href="https://eventive.org" target="_blank" rel="noopener">
                                Powered by <img src="https://festival.eofilmfest.com/img/eventive.png" alt="Eventive" />
                            </a>
                        </div>
                        <div>
                            <a href="https://eventive.org/terms" target="_blank" rel="noopener">Terms</a> ·
                            <a href="https://eventive.org/privacy" target="_blank" rel="noopener">Privacy</a> ·
                            <a href="https://status.eventive.org/" target="_blank" rel="noopener">System Status</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive-login', 'eventive_login_shortcode');

?>
