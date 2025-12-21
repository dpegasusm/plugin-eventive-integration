<?php
/**
 * Shortcode: [eventive-tags]
 * 
 * Description:
 * This shortcode displays a dynamic list of Eventive event tags as stylized pills or a dropdown menu.
 * Tags are fetched from the Eventive API for the configured event bucket.
 * Each tag is styled with its configured background color, and the text color
 * is automatically adjusted for contrast based on brightness.
 * 
 * Features:
 * - API integration to fetch tags from Eventive.
 * - Dynamic styling with color contrast detection.
 * - "Active" styling based on URL tag-id match.
 * - Supports display as pills (default) or dropdown menu.
 * - Each tag links to a filtered schedule page with the corresponding tag ID.
 * - Custom CSS is enqueued to style the tags.
 * 
 * Parameters:
 * - destination: (string) URL to link the tags to. Defaults to current page URL.
 * - view: (string) 'list' (default) for pill layout, or 'dropdown' for select menu layout.
 * 
 * Usage:
 * Place [eventive-tags] in any post, page, or widget to show the tag list.
 * Example: [eventive-tags view="dropdown" destination="/schedule"]
 * 
 * Requirements:
 * Ensure your Eventive API Key and Event Bucket ID are configured in the plugin settings.
 */
// Enqueue eventive-tags.css only when the shortcode is used
function eventive_tags_enqueue_styles() {
    wp_enqueue_style(
        'eventive-tags-style',
        plugin_dir_url( dirname(__FILE__) ) . 'css/eventive-tags.css',
        array(),
        '1.0.0'
    );
}
add_action('wp_enqueue_scripts', 'eventive_tags_enqueue_styles');

function eventive_get_text_color($bgColor) {
    $hex = str_replace('#', '', $bgColor);
    if (strlen($hex) === 6) {
        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));
        $brightness = ($r * 299 + $g * 587 + $b * 114) / 1000;
        return ($brightness > 150) ? '#000000' : '#ffffff';
    }
    return '#000000';
}

function eventive_normalize_tag_name($s) {
    $s = strtolower($s);
    $s = str_replace('&', ' and ', $s);
    // remove diacritics if possible
    if (function_exists('iconv')) {
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    }
    $s = preg_replace('/[^a-z0-9]+/u', ' ', $s);
    $s = trim(preg_replace('/\s+/', ' ', $s));
    return $s;
}

function eventive_build_exclude_sets($raw) {
    $ids = [];
    $names = [];
    $slugs = [];
    if (!is_string($raw) || $raw === '') return [$ids, $names, $slugs];
    $parts = array_map('trim', explode(',', $raw));
    foreach ($parts as $p) {
        if ($p === '') continue;
        $ids[$p] = true; // keep raw id candidate
        $lname = strtolower($p);
        $names[$lname] = true;
        $slugs[eventive_normalize_tag_name($p)] = true;
    }
    return [$ids, $names, $slugs];
}

function eventive_http_get_json($url, $api_key) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/json',
        'x-api-key: ' . $api_key,
    ));
    $out = curl_exec($ch);
    if (curl_errno($ch)) {
        curl_close($ch);
        return null;
    }
    curl_close($ch);
    $json = json_decode($out, true);
    if (json_last_error() !== JSON_ERROR_NONE) return null;
    return $json;
}

function eventive_collect_tag_ids($data) {
    // Traverse nested arrays/objects to collect tag ids from any 'tags' arrays
    $ids = [];
    $stack = [$data];
    while (!empty($stack)) {
        $node = array_pop($stack);
        if (is_array($node)) {
            // If associative array with 'tags'
            if (isset($node['tags']) && is_array($node['tags'])) {
                foreach ($node['tags'] as $t) {
                    if (is_array($t) && isset($t['id'])) {
                        $ids[(string)$t['id']] = true;
                    }
                }
            }
            foreach ($node as $v) {
                if (is_array($v)) $stack[] = $v;
            }
        }
    }
    return $ids;
}

function eventive_tags($atts) {
    $eventive_admin_options_options = get_option('eventive_admin_options_option_name');
    $your_eventive_secret_key_2 = $eventive_admin_options_options['your_eventive_secret_key_2']; // Your Eventive Secret API Key
    $your_eventive_event_bucket_1 = $eventive_admin_options_options['your_eventive_event_bucket_1']; // Your Eventive Event Bucket

    $atts = shortcode_atts(array(
        'destination' => '',
        'view' => 'list',
        'exclude-tag' => '', // comma-separated list of tag IDs or names to hide
        'display' => 'both',  // 'both' (default), 'films', or 'events'
        'nojs' => 'false',     // when true, output HTML-only (no JS listeners)
        'hide-empty' => 'false', // opt-in: hide tags with no upcoming items
        'class' => '',          // extra classes for wrapper
        'style' => '',          // inline style for wrapper
        'bucket' => '',         // optional override for event bucket
    ), $atts);

    $nojs = filter_var($atts['nojs'], FILTER_VALIDATE_BOOLEAN);
    $container_id = 'evt_tags_' . preg_replace('/[^a-z0-9_\-]/i', '', uniqid('i', true));
    $select_id    = $container_id . '_select';

    $bucket = !empty($atts['bucket']) ? $atts['bucket'] : $your_eventive_event_bucket_1;

    // Canonical base URL (strip plugin params)
    $base_url   = !empty($atts['destination']) ? esc_url($atts['destination']) : get_permalink();
    $clear_keys = array('tag-id','tag','include-tags','exclude-tags','film-id','event-id','view','image','show-events','show-details','show-tags','year-round','search','q','page');
    $reset_url  = esc_url(remove_query_arg($clear_keys, $base_url));

    $siteURL = !empty($atts['destination']) ? esc_url($atts['destination']) : get_permalink();

    $display = strtolower(trim($atts['display']));
    if (!in_array($display, array('both','films','events'), true)) {
        $display = 'both';
    }

    list($exclude_ids_set, $exclude_names_set, $exclude_slugs_set) = eventive_build_exclude_sets($atts['exclude-tag']);

    // Capture selected tag
    $selectedTagId = isset($_GET['tag-id']) ? sanitize_text_field($_GET['tag-id']) : '';

    $hide_empty = filter_var($atts['hide-empty'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';

    ob_start(); // Start output buffering
    ?>

    <div id="<?php echo esc_attr($container_id); ?>"
         class="tag-container eventive-tags <?php echo esc_attr($atts['class']); ?>"
         style="<?php echo esc_attr($atts['style']); ?>"
         data-hide-empty="<?php echo esc_attr($hide_empty); ?>"
         data-reset-url="<?php echo $reset_url; ?>"
         <?php if (!empty($bucket)) : ?> data-bucket="<?php echo esc_attr($bucket); ?>"<?php endif; ?>
    >
        <?php
        // Set URL for API call
        $url = "https://api.eventive.org/event_buckets/" . $bucket . "/tags";
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        $headers = array(
            "Content-Type: application/json",
            "x-api-key: $your_eventive_secret_key_2",
        );
        curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
        $resp = curl_exec($curl);

        if (curl_errno($curl)) {
            echo '<p>Error fetching tags: ' . curl_error($curl) . '</p>';
        } else {
            $resp = json_decode($resp, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                echo '<p>Error decoding JSON response: ' . json_last_error_msg() . '</p>';
            } else {
                $allowed_tag_ids = null; // null means no restriction beyond exclusions
                if ($display === 'films') {
                    $films_url = "https://api.eventive.org/event_buckets/" . $bucket . "/films";
                    $films_json = eventive_http_get_json($films_url, $your_eventive_secret_key_2);
                    if (is_array($films_json)) {
                        $allowed_tag_ids = eventive_collect_tag_ids($films_json);
                    }
                } elseif ($display === 'events') {
                    $events_url = "https://api.eventive.org/event_buckets/" . $bucket . "/events";
                    $events_json = eventive_http_get_json($events_url, $your_eventive_secret_key_2);
                    if (is_array($events_json)) {
                        $allowed_tag_ids = eventive_collect_tag_ids($events_json);
                    }
                }
                if ($atts['view'] === 'dropdown') {
                    echo "<span>Filter by tag</span><br /><select id='" . esc_attr($select_id) . "' class='eventive-tag-select'>";
                    // All option
                    $selected = ($selectedTagId === '') ? 'selected' : '';
                    echo "<option data-tag-id='' $selected>All</option>";
                    foreach ($resp as $event) {
                        foreach ($event as $value) {
                            $color = htmlspecialchars($value['color'], ENT_QUOTES, 'UTF-8');
                            $id = htmlspecialchars($value['id'], ENT_QUOTES, 'UTF-8');
                            $name = htmlspecialchars($value['name'], ENT_QUOTES, 'UTF-8');
                            $rawId = $value['id'];
                            $rawName = $value['name'];
                            $norm = eventive_normalize_tag_name($rawName);
                            if (isset($exclude_ids_set[$rawId]) || isset($exclude_names_set[strtolower($rawName)]) || isset($exclude_slugs_set[$norm])) {
                                continue; // skip excluded tag
                            }
                            if (is_array($allowed_tag_ids) && !isset($allowed_tag_ids[$rawId])) {
                                continue; // skip tags not used in the selected scope
                            }
                            $selected = ($id === $selectedTagId) ? 'selected' : '';
                            echo "<option data-tag-id='$id' $selected>$name</option>";
                        }
                    }
                    echo "</select>";
                } else {
                    // Pills: render an "All" pill first; when selectedTagId is empty it's active
                    $allActiveClass = ($selectedTagId === '') ? 'is-active' : '';
                    echo "<span class='tag-label $allActiveClass' style='background-color: #e0e0e0; color: #000000;'><a href='" . $reset_url . "' class='external-tag-filter' data-tag-id='' style='color: #000000;'>All</a></span>";
                    foreach ($resp as $event) {
                        foreach ($event as $value) {
                            $color = htmlspecialchars($value['color'], ENT_QUOTES, 'UTF-8');
                            $id = htmlspecialchars($value['id'], ENT_QUOTES, 'UTF-8');
                            $name = htmlspecialchars($value['name'], ENT_QUOTES, 'UTF-8');
                            $rawId = $value['id'];
                            $rawName = $value['name'];
                            $norm = eventive_normalize_tag_name($rawName);
                            if (isset($exclude_ids_set[$rawId]) || isset($exclude_names_set[strtolower($rawName)]) || isset($exclude_slugs_set[$norm])) {
                                continue; // skip excluded tag
                            }
                            if (is_array($allowed_tag_ids) && !isset($allowed_tag_ids[$rawId])) {
                                continue; // skip tags not used in the selected scope
                            }
                            $textColor = eventive_get_text_color($color);
                            $activeClass = ($id === $selectedTagId) ? 'is-active' : '';
                            $href = esc_url(add_query_arg('tag-id', $id, $reset_url));
                            echo "<span class='tag-label $activeClass' style='background-color: $color; color: $textColor;'><a href='" . $href . "' class='external-tag-filter' data-tag-id='" . esc_attr($id) . "' style='color: $textColor;'>$name</a></span>";
                        }
                    }
                }
            }
        }
        curl_close($curl);
        ?>
    </div>
    <?php
    // Enqueue external JS (Elementor-safe); ensure Eventive loader is present first
    if ( ! wp_script_is('eventive-loader', 'registered') && ! wp_script_is('eventive-loader', 'enqueued') ) {
        if ( function_exists('add_eventive_dynamic_scripts') ) {
            add_eventive_dynamic_scripts();
        }
    }
    wp_enqueue_script(
        'eventive-tags',
        plugins_url('../js/eventive-tags.js', __FILE__),
        array('eventive-loader'),
        '1.0.0',
        true
    );

    return ob_get_clean(); // Return the buffered content
}

add_shortcode('eventive-tags', 'eventive_tags');