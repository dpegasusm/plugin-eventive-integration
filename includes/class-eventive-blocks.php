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

		// Output localization data inline in wp_head.
		add_action( 'wp_head', array( $this, 'output_inline_localization_data' ), 5 );

		// Localize editor scripts for admin blocks.
		add_action( 'enqueue_block_editor_assets', array( $this, 'localize_block_editor_scripts' ) );
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
				'title' => __( 'Eventive', 'eventive-integration' ),
				'icon'  => 'tickets-alt',
			);
		}

		// Load us a new category for film blocks if on an eventive film post type.
		// These are for films that are on an eventive film post type and need to be categorized separately in the block editor.
		$film_category = array_filter(
			$categories,
			function ( $cat ) {
				return ( 'eventive-films' === $cat['slug'] );
			}
		);

		if ( empty( $film_category ) ) {
			$categories[] = array(
				'slug'  => 'eventive-films',
				'title' => __( 'Eventive Film Data', 'eventive-integration' ),
				'icon'  => 'video-alt3',
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
	 * Output EventiveBlockData as inline script in wp_head.
	 *
	 * @return void
	 */
	public function output_inline_localization_data() {
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

			// Also load into the Film metadata we might use like fim ID.
			$film_id = get_post_meta( get_the_ID(), '_eventive_film_id', true );
			if ( $film_id ) {
				$localization['filmId'] = $film_id;
			}

			// And Venue ID if available.
			$venue_id = get_post_meta( get_the_ID(), '_eventive_venue_id', true );
			if ( $venue_id ) {
				$localization['venueId'] = $venue_id;
			}
		}

		// Output inline script with the data.
		?>
		<script type="text/javascript">
			window.EventiveBlockData = <?php echo wp_json_encode( $localization ); ?>;
		</script>
		<?php
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
