<?php
/**
 * Eventive Carousel Shortcode
 * ---------------------------
 * This file registers the [eventive-carousel] shortcode which renders a dynamic carousel
 * of upcoming Eventive events based on a configured Eventive event bucket.
 *
 * Shortcode Usage:
 *   [eventive-carousel limit="5"]
 *
 * Parameters:
 *   - limit (optional): The number of upcoming events to display (maximum 10). Default is 10.
 *
 * Features:
 *   - Dynamically loads event data via JavaScript using the Eventive API.
 *   - Renders a carousel with background images, event names, dates, times, and ticket buttons.
 *   - Enqueues necessary styles and scripts only when shortcode is used.
 *   - Uses data-* attributes to pass configuration data to the frontend.
 *
 * Requirements:
 *   - Defined by selected Event Bucket in Plugin Admin.
 */
function eventive_carousel($atts) {
    // Enqueue styles and scripts
    wp_enqueue_style(
        'eventive-carousel-style',
        plugins_url('../css/eventive-carousel.css', __FILE__),
        array(),
        '1.0.0'
    );

    // Ensure Eventive loader is present (Elementor safe)
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }

    // Enqueue external carousel script; depend on eventive-loader instead of jQuery
    wp_enqueue_script(
        'eventive-carousel-script',
        plugins_url('../js/eventive-carousel.js', __FILE__),
        array('eventive-loader'),
        '1.0.0',
        true
    );

    // Retrieve Eventive admin options
    $eventive_admin_options = get_option('eventive_admin_options_option_name');

    if (empty($eventive_admin_options['your_eventive_event_bucket_1'])) {
        return '<p class="error-message">Eventive event bucket is not configured. Please check your settings in the Eventive plugin.</p>';
    }

    $event_bucket = sanitize_text_field($eventive_admin_options['your_eventive_event_bucket_1']);

    // Shortcode attributes and defaults
    $atts = shortcode_atts(
        [
            'limit' => 10, // Default limit to 10 events
            'description' => 'true' // Optionally show or hide event descriptions
        ],
        $atts,
        'eventive-carousel'
    );

    // Validate and cap the limit
    $limit = min((int)$atts['limit'], 10);
    $container_id = wp_unique_id('evt_carousel_');
    $show_description = filter_var($atts['description'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';

    // Output the carousel container with data attributes
    ob_start();
    ?>
    <div id="<?php echo esc_attr($container_id); ?>"
         class="event-carousel-container"
         data-bucket="<?php echo esc_attr($event_bucket); ?>"
         data-limit="<?php echo esc_attr($limit); ?>"
         data-description="<?php echo esc_attr($show_description); ?>">
        <!-- Carousel will be dynamically populated via JavaScript -->
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive-carousel', 'eventive_carousel');