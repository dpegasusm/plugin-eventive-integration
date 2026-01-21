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
 * Eventive_Post_Type Class
 */
class Eventive_Post_Type_Film {
	/**
	 * Initialize the custom post type.
	 *
	 * @return void
	 */
	public function init() {
		// Register the Eventive custom post type.
		add_action( 'init', array( $this, 'register_eventive_post_type' ) );

		// Register meta fields for REST API.
		add_action( 'init', array( $this, 'register_film_meta' ) );

		// Enqueue block editor assets.
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_film_scripts' ) );

		// Add custom admin columns.
		add_filter( 'manage_eventive_film_posts_columns', array( $this, 'add_sync_status_column' ) );
		add_action( 'manage_eventive_film_posts_custom_column', array( $this, 'display_sync_status_column' ), 10, 2 );
	}

	/**
	 * Register the Eventive custom post type.
	 *
	 * @return void
	 */
	public function register_eventive_post_type() {
		$labels = array(
			'name'               => _x( 'Films', 'eventive' ),
			'singular_name'      => _x( 'Film', 'eventive' ),
			'add_new'            => _x( 'Add New', 'eventive' ),
			'add_new_item'       => _x( 'Add New Film', 'eventive' ),
			'edit_item'          => _x( 'Edit Film', 'eventive' ),
			'new_item'           => _x( 'New Film', 'eventive' ),
			'view_item'          => _x( 'View Film', 'eventive' ),
			'search_items'       => _x( 'Search Films', 'eventive' ),
			'not_found'          => _x( 'No films found', 'eventive' ),
			'not_found_in_trash' => _x( 'No films found in trash', 'eventive' ),
			'parent_item_colon'  => _x( 'Parent:', 'eventive' ),
			'menu_name'          => _x( 'Films', 'eventive' ),
		);

		$args = array(
			'label'               => __( 'Films', 'eventive' ),
			'description'         => __( 'Films imported from Eventive.', 'eventive' ),
			'labels'              => $labels,
			'hierarchical'        => false,
			'supports'            => array( 'title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields' ),
			'taxonomies'          => array( 'eventive_film_tags' ),
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'menu_position'       => 20,
			'menu_icon'           => 'dashicons-video-alt',
			'show_in_nav_menus'   => true,
			'publicly_queryable'  => true,
			'exclude_from_search' => false,
			'show_in_rest'        => true,
			'has_archive'         => true,
			'query_var'           => true,
			'can_export'          => true,
			'rewrite'             => array(
				'slug'       => 'films',
				'with_front' => false,
				'feeds'      => true,
				'pages'      => true,
			),
			'map_meta_cap'        => true,
			'capabilities'        => array(
				'edit_post'          => 'edit_film',
				'read_post'          => 'read_film',
				'delete_post'        => 'delete_film',
				'edit_posts'         => 'edit_films',
				'edit_others_posts'  => 'edit_others_films',
				'publish_posts'      => 'publish_films',
				'read_private_posts' => 'read_private_films',
			),
		);

		register_post_type( 'eventive_film', $args );
	}

	/**
	 * Register film meta fields for REST API access.
	 *
	 * @return void
	 */
	public function register_film_meta() {
		$meta_fields = array(
			'_eventive_film_id'      => 'string',
			'_eventive_bucket_id'    => 'string',
			'_eventive_venue_id'     => 'string',
			'_eventive_poster_image' => 'string',
			'_eventive_cover_image'  => 'string',
			'_eventive_trailer_url'  => 'string',
			'_eventive_runtime'      => 'integer',
			'_eventive_year'         => 'integer',
			'_eventive_language'     => 'string',
			'_eventive_country'      => 'string',
			'_eventive_director'     => 'string',
		);

		foreach ( $meta_fields as $meta_key => $type ) {
			// Use the type to set the default.
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

			// Allow the default to be filtered for a value.
			$default = apply_filters( 'eventive_film_meta_default_' . $meta_key, $default );

			// Register the post meta.
			register_post_meta(
				'eventive_film',
				$meta_key,
				array(
					'show_in_rest'  => true,
					'default'       => $default,
					'single'        => true,
					'type'          => $type,
					'auth_callback' => function () {
						return current_user_can( 'edit_films' );
					},
				)
			);
		}

		register_post_meta(
			'eventive_film',
			'_eventive_sync_enabled',
			array(
				'show_in_rest'  => true,
				'default'       => true,
				'single'        => true,
				'type'          => 'boolean',
				'auth_callback' => function () {
					return current_user_can( 'edit_films' );
				},
			)
		);
	}

	/**
	 * Enqueue the film properties script for the block editor.
	 *
	 * @return void
	 */
	public function enqueue_film_scripts() {
		// The post types to enqueue scripts for.
		$film_post_types = array( 'eventive_film' );

		// Allow for filtering the post types.
		$film_post_types = apply_filters( 'eventive_film_properties_post_types', $film_post_types );

		// Only enqueue on eventive_film post type.
		if ( ! in_array( get_post_type(), $film_post_types, true ) ) {
			return;
		}

		$asset_file = include plugin_dir_path( __DIR__ ) . 'build/film-sync/index.asset.php';

		wp_enqueue_script(
			'eventive-film-sync',
			EVENTIVE_PLUGIN . 'build/film-sync/index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		$asset_file = include plugin_dir_path( __DIR__ ) . 'build/film-properties/index.asset.php';

		wp_enqueue_script(
			'eventive-film-properties',
			EVENTIVE_PLUGIN . 'build/film-properties/index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);
	}

	/**
	 * Add sync status column to the films list table.
	 *
	 * @param array $columns Existing columns.
	 * @return array Modified columns.
	 */
	public function add_sync_status_column( $columns ) {
		// Insert sync status column before the date column.
		$new_columns = array();

		foreach ( $columns as $key => $value ) {
			if ( 'date' === $key ) {
				$new_columns['sync_status'] = __( 'Sync Enabled', 'eventive' );
			}
			$new_columns[ $key ] = $value;
		}

		return $new_columns;
	}

	/**
	 * Display sync status column content.
	 *
	 * @param string $column  Column name.
	 * @param int    $post_id Post ID.
	 * @return void
	 */
	public function display_sync_status_column( $column, $post_id ) {
		if ( 'sync_status' === $column ) {
			$sync_enabled = get_post_meta( $post_id, '_eventive_sync_enabled', true );

			// Default to true if not set (for backward compatibility).
			if ( '' === $sync_enabled ) {
				$sync_enabled = true;
			}

			if ( false === $sync_enabled ) {
				echo '<span class="dashicons dashicons-no-alt" style="color: #dc3232; font-size: 20px;" title="' . esc_attr__( 'Sync Disabled', 'eventive' ) . '"></span>';
			} else {
				echo '<span class="dashicons dashicons-yes-alt" style="color: #46b450; font-size: 20px;" title="' . esc_attr__( 'Sync Enabled', 'eventive' ) . '"></span>';
			}
		}
	}
}
