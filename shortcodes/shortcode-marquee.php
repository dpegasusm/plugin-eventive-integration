<?php
/**
 * Eventive Marquee Shortcode
 * ---------------------------
 * Registers the [eventive_marquee] shortcode to display a scrolling marquee of film posters.
 *
 * Shortcode Usage:
 *   [eventive_marquee tag="Short" number="5" stills="true"]
 *
 * Parameters:
 *   - tag (optional): Filters films by tag name (e.g., "Short", "Narrative"). Supports comma-separated list.
 *   - exclude (optional): Excludes films that match one or more tag names. Supports comma-separated list.
 *   - number (optional): Limits the number of posters shown in the marquee (default: 5, max: 50).
 *   - stills (optional): Use still images instead of poster images (true/false, default: false).
 *
 * Features:
 *   - Fetches film data from Eventive API using the configured event bucket.
 *   - Filters by tag if specified.
 *   - Creates looping, animated marquee of poster (or still) images.
 *   - Poster images link to corresponding local film pages by slug.
 *   - Duplicates content to allow for infinite scrolling loop.
 *
 * Requirements:
 *   - A valid Eventive event bucket must be configured in plugin settings under 'your_eventive_event_bucket_1'.
 *   - Style definitions must be provided in 'eventive-marquee-carousel.css'.
 */
function eventive_marquee_shortcode($atts) {
    // Enqueue the stylesheet for this specific shortcode
    wp_enqueue_style('eventive-marquee-carousel-style', plugin_dir_url(__FILE__) . '../css/eventive-marquee-carousel.css', [], '1.0.0');

    // Parse shortcode attributes
    $atts = shortcode_atts([
        'tag' => '',
        'exclude' => '',
        'number' => 5,
        'stills' => false,
        'year-round' => false,
        'overlay' => '',              // URL to background image/pattern
        'overlay-opacity' => '0.22',  // 0–1
        'caption' => '',              // text to scroll
        'caption-speed' => 'match'    // 'match' or seconds like '45'
    ], $atts, 'eventive_marquee');

    // Normalize stills to a strict string for front-end parsing
    $stills_attr = is_string($atts['stills']) ? strtolower($atts['stills']) : $atts['stills'];
    $stills_bool = ($stills_attr === true || $stills_attr === 'true' || $stills_attr === '1' || $stills_attr === 1 || $stills_attr === 'yes');
    $stills_str  = $stills_bool ? 'true' : 'false';

    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $your_eventive_event_bucket = sanitize_text_field($eventive_admin_options['your_eventive_event_bucket_1']);
    $siteURL = esc_url(get_site_url());

    $film_sync_enabled = get_option('eventive_enable_film_sync', '0') === '1';
    $film_detail_page_id = get_option('eventive_film_detail_page_id', 0);
    $detailBaseURL = $film_detail_page_id ? get_permalink($film_detail_page_id) : get_site_url();
    $prettyPermalinks = get_option('permalink_structure') ? true : false;

    // Validate required configuration
    if (empty($your_eventive_event_bucket)) {
        return '<p>Error: Eventive event bucket is not configured. Please check your settings.</p>';
    }

    ob_start();
    ?>
<div class="eventive-marquee-wrapper"
     data-overlay-url="<?php echo esc_attr($atts['overlay']); ?>"
     data-overlay-opacity="<?php echo esc_attr($atts['overlay-opacity']); ?>"
     data-caption="<?php echo esc_attr($atts['caption']); ?>"
     data-caption-speed="<?php echo esc_attr($atts['caption-speed']); ?>"
     data-film-sync-enabled="<?php echo esc_attr( $film_sync_enabled ? 'true' : 'false' ); ?>"
     data-pretty-permalinks="<?php echo esc_attr( $prettyPermalinks ? 'true' : 'false' ); ?>"
     data-detail-base-url="<?php echo esc_url( $detailBaseURL ); ?>"
     data-event-bucket="<?php echo esc_attr( $your_eventive_event_bucket ); ?>"
     data-site-url="<?php echo esc_url( $siteURL ); ?>">
  <div class="eventive-marquee-overlay" aria-hidden="true"></div>
  <div class="eventive-marquee-container">
      <div class="eventive-marquee" 
           data-tag="<?php echo esc_attr($atts['tag']); ?>" 
           data-number="<?php echo esc_attr($atts['number']); ?>"
           data-stills="<?php echo esc_attr($stills_str); ?>"
           data-year-round="<?php echo esc_attr($atts['year-round']); ?>"
           data-exclude="<?php echo esc_attr($atts['exclude']); ?>">
           <div class="eventive-marquee-caption" aria-live="polite">
      <div class="eventive-marquee-caption-track"></div>
  </div>
      </div>
  </div>
</div>


    <?php
    // Ensure Eventive loader is present, then enqueue the external marquee script
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }
    wp_enqueue_script(
        'eventive-marquee',
        plugins_url('../js/eventive-marquee.js', __FILE__),
        array('eventive-loader'),
        '1.0.0',
        true
    );
    return ob_get_clean();
}
add_shortcode('eventive_marquee', 'eventive_marquee_shortcode');