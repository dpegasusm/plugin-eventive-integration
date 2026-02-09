<?php
/**
 * Eventive Integration Plugin
 *
 * @package WordPress
 * @subpackage Eventive
 * @since 1.0.0
 */

/**
 * Plugin Name: Eventive Integration
 * Plugin URI: https://eventive.org/
 * Description: Seamlessly integrate Eventive's Event and Ticketing Services into your WordPress site. Includes dynamic event loaders, shortcode support, event bucket overrides, and Gutenberg blocks.
 * Version:           1.0.1
 * Requires at least: 6.7
 * Requires PHP:      7.4
 * Author:            David Marshall
 * Author URI:        https://github.com/dpegasusm
 * Text Domain:       eventive
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// register activation and deactivation hooks.
register_activation_hook( __FILE__, 'eventive_activate' );
register_deactivation_hook( __FILE__, 'eventive_deactivate' );

// Get the plugin data so we can use it here to define props.
$eventive_plugin_data = get_file_data(
	__FILE__,
	array(
		'Version' => 'Version',
	)
);

// Set us a definition so that we can load pdp from anywhere.
define( 'EVENTIVE_PLUGIN', plugin_dir_url( __FILE__ ) );
define( 'EVENTIVE_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'EVENTIVE_CURRENT_VERSION', ( $eventive_plugin_data && $eventive_plugin_data['Version'] ) ? $eventive_plugin_data['Version'] : '1.0.0' );

// Load the base class and its methods.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive.php';
$eventive = new Eventive();
$eventive->init();

// Load the settings pages and settings.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-settings.php';
$eventive_settings = new Eventive_Settings();
$eventive_settings->init();

// Load the API functionality.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-api.php';
$eventive_api = new Eventive_API();
$eventive_api->init();

// Load the event sync functionality.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-sync.php';
$eventive_sync = new Eventive_Sync();
$eventive_sync->init();

// Load the custom post type functionality.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-post-type-film.php';
$eventive_post_type = new Eventive_Post_Type_Film();
$eventive_post_type->init();

// Load the venues custom post type functionality.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-post-type-venues.php';
$eventive_post_type_venues = new Eventive_Post_Type_Venues();
$eventive_post_type_venues->init();

// Load the film tags taxonomy functionality.
require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-taxonomy-film-tags.php';
$eventive_taxonomy_film_tags = new Eventive_Taxonomy_Film_Tags();
$eventive_taxonomy_film_tags->init();

// Check for the API key before loading any functionalty that uses API functionality.
$eventive_api_key = get_option( 'eventive_public_key', '' );

// Only load the rest of the plugin if we have an API key.
if ( ! empty( $eventive_api_key ) ) {
	// Load the admin dashboard widget only in admin.
	if ( is_admin() ) {
		// Load the admin settings page.
		require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-dashboard.php';
		$eventive_dashboard = new Eventive_Dashboard();
		$eventive_dashboard->init();
	}

	// Load the front-end blocks functionality.
	require_once EVENTIVE_PLUGIN_PATH . 'includes/class-eventive-blocks.php';
	$eventive_blocks = new Eventive_Blocks();
	$eventive_blocks->init();
}

/**
 * Run on activate to setup the plugin.
 *
 * @since Eventive 1.0
 */
function eventive_activate() {
	// flush the rewrite rules in the plugin so that our new rules take effect.
	flush_rewrite_rules();

	// Add our custom post type caps to the administrator role.
	$role = get_role( 'administrator' );

	if ( $role ) {
		// Film capabilities.
		$role->add_cap( 'edit_film' );
		$role->add_cap( 'read_film' );
		$role->add_cap( 'delete_film' );
		$role->add_cap( 'edit_films' );
		$role->add_cap( 'edit_others_films' );
		$role->add_cap( 'publish_films' );
		$role->add_cap( 'read_private_films' );

		// Venue capabilities.
		$role->add_cap( 'edit_venue' );
		$role->add_cap( 'read_venue' );
		$role->add_cap( 'delete_venue' );
		$role->add_cap( 'edit_venues' );
		$role->add_cap( 'edit_others_venues' );
		$role->add_cap( 'publish_venues' );
		$role->add_cap( 'read_private_venues' );
	}
}

/**
 * Run on activate to setup the plugin
 *
 * @since Eventive 1.0
 */
function eventive_deactivate() {
	// flush the rewrite rules in the plugin so that our old rules are removed.
	flush_rewrite_rules();
}
