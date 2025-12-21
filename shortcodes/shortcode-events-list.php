<?php
/**
 * Render an upcoming events list from Eventive within a WordPress page or post.
 *
 * This shortcode fetches event data from the Eventive API and displays it in a styled list.
 * Users can customize the output using shortcode parameters, including tag filtering,
 * exclude-tags (string): Comma-separated tag IDs or names to exclude
 * venue filtering, whether to show descriptions or posters, and how many events to show.
 *
 * Shortcode usage: [eventive-events-list]
 *
 * Available parameters:
 * - limit (int): Max number of events to display (default: 10)
 * - tag_id (string): Filter by tag ID
 * - exclude-tags (string): Comma-separated tag IDs or names to exclude
 * - venue_id (string): Filter by venue ID
 * - event_description (yes|no): Show/hide full event description (default: yes)
 * - short_event_description (yes|no): Show/hide short event description (default: yes)
 * - image (cover|poster|none) – Choose which image to display if set  (default: cover))
 * - virtual (yes|no): Filter virtual events (default: yes)
 * - show_filter (yes|no): Show tag filter above the event list (default: no)
 * - view (list|grid): Choose display mode (default: list)
 * - show-undated (true|false): Whether to include undated events; if true, these render first (default: true)
 * - include-past (true|false): Include past events; when false, only upcoming/undated events are shown (default: false)
 * - start-date (YYYY-MM-DD): Optional inclusive start date for filtering events by start_time
 * - end-date   (YYYY-MM-DD): Optional inclusive end date for filtering events by start_time
 *
 * The function outputs a responsive HTML structure that integrates with Eventive’s JS API
 * and is styled via the included CSS file.
 */
function eventive_schedule_list($atts) {
    // Enqueue the CSS for the eventive-events-list
    wp_enqueue_style(
        'eventive-events-list-style',
        plugin_dir_url( dirname(__FILE__) ) . 'css/events-list.css',
        array(),
        '1.0.0'
    );
    // Reuse tag pill styles for in-frame filter UI
    wp_enqueue_style(
        'eventive-tags-style',
        plugin_dir_url( dirname(__FILE__) ) . 'css/eventive-tags.css',
        array(),
        '1.0.0'
    );

    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $override_bucket = is_singular() ? get_post_meta(get_the_ID(), '_eventive_loader_override', true) : '';
    $your_eventive_event_bucket = $override_bucket ?: $eventive_admin_options['your_eventive_event_bucket_1'];

    // Extract shortcode attributes, adding the new ones for description/poster and view
    $atts = shortcode_atts(
        [
            'limit'                  => null,    // No limit by default
            'tag-id'                 => null,    // Default to no tag filtering
            'exclude-tags'           => null,    // Comma-separated tag IDs or names to exclude
            'venue-id'               => null,    // Filter by venue
            'event-description'      => 'yes',   // Show or hide full event description
            'short-event-description'=> null,    // Preferred: short-event-description (short description)
            'short-description'      => 'yes',   // Back-compat (deprecated, use short-event-description)
            'poster-image'           => 'yes',   // (deprecated, use image)
            'image'                  => 'cover', // cover, poster, or none
            'virtual'                => 'yes',   // Filter virtual events (default is yes)
            'include-past'           => 'false', // Include past events in listing (default: false)
            'show-filter'            => 'true',  // Boolean-like default; true shows tag filter by default
            'view'                   => 'list',  // list | grid
            'show-undated'           => 'true',  // (reserved for future use)
            'start-date'             => '',      // Optional YYYY-MM-DD inclusive start date
            'end-date'               => ''       // Optional YYYY-MM-DD inclusive end date
        ],
        $atts
    );

    // Normalize boolean-like shortcode values
    $normalize_bool = function( $v ) {
        if ( $v === null ) {
            return false;
        }
        $v = strtolower( trim( (string) $v ) );
        return in_array( $v, array( 'yes', 'true', '1', 'on' ), true );
    };

    // Use normalized boolean for show-filter (default true if not provided)
    $show_filter = array_key_exists( 'show-filter', $atts )
        ? $normalize_bool( $atts['show-filter'] )
        : true;

    $limit = (int) $atts['limit'];

    // Support single or comma-separated list of tag identifiers (IDs or names)
    $shortcode_tag_raw = isset($atts['tag-id']) ? (string) $atts['tag-id'] : '';
    // Normalize whitespace and split on commas
    $shortcode_tag_tokens = array_filter(
        array_map(
            'trim',
            explode(',', $shortcode_tag_raw)
        )
    );
    // For backward-compatibility, keep the first tag as the "default" tag
    $shortcode_tag_first = $shortcode_tag_tokens ? $shortcode_tag_tokens[0] : '';

    // Support optional exclusion list, also comma-separated, accepting IDs or names
    $shortcode_exclude_raw = isset($atts['exclude-tags']) ? (string) $atts['exclude-tags'] : '';
    $shortcode_exclude_tokens = array_filter(
        array_map(
            'trim',
            explode(',', $shortcode_exclude_raw)
        )
    );

    $shortcode_venue_id  = sanitize_text_field($atts['venue-id']);
    $include_virtual     = $normalize_bool( $atts['virtual'] );
    $view_mode           = in_array(strtolower($atts['view']), ['grid', 'list'], true) ? strtolower($atts['view']) : 'list';

    // --- Elementor-safe: unique IDs + data for JS initializer ---
    $instance_id       = 'evtlist_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $loader_el_id      = $instance_id . '_loader';
    $container_el_id   = $instance_id . '_container';

    // Film detail configuration (used by JS to build film detail URLs for event-linked films)
    $film_detail_page_id = (int) get_option( 'eventive_film_detail_page_id' );
    $site_url            = get_site_url();
    $film_detail_base    = $film_detail_page_id ? get_permalink( $film_detail_page_id ) : $site_url;

    // Pretty permalinks flag, used to decide between /slug/ and ?eventive_film=slug
    $permalink_structure = get_option( 'permalink_structure' );
    $film_detail_pretty  = ! empty( $permalink_structure );

    // Convert yes/no attributes into booleans and JS-safe strings
    // Short description: prefer short-event-description, fall back to legacy short-description
    $short_desc_raw         = $atts['short-event-description'] !== null
        ? $atts['short-event-description']
        : $atts['short-description'];
    $show_short_description = $normalize_bool( $short_desc_raw );

    // Full description: event-description controls the main HTML description
    $show_description  = $normalize_bool( $atts['event-description'] );

    // Poster flag (legacy, prefer image)
    $show_poster       = $normalize_bool( $atts['poster-image'] );

    // Determine image preference from shortcode attributes (new "image" param),
    // with backward-compatibility for legacy "poster-image" when no explicit image is set.
    $image_preference = isset($atts['image']) ? sanitize_text_field($atts['image']) : 'cover';
    if (!isset($atts['image']) && $normalize_bool($atts['poster-image'])) {
        $image_preference = 'poster';
    }

    $data_event_bucket = esc_js($your_eventive_event_bucket);
    $data_limit        = (int) $limit;
    // First tag acts as default for backwards compatibility
    $data_tag_default  = esc_js($shortcode_tag_first ?: '');
    // Full, comma-separated list of tags (IDs or names) for multi-tag filtering in JS
    $data_tags_list    = esc_js(implode(',', $shortcode_tag_tokens));
    // Full, comma-separated list of tags (IDs or names) to exclude in JS
    $data_exclude_tags = esc_js(implode(',', $shortcode_exclude_tokens));
    $data_venue_id     = esc_js($shortcode_venue_id ?: '');
    $data_show_short_desc    = $show_short_description ? 'true' : 'false';
    $data_show_desc    = $show_description ? 'true' : 'false';
    $data_show_poster  = $show_poster ? 'true' : 'false';
    $data_image_pref   = esc_js($image_preference);
    $data_virtual      = $include_virtual ? 'true' : 'false';
    $include_past      = $normalize_bool( $atts['include-past'] );
    $data_include_past = $include_past ? 'true' : 'false';
    $data_view_mode    = esc_js($view_mode);

    $show_undated = $normalize_bool( $atts['show-undated'] ) ? 'true' : 'false';

    // Optional date range for JS filtering (YYYY-MM-DD, inclusive)
    $start_date_raw  = isset($atts['start-date']) ? trim((string) $atts['start-date']) : '';
    $end_date_raw    = isset($atts['end-date'])   ? trim((string) $atts['end-date'])   : '';
    // Basic sanitization; JS will parse/validate the dates
    $data_start_date = esc_js( $start_date_raw );
    $data_end_date   = esc_js( $end_date_raw );

    // Canonical base URL without plugin params for reset/fallback
    $base_url   = get_permalink();
    $clear_keys = array('tag-id','tag','include-tags','exclude-tags','film-id','event-id','view','image','show-events','show-details','show-tags','year-round','search','q','page');
    $reset_url  = esc_url(remove_query_arg($clear_keys, $base_url));

ob_start(); // Start output buffering
    // Only render a placeholder wrapper if filter UI is enabled; otherwise JS will not build it
    if ($show_filter) {
        echo '<div class="eventive-events-tags-filter"></div>';
    }
?>
        <div id="<?php echo esc_attr($loader_el_id); ?>">Loading events...</div>
        <div id="<?php echo esc_attr($container_el_id); ?>" class="eventive-events-list"
             data-event-bucket="<?php echo esc_attr($data_event_bucket); ?>"
             data-limit="<?php echo esc_attr($data_limit); ?>"
             data-tag-default="<?php echo esc_attr($data_tag_default); ?>"
             data-tags-list="<?php echo esc_attr($data_tags_list); ?>"
             data-exclude-tags="<?php echo esc_attr($data_exclude_tags); ?>"
             data-venue-id="<?php echo esc_attr($data_venue_id); ?>"
             data-show-short-description="<?php echo esc_attr($data_show_short_desc); ?>"
             data-show-description="<?php echo esc_attr($data_show_desc); ?>"
             data-show-poster="<?php echo esc_attr($data_show_poster); ?>"
             data-image-preference="<?php echo esc_attr($data_image_pref); ?>"
             data-include-virtual="<?php echo esc_attr($data_virtual); ?>"
             data-include-past="<?php echo esc_attr($data_include_past); ?>"
             data-view-mode="<?php echo esc_attr($data_view_mode); ?>"
             data-show-undated="<?php echo esc_attr($show_undated); ?>"
             data-start-date="<?php echo esc_attr($data_start_date); ?>"
             data-end-date="<?php echo esc_attr($data_end_date); ?>"
             data-show-filter="<?php echo $show_filter ? 'true' : 'false'; ?>"
             data-reset-url="<?php echo esc_url( $reset_url ); ?>"
             data-film-detail-base="<?php echo esc_url( $film_detail_base ); ?>"
             data-film-detail-pretty="<?php echo $film_detail_pretty ? 'true' : 'false'; ?>"></div>
<?php
   // Ensure the Eventive loader handle exists before attaching our initializer
if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
    if ( function_exists('add_eventive_dynamic_scripts') ) {
        add_eventive_dynamic_scripts();
    }
}

// Enqueue the external initializer (depends on eventive-loader)
wp_enqueue_script(
    'eventive-events-list-init',
    plugin_dir_url( dirname(__FILE__) ) . 'js/eventive-events-list.js',
    array('eventive-loader'),
    '1.0.0',
    true
);

    return ob_get_clean(); // Return the buffered content
}
add_shortcode('eventive-events-list', 'eventive_schedule_list');