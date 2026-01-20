<?php
/**
 * Eventive Plugin - Film Tags Taxonomy
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
 * Eventive_Taxonomy_Film_Tags Class
 */
class Eventive_Taxonomy_Film_Tags {
	/**
	 * Initialize the custom taxonomy.
	 *
	 * @return void
	 */
	public function init() {
		// Register the Eventive film tags taxonomy.
		add_action( 'init', array( $this, 'register_eventive_taxonomy_tags' ) );
		
		// Register term meta for Eventive tag data.
		add_action( 'init', array( $this, 'register_tag_meta' ) );
		
		// Add color picker field to tag edit screen.
		add_action( 'eventive_film_tags_edit_form_fields', array( $this, 'add_tag_color_field' ), 10, 2 );
		add_action( 'edited_eventive_film_tags', array( $this, 'save_tag_color_field' ), 10, 2 );
		
		// Enqueue color picker scripts.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_color_picker' ) );
	}

	/**
	 * Register the Eventive film tags taxonomy.
	 *
	 * @return void
	 */
	public function register_eventive_taxonomy_tags() {
		$labels = array(
			'name'                       => _x( 'Film Tags', 'taxonomy general name', 'eventive' ),
			'singular_name'              => _x( 'Film Tag', 'taxonomy singular name', 'eventive' ),
			'search_items'               => __( 'Search Film Tags', 'eventive' ),
			'popular_items'              => __( 'Popular Film Tags', 'eventive' ),
			'all_items'                  => __( 'All Film Tags', 'eventive' ),
			'parent_item'                => null,
			'parent_item_colon'          => null,
			'edit_item'                  => __( 'Edit Film Tag', 'eventive' ),
			'update_item'                => __( 'Update Film Tag', 'eventive' ),
			'add_new_item'               => __( 'Add New Film Tag', 'eventive' ),
			'new_item_name'              => __( 'New Film Tag Name', 'eventive' ),
			'separate_items_with_commas' => __( 'Separate film tags with commas', 'eventive' ),
			'add_or_remove_items'        => __( 'Add or remove film tags', 'eventive' ),
			'choose_from_most_used'      => __( 'Choose from the most used film tags', 'eventive' ),
			'not_found'                  => __( 'No film tags found.', 'eventive' ),
			'menu_name'                  => __( 'Film Tags', 'eventive' ),
		);

		$args = array(
			'labels'            => $labels,
			'description'       => __( 'Tags for films imported from Eventive.', 'eventive' ),
			'hierarchical'      => false,
			'public'            => true,
			'show_ui'           => true,
			'show_in_menu'      => true,
			'show_in_nav_menus' => true,
			'show_in_rest'      => true,
			'show_tagcloud'     => true,
			'show_in_quick_edit' => true,
			'show_admin_column' => true,
			'rewrite'           => array(
				'slug'         => 'film-tag',
				'with_front'   => false,
				'hierarchical' => false,
			),
			'query_var'         => true,
			'capabilities'      => array(
				'manage_terms' => 'manage_categories',
				'edit_terms'   => 'manage_categories',
				'delete_terms' => 'manage_categories',
				'assign_terms' => 'edit_posts',
			),
		);

		register_taxonomy( 'eventive_film_tags', array( 'eventive_film' ), $args );
	}

	/**
	 * Register term meta for Eventive tag data.
	 *
	 * @return void
	 */
	public function register_tag_meta() {
		register_term_meta(
			'eventive_film_tags',
			'eventive_tag_id',
			array(
				'type'         => 'string',
				'description'  => 'Eventive Tag ID',
				'single'       => true,
				'show_in_rest' => true,
			)
		);

		register_term_meta(
			'eventive_film_tags',
			'eventive_tag_color',
			array(
				'type'         => 'string',
				'description'  => 'Eventive Tag Color',
				'single'       => true,
				'show_in_rest' => true,
				'sanitize_callback' => 'sanitize_hex_color',
			)
		);
	}

	/**
	 * Add color picker field to tag edit screen.
	 *
	 * @param WP_Term $term Current taxonomy term object.
	 * @param string  $taxonomy Current taxonomy slug.
	 * @return void
	 */
	public function add_tag_color_field( $term, $taxonomy ) {
		$eventive_id = get_term_meta( $term->term_id, 'eventive_tag_id', true );
		$color = get_term_meta( $term->term_id, 'eventive_tag_color', true );
		?>
		<tr class="form-field">
			<th scope="row">
				<label for="eventive_tag_id"><?php esc_html_e( 'Eventive Tag ID', 'eventive' ); ?></label>
			</th>
			<td>
				<input type="text" name="eventive_tag_id" id="eventive_tag_id" value="<?php echo esc_attr( $eventive_id ); ?>" class="regular-text" />
				<p class="description"><?php esc_html_e( 'The unique ID from Eventive for this tag.', 'eventive' ); ?></p>
			</td>
		</tr>
		<tr class="form-field">
			<th scope="row">
				<label for="eventive_tag_color"><?php esc_html_e( 'Tag Color', 'eventive' ); ?></label>
			</th>
			<td>
				<input type="text" name="eventive_tag_color" id="eventive_tag_color" value="<?php echo esc_attr( $color ); ?>" class="eventive-color-picker" />
				<p class="description"><?php esc_html_e( 'Choose a color for this tag.', 'eventive' ); ?></p>
			</td>
		</tr>
		<?php
	}

	/**
	 * Save tag color field.
	 *
	 * @param int    $term_id Term ID.
	 * @param int    $tt_id   Term taxonomy ID.
	 * @return void
	 */
	public function save_tag_color_field( $term_id, $tt_id ) {
		if ( isset( $_POST['eventive_tag_id'] ) ) {
			update_term_meta( $term_id, 'eventive_tag_id', sanitize_text_field( $_POST['eventive_tag_id'] ) );
		}

		if ( isset( $_POST['eventive_tag_color'] ) ) {
			update_term_meta( $term_id, 'eventive_tag_color', sanitize_hex_color( $_POST['eventive_tag_color'] ) );
		}
	}

	/**
	 * Enqueue color picker scripts.
	 *
	 * @param string $hook Current admin page hook.
	 * @return void
	 */
	public function enqueue_color_picker( $hook ) {
		if ( 'edit-tags.php' !== $hook && 'term.php' !== $hook ) {
			return;
		}

		$screen = get_current_screen();
		if ( ! $screen || 'eventive_film_tags' !== $screen->taxonomy ) {
			return;
		}

		wp_enqueue_style( 'wp-color-picker' );
		wp_enqueue_script( 'wp-color-picker' );

		wp_add_inline_script(
			'wp-color-picker',
			'jQuery(document).ready(function($) { $(".eventive-color-picker").wpColorPicker(); });'
		);
	}
}
