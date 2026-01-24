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

		// Localize view scripts for frontend blocks.
		add_action( 'wp_enqueue_scripts', array( $this, 'localize_block_view_scripts' ), 999, 0 );

		// Localize editor scripts for admin blocks.
		add_action( 'enqueue_block_editor_assets', array( $this, 'localize_block_editor_scripts' ) );
	}

	/**
	 * Get the current post type reliably in admin context.
	 *
	 * @return string|false The post type or false if not found.
	 */
	private function get_current_post_type() {
		// Try get_post_type() first (works on frontend and later hooks).
		$post_type = get_post_type();
		if ( $post_type ) {
			return $post_type;
		}

		// In admin, check for post parameter in query string.
		if ( is_admin() ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( isset( $_GET['post'] ) ) {
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended
				$post_id = intval( $_GET['post'] );
				$post_type = get_post_type( $post_id );
				if ( $post_type ) {
					return $post_type;
				}
			}

			// Check for post_type parameter (for new posts).
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( isset( $_GET['post_type'] ) ) {
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended
				return sanitize_key( $_GET['post_type'] );
			}
		}

		return false;
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
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/account-passes/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/account-tickets/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/login/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/native-year-round/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/events/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/events-list/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/events-week/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/film-details/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/film-guide/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/fundraiser/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/marquee/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/single-film/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/venues/' );

		// The following Blocks require a post film type ID.
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/film-showtimes/' );
		register_block_type( EVENTIVE_PLUGIN_PATH . '/build/film-meta/' );
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

		// load us a new category for film blocks if on an eventive film post type.
		// Get the Eventive film post types.
		$eventive_film_post_types = Eventive::get_eventive_film_post_types();

		// register the folowing blocks to be used on eventive film post types.
		$current_post_type = $this->get_current_post_type();
		if ( $current_post_type && in_array( $current_post_type, $eventive_film_post_types, true ) ) {
			$film_category = array_filter(
				$categories,
				function ( $cat ) {
					return ( 'eventive-films' === $cat['slug'] );
				}
			);

			if ( empty( $film_category ) ) {
				$categories[] = array(
					'slug'  => 'eventive-films',
					'title' => __( 'Eventive Film Data', 'eventive' ),
					'icon'  => 'video-alt3',
				);
			}
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

		// Prepare data to pass to view scripts.
		$localization = $eventive_api->get_api_localization_data();
		
		// Get the Eventive film post types.
		$eventive_film_post_types = Eventive::get_eventive_film_post_types();

		// Localize the Post ID into our eventive post types.
		if ( in_array( get_post_type( get_the_ID() ), $eventive_film_post_types, true ) && is_singular( $eventive_film_post_types ) ) {
			// Add current post ID to localization data.
			$localization['postId'] = get_the_ID();
		} else {
			$localization['postId'] = '';
		}

		// List of blocks with view scripts.
		$blocks_with_views = array(
			'eventive-account-view-script',
			'eventive-account-details-view-script',
			'eventive-calendar-view-script',
			'eventive-carousel-view-script',
			'eventive-account-passes-view-script',
			'eventive-account-tickets-view-script',
			'eventive-login-view-script',
			'eventive-native-year-round-view-script',
			'eventive-events-view-script',
			'eventive-events-list-view-script',
			'eventive-events-week-view-script',
			'eventive-film-details-view-script',
			'eventive-film-guide-view-script',
			'eventive-film-meta-view-script',
			'eventive-film-showtimes-view-script',
			'eventive-fundraiser-view-script',
			'eventive-marquee-view-script',
			'eventive-single-film-view-script',
			'eventive-venues-view-script',
		);

		// Allow for the blocks to be filtered with apply filters.
		$blocks_with_views = apply_filters( 'eventive_blocks_view_scripts_list', $blocks_with_views );

		// Find the first registered script and localize it only once.
		$localized = false;
		foreach ( $blocks_with_views as $script_handle ) {
			if ( ! $localized && wp_script_is( $script_handle, 'enqueued' ) ) {
				// Add the WP REST API script as a dependency.
				wp_localize_script(
					$script_handle,
					'EventiveBlockData',
					$localization
				);
				$localized = true;
			}
		}
	}

	/**
	 * Localize editor scripts for blocks in the admin.
	 *
	 * @return void
	 */
	public function localize_block_editor_scripts() {
		// Global the API class.
		global $eventive_api;

		// Prepare data to pass to editor scripts.
		$localization = $eventive_api->get_api_localization_data();

		// Localize to the global window object for editor scripts.
		wp_localize_script(
			'wp-blocks',
			'EventiveBlockData',
			$localization
		);
	}
}
