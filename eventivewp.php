<?php
/**
 * Plugin Name: EventiveWP
 * Plugin URI: https://eventive.org/
 * Description: Seamlessly integrate Eventive's Event and Ticketing Services into your WordPress site. Includes dynamic event loaders, shortcode support, event bucket overrides, and Gutenberg blocks.
 * Version: 2.0
 * Author: Christopher Jennings
 * Author URI: https://eventive.org/
 * Last Modified: October 31, 2025
 * GitHub Plugin URI: https://github.com/eventive-org/eventive-wordpress-plugin/releases
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

// Exit if accessed directly

defined('ABSPATH') || exit;


// ====================================================
// REGISTER GLOBAL EVENTIVE SETTINGS
// ====================================================
add_action('admin_init', function () {
    register_setting('eventive-film-sync', 'eventive_enable_film_sync');
    register_setting('eventive-film-sync', 'eventive_film_detail_page_id'); // ✅ Add this
});

// ====================================================
// INCLUDE CORE ADMIN CLASSES AND FUNCTIONS
// ====================================================
require_once plugin_dir_path(__FILE__) . 'admin/includes/class-eventive-options.php';
require_once plugin_dir_path(__FILE__) . 'admin/includes/class-eventive-dashboard.php';
require_once plugin_dir_path(__FILE__) . 'admin/includes/class-eventive-sync-films.php';
// ====================================================
// INCLUDE REST API ENDPOINTS
// =====================================================
require_once plugin_dir_path(__FILE__) . 'includes/rest_api.php';

// ====================================================
// INITIALIZE CLASSES
// ====================================================
if (is_admin()) {
    new Eventive_Options();
    new Eventive_Dashboard();
    new Eventive_Sync_Films();
}

// ====================================================
// FRONTEND STYLES (deduped, cache-busted, shortcode+block aware)
// ====================================================
if (!is_admin()) {
    add_action('wp_enqueue_scripts', function () {
        $options = get_option('eventive_admin_options_option_name', []);
        $color_mode = $options['eventive_color_mode'] ?? 'default';

        $style_base_dir = plugin_dir_path(__FILE__) . 'css/';
        $style_base_url = plugin_dir_url(__FILE__) . 'css/';

        $styles = [
            'dark'    => 'eventive-dark.css',
            'light'   => 'eventive-light.css',
            'default' => 'eventive-default.css',
        ];

        // Enqueue mode stylesheet with cache-busting version
        $style_to_enqueue = $styles[$color_mode] ?? $styles['default'];
        $mode_path = $style_base_dir . $style_to_enqueue;
        $mode_ver  = file_exists($mode_path) ? filemtime($mode_path) : '1.0.0';
        wp_enqueue_style('eventive-mode-style', $style_base_url . $style_to_enqueue, [], $mode_ver);

        // Determine exactly which Eventive features are present and load only their CSS
        $present = [];
        global $post;

        // Map shortcodes to CSS files (multi-file entries use arrays)
        $sc_to_css = [
            'eventive-login'            => ['eventive-login.css'],
            'eventive-account'          => [
                'eventive-account.css',
                'eventive-account-details.css',
                'eventive-account-passes.css',
                'eventive-account-tickets.css',
            ],
            'eventive-account-details'  => ['eventive-account-details.css'],
            'eventive-account-passes'   => ['eventive-account-passes.css'],
            'eventive-account-tickets'  => ['eventive-account-tickets.css'],
            'eventive-film-guide'       => ['eventive-film-guide.css'],
            'eventive-calendar'         => ['eventive-calendar.css'],
            'eventive-marquee'          => ['eventive-marquee-carousel.css'],
            'eventive-native-year-round'=> ['eventive-calendar.css'],
            'eventive-events'           => ['events-events.css'],
            'eventive-events-list'      => ['events-list.css'],
            'eventive-tags'             => ['eventive-tags.css'],
        ];

        // Check shortcodes on singular content
        if (is_singular() && isset($post->post_content)) {
            foreach ($sc_to_css as $sc => $_css) {
                if (has_shortcode($post->post_content, $sc)) { $present[$sc] = true; }
            }
        }

        // Also check for Eventive Gutenberg blocks when available
        if (function_exists('has_block') && isset($post)) {
            $block_to_css = [
                'eventive/film-guide'   => ['eventive-film-guide.css'],
                'eventive/events-list'  => ['events-list.css'],
                'eventive/calendar'     => ['eventive-calendar.css'],
                'eventive/marquee'      => ['eventive-marquee-carousel.css'],
                'eventive/account'      => [
                    'eventive-account-details.css',
                    'eventive-account-passes.css',
                    'eventive-account-tickets.css',
                ],
                'eventive/login'        => ['eventive-login.css'],
                'eventive/tags'         => ['eventive-tags.css'],
            ];
            foreach ($block_to_css as $block => $_css) {
                if (has_block($block, $post)) { $present[$block] = true; }
            }
        }

        if (!empty($present)) {
            // Helper to enqueue with filemtime version and unique handles
            $enqueue = function ($handle, $file) use ($style_base_dir, $style_base_url) {
                $path = $style_base_dir . $file;
                if (!file_exists($path)) { return; }
                $ver  = filemtime($path);
                wp_enqueue_style($handle, $style_base_url . $file, ['eventive-mode-style'], $ver);
            };

            // Build a unique set of CSS files to load, supporting array values
            $css_needed = [];
            $add_css = function ($entry) use (&$css_needed) {
                if (is_array($entry)) {
                    foreach ($entry as $file) { $css_needed[$file] = true; }
                } elseif (is_string($entry) && strlen($entry)) {
                    $css_needed[$entry] = true;
                }
            };

            foreach ($present as $key => $true) {
                if (isset($sc_to_css[$key])) { $add_css($sc_to_css[$key]); }
            }
            if (isset($block_to_css)) {
                foreach ($present as $key => $true) {
                    if (isset($block_to_css[$key])) { $add_css($block_to_css[$key]); }
                }
            }

            foreach (array_keys($css_needed) as $css_file) {
                $handle = 'eventive-' . preg_replace('/\.css$/', '', basename($css_file)) . '-style';
                $enqueue($handle, $css_file);
            }
        }
    });
}

// ====================================================
// BODY CLASS FILTER
// ====================================================
add_filter('body_class', function ($classes) {
    $options = get_option('eventive_admin_options_option_name', []);
    $color_mode = $options['eventive_color_mode'] ?? 'default';

    // Remove any existing eventive classes to avoid duplicates
    $classes = array_diff($classes, ['eventive-dark-mode', 'eventive-light-mode', 'eventive-default-mode']);
    $classes[] = "eventive-{$color_mode}-mode";

    return $classes;
});

// ====================================================
// DYNAMIC SCRIPT INCLUSION
// ====================================================
function add_eventive_dynamic_scripts() {
    // Fetch Eventive options
    $options     = get_option('eventive_admin_options_option_name');
    $secret_key  = $options['your_eventive_secret_key_2'] ?? '';

    // Support per-page Eventive loader override
    $default_bucket  = $options['your_eventive_event_bucket_1'] ?? '';
    $override_bucket = is_singular() ? get_post_meta(get_the_ID(), '_eventive_loader_override', true) : '';
    $event_bucket    = $override_bucket ?: $default_bucket;

    if (empty($secret_key) || empty($event_bucket)) {
        return; // required config missing
    }

    // Cache the event buckets response to avoid repeat API calls per request
    $cache_key = 'eventive_buckets_' . md5($secret_key);
    $data = get_transient($cache_key);

    if (false === $data) {
        $response = wp_remote_get('https://api.eventive.org/event_buckets', [
            'headers' => ['x-api-key' => $secret_key],
            'timeout' => 15,
        ]);
        if (is_wp_error($response)) {
            error_log('Eventive API error: ' . $response->get_error_message());
            return;
        }
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('Eventive API response parsing error.');
            return;
        }
        // cache for 10 minutes
        set_transient($cache_key, $data, 10 * MINUTE_IN_SECONDS);
    }

    if (empty($data['event_buckets'])) {
        error_log('Eventive: no event buckets found.');
        return;
    }

    // Find the matching event bucket
    $matching_bucket = array_filter($data['event_buckets'], fn($bucket) => ($bucket['id'] ?? '') === $event_bucket);
    if (empty($matching_bucket)) {
        error_log("No matching Eventive bucket found for ID: {$event_bucket}");
        return;
    }

    $event_bucket_details = reset($matching_bucket);
    $root_url = $event_bucket_details['urls']['root'] ?? '';
    if (empty($root_url)) {
        error_log('Eventive bucket root URL is missing.');
        return;
    }

    // Normalize
    $root_url  = rtrim($root_url, '/') . '/';
    $loader_url = $root_url . 'loader.js';

    // Enqueue Stripe and Eventive loader via WP APIs (Elementor-safe)
    if (!wp_script_is('stripe-v3', 'registered')) {
        wp_register_script('stripe-v3', 'https://js.stripe.com/v3/', [], null, true);
    }
    wp_enqueue_script('stripe-v3');

    if (!wp_script_is('eventive-loader', 'registered')) {
        wp_register_script('eventive-loader', $loader_url, [], null, true);
        // Defer if supported (WP 6.3+)
        if (function_exists('wp_script_add_data')) {
            wp_script_add_data('eventive-loader', 'strategy', 'defer');
        }
    }
    wp_enqueue_script('eventive-loader');

    // Inline bootstrap for guarded rebuilds that play nice with Elementor
    $inline = <<<'JS'
(function(){
  if (!window.__EventiveEE) window.__EventiveEE = {};
  if (window.__EventiveEE._inlineInjected) return; // ensure we only inject once per page
  window.__EventiveEE._inlineInjected = true;

  function runRebuildOnce(){
    if (!window.Eventive) return;
    if (window.__EventiveEE._rebuilt) return;
    try { window.Eventive.rebuild(); } catch (e) {}
    window.__EventiveEE._rebuilt = true;
  }

  // DOM ready path
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(runRebuildOnce, 300); }, { once:true });
  } else {
    setTimeout(runRebuildOnce, 300);
  }

  // Elementor: re-trigger on widget renders and popups, but keep the guard
  if (window.jQuery && window.elementorFrontend) {
    jQuery(window).on('elementor/frontend/init', function(){
      try {
        elementorFrontend.hooks.addAction('frontend/element_ready/global', function(){ setTimeout(runRebuildOnce, 0); });
        jQuery(document).on('elementor/popup/show', function(){ setTimeout(runRebuildOnce, 0); });
      } catch(e) {}
    });
  }
})();
JS;
    wp_add_inline_script('eventive-loader', $inline, 'after');
}

add_action('enqueue_block_editor_assets', 'add_eventive_dynamic_scripts');
add_action('wp_enqueue_scripts', 'add_eventive_dynamic_scripts'); // was wp_footer

// ====================================================
// SHORTCODES INCLUSION
// ====================================================
$shortcodes_folder = plugin_dir_path(__FILE__) . 'shortcodes/';
$css_url = plugin_dir_url(__FILE__) . 'css/';

foreach (glob($shortcodes_folder . '*.php') as $file) {
    include_once $file;

    // Register a matching CSS file for later conditional enqueue
    $basename = basename($file, '.php');
    $css_path = plugin_dir_path(__FILE__) . "css/{$basename}.css";
    if (file_exists($css_path)) {
        $ver = filemtime($css_path);
        wp_register_style(
            "eventive-{$basename}-style",
            $css_url . "{$basename}.css",
            ['eventive-mode-style'],
            $ver
        );
    }
}

// ====================================================
// REGISTER GUTENBERG BLOCKS
// ====================================================
if (!function_exists('eventive_register_blocks')) {
    function eventive_register_blocks() {
        static $blocks_registered = false;
        if ($blocks_registered) {
            return;
        }
        $blocks_registered = true;

        $blocks_directory = plugin_dir_path(__FILE__) . 'admin/blocks/';
        $block_folders = glob($blocks_directory . '*/');
        if (empty($block_folders)) {
            return;
        }

        foreach ($block_folders as $block_folder) {
            $block_slug = basename($block_folder);

            $script_path = $block_folder . 'index.js';
            $style_path = $block_folder . 'style.css';
            $editor_style_path = $block_folder . 'editor.css';

            if (!file_exists($script_path)) {
                continue;
            }

            wp_register_script(
                "eventive-{$block_slug}-block",
                plugin_dir_url(__FILE__) . "admin/blocks/{$block_slug}/index.js",
                ['wp-blocks', 'wp-editor', 'wp-components', 'wp-element'],
                '1.0.0',
                true
            );

            if (file_exists($style_path)) {
                wp_register_style(
                    "eventive-{$block_slug}-style",
                    plugin_dir_url(__FILE__) . "admin/blocks/{$block_slug}/style.css",
                    [],
                    '1.0.0'
                );
            }

            if (file_exists($editor_style_path)) {
                wp_register_style(
                    "eventive-{$block_slug}-editor-style",
                    plugin_dir_url(__FILE__) . "admin/blocks/{$block_slug}/editor.css",
                    [],
                    '1.0.0'
                );
            }

            register_block_type("eventive/{$block_slug}", [
                'editor_script' => "eventive-{$block_slug}-block",
                'style'         => file_exists($style_path) ? "eventive-{$block_slug}-style" : '',
                'editor_style'  => file_exists($editor_style_path) ? "eventive-{$block_slug}-editor-style" : '',
                'category'      => 'eventive-blocks',
            ]);
        }
    }

    add_action('init', 'eventive_register_blocks');
}

// ====================================================
// LOCALIZE API KEY AND EVENT BUCKET
// ====================================================
add_action('enqueue_block_editor_assets', function () {
    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $secret_key  = $eventive_admin_options['your_eventive_secret_key_2'] ?? '';
    $event_bucket = $eventive_admin_options['your_eventive_event_bucket_1'] ?? '';

    // Ensure loader is registered so we can localize it
    add_eventive_dynamic_scripts();

    if (wp_script_is('eventive-loader', 'registered') || wp_script_is('eventive-loader', 'enqueued')) {
        wp_localize_script('eventive-loader', 'EventiveBlockData', [
            'apiKey'      => $secret_key,
            'eventBucket' => $event_bucket,
        ]);
    }
});

// ====================================================
// REGISTER BLOCK CATEGORY
// ====================================================
if (!function_exists('eventive_register_block_category')) {
    function eventive_register_block_category($categories) {
        return array_merge(
            $categories,
            [
                [
                    'slug'  => 'eventive-blocks',
                    'title' => __('Eventive Blocks', 'eventive'),
                ],
            ]
        );
    }
    add_filter('block_categories_all', 'eventive_register_block_category', 10, 2);
}


// ====================================================
// META BOX: PER-PAGE EVENTIVE LOADER OVERRIDE
// ====================================================
// Enqueue admin styles for meta boxes
add_action('admin_enqueue_scripts', function ($hook) {
    if (in_array($hook, ['post.php', 'post-new.php'])) {
        wp_enqueue_style(
            'eventive-admin-style',
            plugin_dir_url(__FILE__) . 'admin/css/eventive-admin.css',
            [],
            '1.0.0'
        );
    }
});

// Add meta box for Eventive loader override
add_action('add_meta_boxes', function () {
    add_meta_box(
        'eventive_loader_override',
        'Event Bucket',
        'render_eventive_loader_override_box',
        ['page', 'post'],
        'side'
    );
});

// Render the meta box dropdown
function render_eventive_loader_override_box($post) {
    $selected_bucket = get_post_meta($post->ID, '_eventive_loader_override', true);
    if (!function_exists('get_eventive_buckets')) {
        echo '<p>Eventive buckets not available.</p>';
        return;
    }
    $buckets = get_eventive_buckets(); // Assume this function exists and returns id => name array

    echo '<label for="eventive_loader_override">Select Event Bucket:</label>';
    echo '<select name="eventive_loader_override" id="eventive_loader_override">';
    echo '<option value="">Default Loader</option>';
    foreach ($buckets as $id => $name) {
        $selected = selected($selected_bucket, $id, false);
        echo "<option value='{$id}' {$selected}>{$name}</option>";
    }
    echo '</select>';
}

// Save the selected override on post save
add_action('save_post', function ($post_id) {
    if (array_key_exists('eventive_loader_override', $_POST)) {
        update_post_meta($post_id, '_eventive_loader_override', sanitize_text_field($_POST['eventive_loader_override']));
    }
});

/**
 * Retrieve Eventive event buckets as an associative array of id => name.
 *
 * @return array
 */
function get_eventive_buckets() {
    $options    = get_option('eventive_admin_options_option_name');
    $secret_key = $options['your_eventive_secret_key_2'] ?? '';
    if (empty($secret_key)) {
        return [];
    }

    $cache_key = 'eventive_buckets_' . md5($secret_key);
    $data = get_transient($cache_key);

    if (false === $data) {
        $response = wp_remote_get('https://api.eventive.org/event_buckets', [
            'headers' => ['x-api-key' => $secret_key],
            'timeout' => 15,
        ]);
        if (is_wp_error($response)) {
            return [];
        }
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE || empty($data['event_buckets'])) {
            return [];
        }
        set_transient($cache_key, $data, 10 * MINUTE_IN_SECONDS);
    }

    $buckets = [];
    foreach ($data['event_buckets'] as $bucket) {
        if (isset($bucket['id'], $bucket['name'])) {
            $buckets[$bucket['id']] = $bucket['name'];
        }
    }

    return $buckets;
}

