<?php
/**
 * Provincetown Film Plugin
 * Registers blocks for the Provincetown Film Plugin.
 *
 * @package WordPress
 * @subpackage Provincetown
 * @since 1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register Provincetown blocks.
 */
class Provincetown_Film_Blocks {

	/**
	 * Init callback for register.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Register the CPT.
		add_action( 'init', array( $this, 'provincetown_blocks_init' ) );

		// Register these Post Meta items to be used on the page.
		add_action( 'init', array( $this, 'provincetown_site_register_postmeta' ) );

		// Add the provincetown category to the block editor.
		add_filter( 'block_categories_all', array( $this, 'provincetown_block_categories' ), 10, 2 );

		// Enqueue the block editor to handle these.
		add_action( 'enqueue_block_editor_assets', array( $this, 'provincetown_site_enqueue_block_editor_assets' ) );
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
	public function provincetown_blocks_init() {
		register_block_type( PTOWN_PLUGIN_PATH . '/build/agile-showtimes/' );
		register_block_type( PTOWN_PLUGIN_PATH . '/build/film-post-meta/' );

		register_block_type( PTOWN_PLUGIN_PATH . '/build/agile-checkout/' );
		register_block_type( PTOWN_PLUGIN_PATH . '/build/agile-cart/' );
		register_block_type( PTOWN_PLUGIN_PATH . '/build/agile-login/' );
	}

	/**
	 * Registers a custom block category for provincetown blocks.
	 *
	 * @param array   $categories Array of block categories.
	 * @param WP_Post $post       The current post.
	 * @return array  Modified array of block categories.
	 */
	public function provincetown_block_categories( $categories, $post ) { // phpcs:ignore
		// Check if our provincetown category already exists.
		$provincetown_category = array_filter(
			$categories,
			function ( $cat ) {
				return ( 'provincetown' === $cat['slug'] );
			}
		);

		if ( empty( $provincetown_category ) ) {
			$categories[] = array(
				'slug'  => 'provincetown',
				'title' => __( 'Provincetown', 'provincetown' ),
				'icon'  => 'editor-video',
			);
		}
		return $categories;
	}

	/**
	 * Add the block editor options to this.
	 *
	 * @return void Enqueue the script.
	 */
	public function provincetown_site_enqueue_block_editor_assets() {
		wp_enqueue_script(
			'provincetown-block-editor-components',
			PTOWN_PLUGIN . 'build/index.js',
			array( 'wp-plugins', 'wp-edit-post', 'wp-i18n', 'wp-element', 'wp-data' ),
			PTOWN_PLUGIN_CURRENT_VERSION,
			false
		);
	}

	/**
	 * Register PostMeta for the block editor.
	 *
	 * @return void
	 */
	public function provincetown_site_register_postmeta() {
		// Page Header PostMeta.
		register_post_meta(
			'page',
			'provincetown_hide_featured_image',
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
			'provincetown_hide_page_title',
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
			'provincetown_site_header',
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

		// Festival, Events and Cinema PostMeta.
		$film_types = array( 'films', 'cinema_films', 'event_films' );

		foreach ( $film_types as $film ) {
			// Film Rating.
			register_post_meta(
				$film,
				'movie_rating',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Film Rating', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => array( $this, 'provincetown_sanitize_film_rating' ),
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Movie Runtime.
			register_post_meta(
				$film,
				'movie_runtime',
				array(
					'type'              => 'number',
					'description'       => esc_html__( 'Movie Runtime (in minutes)', 'provincetown' ),
					'default'           => 0,
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'absint',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Year Released.
			register_post_meta(
				$film,
				'film_year',
				array(
					'type'              => 'number',
					'description'       => esc_html__( 'Year Released', 'provincetown' ),
					'default'           => 0,
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'absint',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Directed By.
			register_post_meta(
				$film,
				'directed_by',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Directed By', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Cast.
			register_post_meta(
				$film,
				'cast',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Cast', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Sponsored By.
			register_post_meta(
				$film,
				'sponsor',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Sponsored By', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Presented By.
			register_post_meta(
				$film,
				'presented_by',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Presented By', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Print Source.
			register_post_meta(
				$film,
				'print_source',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Print Source', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Agile Film ID.
			register_post_meta(
				$film,
				'provincetown_film_agile_id',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Agile Film ID', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Link to Tickets.
			register_post_meta(
				$film,
				'ticket_link',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Link to Tickets', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Ticket Price.
			register_post_meta(
				$film,
				'ticket_price',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Ticket Price', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// Online Ticket Label.
			register_post_meta(
				$film,
				'provincetown_film_online_title',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'Online Ticket Label', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);

			// URL.
			register_post_meta(
				$film,
				'provincetown_film_online_url',
				array(
					'type'              => 'string',
					'description'       => esc_html__( 'URL', 'provincetown' ),
					'default'           => '',
					'single'            => true,
					'show_in_rest'      => true,
					'sanitize_callback' => 'sanitize_text_field',
					'auth_callback'     => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}

	/**
	 * Sanitize the Film rating from the list of available values.
	 *
	 * @param  string $meta_value The meta value to be checked.
	 * @param  string $meta_key The meta key to check for.
	 * @param  string $object_type Type of object being checked.
	 * @param  string $object_subtype Subtype of object.
	 *
	 * @return string The Film rating value that has been sanitized.
	 */
	public function provincetown_sanitize_film_rating( $meta_value, $meta_key, $object_type, $object_subtype ) {
		switch ( $meta_value ) {
			default:
				return '';
			case 'PG':
				return 'PG';
			case 'PG-13':
				return 'PG-13';
			case 'R':
				return 'R';
			case 'NC-17':
				return 'NC-17';
		}
	}
}
