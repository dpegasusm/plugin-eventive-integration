<?php
/**
 * Shortcode: [eventive_native_year_round]
 * Last Updated: Oct 29, 2025
 *
 * Elementor‑safe refactor: all JS moved to /js/eventive-native-year-round.js
 * Each instance pushes its config into window.__EVT_NATIVE_YR before the script runs.
 */
function eventive_native_year_round($atts = []) {
    // Read settings
    $film_sync_enabled   = get_option('eventive_enable_film_sync', '0') === '1';
    $film_detail_page_id = get_option('eventive_film_detail_page_id', 0);
    $detailBaseURL       = $film_detail_page_id ? get_permalink($film_detail_page_id) : get_site_url();
    $prettyPermalinks    = (bool) get_option('permalink_structure');

    // Enqueue CSS (unchanged)
    wp_enqueue_style(
        'eventive-native-style',
        plugin_dir_url(__FILE__) . '../css/eventive-native.css',
        [],
        '1.0.0'
    );

    // Eventive options
    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $event_bucket = $eventive_admin_options['your_eventive_event_bucket_1'] ?? '';
    $api_key      = $eventive_admin_options['your_eventive_secret_key_2'] ?? '';

    if (empty($event_bucket) || empty($api_key)) {
        return '<p class="error-message">Eventive event bucket or secret key is not configured. Please check your settings.</p>';
    }

    // Shortcode attributes (previous defaults preserved)
    $atts = shortcode_atts([
        'image'       => 'poster', // poster | cover | still | none
        'description' => 'true',
        'venue'       => 'true',
        'details'     => 'true',
    ], $atts, 'eventive_native_year_round');

    // Normalize params (Elementor sometimes uppercases/varies)
    $imageRaw = strtolower(trim((string)$atts['image']));
    $allowedImages = ['poster','cover','still','none'];
    $imageType = in_array($imageRaw, $allowedImages, true) ? $imageRaw : 'poster';

    $descRaw = strtolower(trim((string)$atts['description']));
    $venueRaw = strtolower(trim((string)$atts['venue']));
    $detailsRaw = strtolower(trim((string)$atts['details']));

    $trueVals = ['1','true','yes','on'];
    $showDescription = in_array($descRaw, $trueVals, true);
    $showVenue       = in_array($venueRaw, $trueVals, true);
    $showDetails     = in_array($detailsRaw, $trueVals, true);

    // --- Ensure Eventive loader is present
    if (function_exists('add_eventive_dynamic_scripts')) {
        add_eventive_dynamic_scripts();
    } else if (wp_script_is('eventive-loader', 'registered') && !wp_script_is('eventive-loader', 'enqueued')) {
        wp_enqueue_script('eventive-loader');
    }

    // --- Register external JS for this shortcode
    wp_register_script(
        'eventive-native-year-round',
        plugin_dir_url(dirname(__FILE__)) . 'js/eventive-native-year-round.js',
        ['eventive-loader'],
        '1.0.0',
        true
    );

    // --- Build unique IDs per instance (Elementor‑safe)
    $uid = 'nyr_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('', true));
    $ids = [
        'root'        => $uid . '_root',
        'calWrap'     => $uid . '_calendar_wrap',
        'buttons'     => $uid . '_calendar_buttons',
        'prev'        => $uid . '_prev',
        'next'        => $uid . '_next',
        'events'      => $uid . '_events',
    ];

    // --- Push per‑instance config BEFORE the script executes
    $cfg = [
        'ids' => $ids,
        'eventBucket'      => $event_bucket,
        'apiKey'           => $api_key,
        'imageType'        => $imageType,
        'showDescription'  => $showDescription,
        'showVenue'        => $showVenue,
        'showDetails'      => $showDetails,
        'filmDetailBaseURL'=> esc_url_raw($detailBaseURL),
        'usePrettyPermalinks' => $prettyPermalinks,
        'filmSyncEnabled'  => $film_sync_enabled,
    ];

    wp_add_inline_script(
        'eventive-native-year-round',
        'window.__EVT_NATIVE_YR = (window.__EVT_NATIVE_YR||[]); window.__EVT_NATIVE_YR.push(' . wp_json_encode($cfg) . ');',
        'before'
    );

    wp_enqueue_script('eventive-native-year-round');

    // --- Markup (only containers; no inline JS)
    ob_start(); ?>
    <section id="<?php echo esc_attr($ids['root']); ?>" class="eventive-native-year-round" data-image-type="<?php echo esc_attr($imageType); ?>">
        <div id="<?php echo esc_attr($ids['calWrap']); ?>" class="weekly-calendar-container">
            <button id="<?php echo esc_attr($ids['prev']); ?>" class="week-nav-button" type="button" aria-label="Previous week">←</button>
            <div id="<?php echo esc_attr($ids['buttons']); ?>" class="weekly-calendar-buttons"></div>
            <button id="<?php echo esc_attr($ids['next']); ?>" class="week-nav-button" type="button" aria-label="Next week">→</button>
        </div>
        <div id="<?php echo esc_attr($ids['events']); ?>" class="events-container"></div>
        </div>
    </section>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive_native_year_round', 'eventive_native_year_round');