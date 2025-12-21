<?php
/**
 * Shortcode: [eventive-film-details]
 * Last Updated: Oct 29, 2025
 *
 * Elementor-safe: all JS moved to /js/eventive-film-details.js
 * Per-instance config is pushed to window.__EVT_FILM_DETAILS before the script runs.
 */
function eventive_film_details($atts) {
    // Unique container ID to prevent Elementor double init
    $container_id = 'film-details-container-' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('fd_', true));

    // Enqueue CSS
    wp_enqueue_style(
        'eventive-film-details-style',
        plugin_dir_url(__FILE__) . '../css/eventive-film-details.css',
        array(),
        '1.0.1'
    );

    // Shortcode attrs
    $atts = shortcode_atts(
        array(
            'film-id'         => '',
            'show-events'     => 'true',
            'show-details'    => 'true',
            'show-tags'       => 'true',
            'exclude-virtual' => 'true',
        ),
        $atts,
        'eventive-film-details'
    );

    // Film ID from URL param or attribute
    $film_id = isset($_GET['film-id']) ? sanitize_text_field($_GET['film-id']) : sanitize_text_field($atts['film-id']);
    if (empty($film_id)) {
        return '<div>Please provide a valid film ID.</div>';
    }

    // Options
    $opts = get_option('eventive_admin_options_option_name');
    $event_bucket = isset($opts['your_eventive_event_bucket_1']) ? $opts['your_eventive_event_bucket_1'] : '';

    // Normalize booleans
    $show_events     = filter_var($atts['show-events'], FILTER_VALIDATE_BOOLEAN);
    $show_details    = filter_var($atts['show-details'], FILTER_VALIDATE_BOOLEAN);
    $show_tags       = filter_var($atts['show-tags'], FILTER_VALIDATE_BOOLEAN);
    $exclude_virtual = filter_var($atts['exclude-virtual'], FILTER_VALIDATE_BOOLEAN);

    // Ensure Eventive loader is available
    if (function_exists('add_eventive_dynamic_scripts')) {
        add_eventive_dynamic_scripts();
    } else if (wp_script_is('eventive-loader', 'registered') && !wp_script_is('eventive-loader', 'enqueued')) {
        wp_enqueue_script('eventive-loader');
    }

    // Register external JS
    wp_register_script(
        'eventive-film-details',
        plugin_dir_url(dirname(__FILE__)) . 'js/eventive-film-details.js',
        array('eventive-loader'),
        '1.0.0',
        true
    );

    // Push per-instance config BEFORE script executes
    $cfg = array(
        'containerId'    => $container_id,
        'filmId'         => $film_id,
        'eventBucket'    => $event_bucket,
        'showEvents'     => $show_events,
        'showDetails'    => $show_details,
        'showTags'       => $show_tags,
        'excludeVirtual' => $exclude_virtual,
    );
    wp_add_inline_script(
        'eventive-film-details',
        'window.__EVT_FILM_DETAILS = (window.__EVT_FILM_DETAILS||[]); window.__EVT_FILM_DETAILS.push(' . wp_json_encode($cfg) . ');',
        'before'
    );
    wp_enqueue_script('eventive-film-details');

    // Markup
    ob_start(); ?>
    <div id="<?php echo esc_attr($container_id); ?>"
         class="eventive-film-details"
         data-film-id="<?php echo esc_attr($film_id); ?>"
         data-show-events="<?php echo $show_events ? 'true' : 'false'; ?>"
         data-show-details="<?php echo $show_details ? 'true' : 'false'; ?>"
         data-show-tags="<?php echo $show_tags ? 'true' : 'false'; ?>"
         data-exclude-virtual="<?php echo $exclude_virtual ? 'true' : 'false'; ?>">
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive-film-details', 'eventive_film_details');