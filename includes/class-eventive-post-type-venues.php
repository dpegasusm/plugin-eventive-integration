<?php
/**
 * Eventive Plugin - Venues Post Type
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
 * Eventive_Post_Type_Venues Class
 */
class Eventive_Post_Type_Venues {
	/**
	 * Initialize the custom post type.
	 *
	 * @return void
	 */
	public function init() {
		// Register the Eventive venues custom post type.
		add_action( 'init', array( $this, 'register_eventive_post_type' ) );

		// Register meta fields for REST API.
		add_action( 'init', array( $this, 'register_venue_meta' ) );

		// Enqueue block editor assets.
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_venue_properties_script' ) );
	}

	/**
	 * Register the Eventive venues custom post type.
	 *
	 * @return void
	 */
	public function register_eventive_post_type() {
		$labels = array(
			'name'               => __( 'Venues', 'eventive-integration' ),
			'singular_name'      => __( 'Venue', 'eventive-integration' ),
			'add_new'            => __( 'Add New', 'eventive-integration' ),
			'add_new_item'       => __( 'Add New Venue', 'eventive-integration' ),
			'edit_item'          => __( 'Edit Venue', 'eventive-integration' ),
			'new_item'           => __( 'New Venue', 'eventive-integration' ),
			'view_item'          => __( 'View Venue', 'eventive-integration' ),
			'search_items'       => __( 'Search Venues', 'eventive-integration' ),
			'not_found'          => __( 'No venues found', 'eventive-integration' ),
			'not_found_in_trash' => __( 'No venues found in trash', 'eventive-integration' ),
			'parent_item_colon'  => __( 'Parent Venue:', 'eventive-integration' ),
			'menu_name'          => __( 'Venues', 'eventive-integration' ),
		);

		$args = array(
			'label'               => __( 'Venues', 'eventive-integration' ),
			'description'         => __( 'Venues imported from Eventive.', 'eventive-integration' ),
			'labels'              => $labels,
			'hierarchical'        => false,
			'supports'            => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => 'edit.php?post_type=eventive_film',
			'show_in_nav_menus'   => true,
			'publicly_queryable'  => true,
			'exclude_from_search' => false,
			'show_in_rest'        => true,
			'has_archive'         => true,
			'query_var'           => true,
			'can_export'          => true,
			'rewrite'             => array(
				'slug'       => 'venues',
				'with_front' => false,
				'feeds'      => true,
				'pages'      => true,
			),
			'map_meta_cap'        => true,
			'capabilities'        => array(
				'edit_post'          => 'edit_venue',
				'read_post'          => 'read_venue',
				'delete_post'        => 'delete_venue',
				'edit_posts'         => 'edit_venues',
				'edit_others_posts'  => 'edit_others_venues',
				'publish_posts'      => 'publish_venues',
				'read_private_posts' => 'read_private_venues',
			),
		);

		register_post_type( 'eventive_venue', $args );
	}

	/**
	 * Register venue meta fields for REST API access.
	 *
	 * @return void
	 */
	public function register_venue_meta() {
		$meta_fields = array(
			'_eventive_venue_id'               => 'string',
			'_eventive_bucket_id'              => 'string',
			'_eventive_venue_address'          => 'string',
			'_eventive_venue_city'             => 'string',
			'_eventive_venue_state'            => 'string',
			'_eventive_venue_zip'              => 'string',
			'_eventive_venue_country'          => 'string',
			'_eventive_venue_lat'              => 'string',
			'_eventive_venue_long'             => 'string',
			'_eventive_venue_url'              => 'string',
			'_eventive_venue_color'            => 'string',
			'_eventive_use_reserved_seating'   => 'boolean',
			'_eventive_venue_short_name'       => 'string',
			'_eventive_venue_default_capacity' => 'integer',
			'_eventive_venue_comscore_include' => 'boolean',
		);

		foreach ( $meta_fields as $meta_key => $type ) {
			// Set default value based on type
			$default = null;

			switch ( $type ) {
				case 'string':
					$default = '';
					break;
				case 'integer':
					$default = 0;
					break;
				case 'boolean':
					$default = false;
					break;
			}

			// Allow the default to be filtered
			$default = apply_filters( 'eventive_venue_meta_default_' . $meta_key, $default );

			register_post_meta(
				'eventive_venue',
				$meta_key,
				array(
					'show_in_rest'  => true,
					'default'       => $default,
					'single'        => true,
					'type'          => $type,
					'auth_callback' => function () {
						return current_user_can( 'edit_venues' );
					},
				)
			);
		}
	}

	/**
	 * Enqueue the venue properties script for the block editor.
	 *
	 * @return void
	 */
	public function enqueue_venue_properties_script() {
		// Only enqueue on eventive_venue post type.
		if ( 'eventive_venue' !== get_post_type() ) {
			return;
		}

		$asset_file = include plugin_dir_path( __DIR__ ) . 'build/venue-properties/index.asset.php';

		wp_enqueue_script(
			'eventive-venue-properties',
			EVENTIVE_PLUGIN . 'build/venue-properties/index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);
	}
}
