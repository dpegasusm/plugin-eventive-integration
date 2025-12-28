<?php
/**
 * Eventive Plugin
 *
 * @package WordPress
 * @subpackage Eventive
 * @since 1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register eventive blocks.
 */
class Eventive_Blocks {

	/**
	 * Init callback for register.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Register the CPT.
		add_action( 'init', array( $this, 'eventive_blocks_init' ) );

		// Register these Post Meta items to be used on the page.
		add_action( 'init', array( $this, 'eventive_site_register_postmeta' ) );

		// Add the eventive category to the block editor.
		add_filter( 'block_categories_all', array( $this, 'eventive_block_categories' ), 10, 2 );

		// Enqueue the block editor to handle these.
		add_action( 'enqueue_block_editor_assets', array( $this, 'eventive_site_enqueue_block_editor_assets' ) );

		// Localize view scripts for frontend blocks.
		add_action( 'wp_enqueue_scripts', array( $this, 'localize_block_view_scripts' ) );
	}

	/**
	 * Registers the block using the metadata loaded from the `block.json` file.
	 * Behind the scenes, it registers also all assets so they can be enqueued
	 * through the block editor in the corresponding context.
	 *
	 * @see https://developer.wordpress.org/reference/functions/register_block_type/
	 *
	 * @return void
	 */
	public function eventive_blocks_init() {
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/account/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/account-details/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/calendar/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/carousel/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/eventive-account-passes/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/eventive-account-tickets/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/eventive-cart/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/eventive-login/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/eventive-native-year-round/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/events/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/events-list/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/events-week/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/film-details/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/film-guide/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/fundraiser/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/marquee/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/single-film/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/tags/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/venues/' );
	}

	/**
	 * Registers a custom block category for eventive blocks.
	 *
	 * @param array   $categories Array of block categories.
	 * @param WP_Post $post       The current post.
	 * @return array  Modified array of block categories.
	 */
	public function eventive_block_categories( $categories, $post ) { // phpcs:ignore
		// Check if our eventive category already exists.
		$eventive_category = array_filter(
			$categories,
			function ( $cat ) {
				return ( 'eventive' === $cat['slug'] );
			}
		);

		if ( empty( $eventive_category ) ) {
			$categories[] = array(
				'slug'  => 'eventive',
				'title' => __( 'Eventive', 'eventive' ),
				'icon'  => 'tickets-alt',
			);
		}
		return $categories;
	}

	/**
	 * Register PostMeta for the block editor.
	 *
	 * @return void
	 */
	public function eventive_site_register_postmeta() {
		// Page Header PostMeta.
		register_post_meta(
			'page',
			'eventive_hide_featured_image',
			array(
				'show_in_rest'      => true,
				'single'            => true,
				'type'              => 'boolean',
				'sanitize_callback' => 'absint',
				'auth_callback'     => function () {
					return current_user_can( 'edit_pages' );
				},
			)
		);

		register_post_meta(
			'page',
			'eventive_hide_page_title',
			array(
				'show_in_rest'      => true,
				'single'            => true,
				'type'              => 'boolean',
				'sanitize_callback' => 'absint',
				'auth_callback'     => function () {
					return current_user_can( 'edit_pages' );
				},
			)
		);

		register_post_meta(
			'page',
			'eventive_site_header',
			array(
				'show_in_rest'      => true,
				'single'            => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () {
					return current_user_can( 'edit_pages' );
				},
			)
		);
	}

	/**
	 * Localize view scripts for blocks with frontend JavaScript.
	 *
	 * @return void
	 */
	public function localize_block_view_scripts() {
		// Global the API class.
		global $eventive_api;

		// Get the event bucket from options.
		$api_base      = $eventive_api->get_api_base();
		$api_key	   = $eventive_api->get_api_key();
		$event_bucket  = $eventive_api->get_default_bucket_id();
		$api_endpoints = $eventive_api->get_api_endpoints();

		// Prepare data to pass to view scripts.
		$script_data = array(
			'apiBase'       => $api_base,
			'apiKey'        => $api_key,
			'apiEndpoints'  => $api_endpoints,
			'defaultBucket' => $event_bucket,
			'eventNonce'    => wp_create_nonce( 'eventive_api_nonce' ),
		);

		// List of blocks with view scripts.
		$blocks_with_views = array(
			'eventive-eventive-account-view-script',
			'eventive-eventive-account-details-view-script',
			'eventive-eventive-calendar-view-script',
			'eventive-eventive-carousel-view-script',
			'eventive-eventive-eventive-account-passes-view-script',
			'eventive-eventive-eventive-account-tickets-view-script',
			'eventive-eventive-eventive-cart-view-script',
			'eventive-eventive-eventive-login-view-script',
			'eventive-eventive-eventive-native-year-round-view-script',
			'eventive-eventive-events-view-script',
			'eventive-eventive-events-list-view-script',
			'eventive-eventive-events-week-view-script',
			'eventive-eventive-film-details-view-script',
			'eventive-eventive-film-guide-view-script',
			'eventive-eventive-fundraiser-view-script',
			'eventive-eventive-marquee-view-script',
			'eventive-eventive-single-film-view-script',
			'eventive-eventive-tags-view-script',
			'eventive-eventive-venues-view-script',
		);

		// Localize each view script.
		foreach ( $blocks_with_views as $script_handle ) {
			if ( wp_script_is( $script_handle, 'registered' ) ) {
				// Add the WP REST API script as a dependency.
				wp_enqueue_script( 'wp-api' );

				wp_localize_script(
					$script_handle,
					'EventiveData',
					$script_data
				);
			}
		}
	}
}
