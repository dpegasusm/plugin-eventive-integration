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
class Eventive_Post_Type {
	/**
	 * Initialize the custom post type.
	 *
	 * @return void
	 */
	public function init() {
		// Register the Eventive custom post type.
		add_action( 'init', array( $this, 'register_eventive_post_type' ) );
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
			'taxonomies'          => array( 'eventive_categories', 'eventive_tags' ),
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
}
