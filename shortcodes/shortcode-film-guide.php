<?php
/**
 * Plugin Shortcode: [eventive-film-guide]
 *
 * Description:
 * Outputs a responsive and theme-compatible list of films from an Eventive event bucket via API.
 * Supports optional filtering, image type switching, view mode toggling, and an interactive tag filter menu.
 * Fully compatible with WordPress themes and includes inline styling for maximum compatibility.
 *
 * Usage:
 * [eventive-film-guide]
 *
 * Optional Parameters:
 * - tag-name (string|csv): Filter results by one or more tag names or IDs (comma‑separated).
 * - exclude-tag (string|csv): Exclude films with any of these tag names or IDs (comma‑separated).
 * - film-id (string): Display only the film matching this ID.
 * - show-events (true|false): Whether to display film detail/showtime links (default: true).
 * - show-filter (yes|no): Include the [eventive-tags] shortcode filter above the list (default: no).
 * - image (poster|cover|still): Choose the image type to display (default: poster).
 * - view (grid|list): Display format of the film guide (default: grid).
 * - show-tags (yes|no): Show tags as filterable pills per film (default: no).
 * - show-details (true|false): Show or hide film metadata (director, runtime, etc.) and credit sections.
 * - year-round (true|false): If true, filters to only include current or upcoming films (uses marquee=true).
 * Example:
 * [eventive-film-guide tag-name="Documentary" show-events="true" show-filter="yes" image="cover" view="list" show-tags="yes"]
 */

function eventive_film_guide($atts) {
                
    // Retrieve options with fallback
    $eventive_admin_options_options = get_option('eventive_admin_options_option_name');
    $your_eventive_secret_key_2 = $eventive_admin_options_options['your_eventive_secret_key_2'] ?? '';
    $your_eventive_event_bucket_1 = $eventive_admin_options_options['your_eventive_event_bucket_1'] ?? '';
    $siteURL = get_site_url();

    $film_sync_enabled = get_option('eventive_enable_film_sync', '0') === '1';

    // Permalink and detail page logic
    $selectedPageId = get_option('eventive_film_detail_page_id');
    $filmDetailPage = $selectedPageId ? get_post($selectedPageId) : null;
   $permalink_structure = get_option('permalink_structure');
$pretty_permalinks = !empty($permalink_structure);
$filmDetailBaseURL = $selectedPageId ? get_permalink($selectedPageId) : $siteURL;

    if (empty($your_eventive_secret_key_2) || empty($your_eventive_event_bucket_1)) {
        return '<div class="catalog-error">Missing Eventive configuration. Please check your settings.</div>';
    }

    // Extract attributes and set defaults
    $atts = shortcode_atts(array(
        'tag-name'    => '',            // Filter by tag name(s) or id(s), comma-separated
        'exclude-tag' => '',            // Exclude by tag name(s) or id(s), comma-separated
        'film-id'     => '',            // Specific film ID
        'show-events' => 'true',        // Show details and showtimes link
        'show-filter' => 'false',       // Optional [eventive-tags] filter
        'image'       => 'poster',      // Choose between poster, cover, or still
        'view'        => 'grid',        // Display view mode: grid or list
        'show-tags'   => 'false',       // Show tags as filterable pills per film
        'show-description'  => 'false',       // Show or short_description
        'show-details'=> 'false',       // Show or hide film metadata
        'year-round'  => 'false',
        'search'      => 'false',        // Show a search box for title/credits filtering
        'show-view-switcher' => 'true', // Add this line
    ), $atts);

    $tag_name = esc_attr($atts['tag-name']);
    $film_id = esc_attr($atts['film-id']);
    $show_events = filter_var($atts['show-events'], FILTER_VALIDATE_BOOLEAN);
    $show_details = filter_var($atts['show-details'], FILTER_VALIDATE_BOOLEAN);
    $show_description = filter_var($atts['show-description'], FILTER_VALIDATE_BOOLEAN);
    $view = strtolower(trim($atts['view'])) === 'list' ? 'list' : 'grid';

    $show_filter = filter_var($atts['show-filter'], FILTER_VALIDATE_BOOLEAN);
    $show_tags = filter_var($atts['show-tags'], FILTER_VALIDATE_BOOLEAN);
    $year_round = filter_var($atts['year-round'], FILTER_VALIDATE_BOOLEAN);
    $show_search = filter_var($atts['search'], FILTER_VALIDATE_BOOLEAN);
    $show_view_switcher = filter_var($atts['show-view-switcher'], FILTER_VALIDATE_BOOLEAN);

    // Parse include/exclude tag lists (comma-separated names or IDs)
    $parse_csv = function($val) {
        if (!is_string($val) || $val === '') return array();
        $parts = array_map('trim', explode(',', $val));
        $parts = array_filter($parts, function($v){ return $v !== ''; });
        return array_values($parts);
    };
    $include_tags = $parse_csv($atts['tag-name']);
    $exclude_tags = $parse_csv($atts['exclude-tag']);

    // Image type logic
    $image_type_param = strtolower(trim($atts['image']));
    $valid_image_types = array('poster', 'cover', 'still');
    $imageType = in_array($image_type_param, $valid_image_types) ? $image_type_param . '_image' : 'poster_image';

    // --- Elementor-safe: instance IDs and JS-safe values ---
    $instance_id      = 'filmg_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $wrapper_id       = $instance_id . '_wrap';
    $grid_id          = $instance_id . '_grid';
    $list_id          = $instance_id . '_list';
    $search_id        = $instance_id . '_search';
    $view_id          = $instance_id . '_view';
    $image_id         = $instance_id . '_image';

    $data_bucket      = esc_js($your_eventive_event_bucket_1);
    $data_api_key     = esc_js($your_eventive_secret_key_2);
    $data_site        = esc_url($siteURL);
    $data_include     = wp_json_encode($include_tags);
    $data_exclude     = wp_json_encode($exclude_tags);
    $data_film_id     = esc_js($film_id);
    $data_image_type  = esc_js($imageType);
    $data_view        = esc_js($view);
    $data_show_events = $show_events ? 'true' : 'false';
    $data_show_details= $show_details ? 'true' : 'false';
    $data_show_description = $show_description ? 'true' : 'false';
    $data_show_tags   = $show_tags ? 'true' : 'false';
    $data_year_round  = $year_round ? 'true' : 'false';
    $data_pretty      = $pretty_permalinks ? 'true' : 'false';
    $data_detail_base = esc_js($filmDetailBaseURL);
    $data_sync        = $film_sync_enabled ? 'true' : 'false';
    $data_show_search = $show_search ? 'true' : 'false';
    $data_show_switch = $show_view_switcher ? 'true' : 'false';

    ob_start(); // Start output buffering
    ?>
    <section id="<?php echo esc_attr($wrapper_id); ?>" class="wp-block-eventive-film-guide" style="padding: 2rem 1rem;"
             data-bucket="<?php echo esc_attr($data_bucket); ?>"
             data-api-key="<?php echo esc_attr($data_api_key); ?>"
             data-site="<?php echo esc_attr($data_site); ?>"
             data-include-tags='<?php echo esc_attr($data_include); ?>'
             data-exclude-tags='<?php echo esc_attr($data_exclude); ?>'
             data-film-id="<?php echo esc_attr($data_film_id); ?>"
             data-image-type="<?php echo esc_attr($data_image_type); ?>"
             data-view="<?php echo esc_attr($data_view); ?>"
             data-show-events="<?php echo esc_attr($data_show_events); ?>"
             data-show-details="<?php echo esc_attr($data_show_details); ?>"
             data-show-description="<?php echo esc_attr($data_show_description); ?>"
             data-show-tags="<?php echo esc_attr($data_show_tags); ?>"
             data-year-round="<?php echo esc_attr($data_year_round); ?>"
             data-pretty="<?php echo esc_attr($data_pretty); ?>"
             data-detail-base="<?php echo esc_attr($data_detail_base); ?>"
             data-sync-enabled="<?php echo esc_attr($data_sync); ?>"
             data-show-search="<?php echo esc_attr($data_show_search); ?>"
             data-show-switchers="<?php echo esc_attr($data_show_switch); ?>"
    >
        <?php if ($show_filter || $show_search || $show_view_switcher) : ?>
    <div class="eventive-film-guide-header">
        <div class="eventive-film-guide-header-row">
            <?php if ($show_search) : ?>
            <div class="eventive-film-guide-search">
                <label for="<?php echo esc_attr($search_id); ?>" class="screen-reader-text">Search films</label>
                <input id="<?php echo esc_attr($search_id); ?>" type="search" placeholder="Search films (title, cast, crew)…" aria-label="Search films" />
            </div>
            <?php endif; ?>
            <?php if ($show_view_switcher) : ?>
            <div class="eventive-film-guide-controls">
                <label>
                    View:
                    <select id="<?php echo esc_attr($view_id); ?>">
                        <option value="grid" <?php echo $view === 'grid' ? 'selected' : ''; ?>>Grid</option>
                        <option value="list" <?php echo $view === 'list' ? 'selected' : ''; ?>>List</option>
                    </select>
                </label>
                <label>
                    Image:
                    <select id="<?php echo esc_attr($image_id); ?>">
                        <option value="poster_image" <?php echo $imageType === 'poster_image' ? 'selected' : ''; ?>>Poster</option>
                        <option value="cover_image" <?php echo $imageType === 'cover_image' ? 'selected' : ''; ?>>Cover</option>
                        <option value="still_image" <?php echo $imageType === 'still_image' ? 'selected' : ''; ?>>Still</option>
                    </select>
                </label>
            </div>
            <?php endif; ?>
        </div>
        <?php if ($show_filter) : ?>
        <div class="eventive-film-guide-tags-filter"></div>
        <?php endif; ?>
    </div>
<?php endif; ?>
        <div id="catalog-film-container-wrapper" class="catalog-film-container-wrapper">
            <div id="<?php echo esc_attr($grid_id); ?>" class="catalog-film-container grid" style="display: <?php echo $view === 'list' ? 'none' : 'grid'; ?>;"></div>
            <div id="<?php echo esc_attr($list_id); ?>" class="catalog-film-container list" style="display: <?php echo $view === 'list' ? 'block' : 'none'; ?>;"></div>
        </div>
    </section>
<?php

    // Ensure the Eventive loader handle exists (Classic/Blocks/Elementor safe)
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }

    // Enqueue external film guide script (depends on eventive-loader)
    wp_enqueue_script(
        'eventive-film-guide',
        plugins_url('../js/eventive-film-guide.js', __FILE__),
        array('eventive-loader'),
        '1.0.0',
        true
    );

    return ob_get_clean();
}
add_shortcode('eventive-film-guide', 'eventive_film_guide');