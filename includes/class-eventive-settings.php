<?php
/**
 * EventiveWP Plugin
 *
 * @package WordPress
 * @subpackage EventiveWP
 * @since 1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Dumplings_Member_List
 */
class Eventive_Settings {

	/**
	 * Init callback for register.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Register the Admin menu item for the settings page.
		add_action( 'admin_menu', array( $this, 'eventive_admin_menu' ) );

		// Register the actual settings.
		add_action( 'admin_init', array( $this, 'eventive_register_settings' ) );

		// Handle the Sync Films with Eventive button.
		add_action( 'admin_init', array( $this, 'handle_sync_films_with_eventive' ) );

		// Enqueue scripts for the Eventive options page.
		add_action( 'admin_enqueue_scripts', array( $this, 'eventive_enqueue_admin_scripts' ) );
	}

	/**
	 * Add administration menus.
	 *
	 * @return void
	 */
	public function eventive_admin_menu() {
		$page = add_options_page( __( 'EventiveWP', 'eventive' ), __( 'EventiveWP', 'eventive' ), 'manage_options', 'eventive_options', array( $this, 'eventive_options_page' ) );
	}

	/**
	 * Enqueue admin scripts only on the Eventive options page.
	 *
	 * @param string $hook The current admin page hook.
	 * @return void
	 */
	public function eventive_enqueue_admin_scripts( $hook ) {
		// Only load on the Eventive options page.
		if ( 'settings_page_eventive_options' !== $hook ) {
			return;
		}

		// Enqueue your custom script here.
		wp_enqueue_script(
			'eventive-options-script',
			EVENTIVE_PLUGIN . 'assets/js/eventive-options.js',
			array( 'jquery' ),
			EVENTIVE_CURRENT_VERSION,
			true
		);
	}

	/**
	 * Add our settings
	 *
	 * @return void
	 */
	public function eventive_register_settings() {
		// Create the Navbar section.
		add_settings_section( 'eventive_api_section', __( 'API Settings', 'eventive' ), '__return_true', 'eventive_options' );

		// Add the Navbar settings.
		register_setting( 'eventive_options', 'eventive_navbar_box_title', 'sanitize_text_field' );

		// Fields to be added to the Navbar section.
		add_settings_field(
			'eventive_secret_key',
			esc_html__( 'Event Secret Key', 'eventive' ),
			array( $this, 'eventive_text_field_callback' ),
			'eventive_options',
			'eventive_api_section',
			array(
				'label_for' => 'eventive_secret_key',
				'label'     => esc_html__( 'Title to go in the callout box on the bottom of the nav menu.', 'eventive' ),
				'default'   => '',
			)
		);

		// Get the value of the secret key and if its set then add the event bucket id field.
		$secret_key = get_option( 'eventive_secret_key', '' );

		// Check for the secret key before adding the event bucket id field.
		if ( ! empty( $secret_key ) ) {
			// Add the Event Bucket ID field.
			register_setting( 'eventive_options', 'eventive_navbar_box_description', 'sanitize_text_field' );

			// add the settings field.
			add_settings_field(
				'eventive_event_bucket_id',
				esc_html__( 'Event Bucket ID', 'provincetown' ),
				array( $this, 'eventive_dropdown_callback' ),
				'eventive_options',
				'eventive_api_section',
				array(
					'label_for' => 'eventive_event_bucket_id',
					'label'     => esc_html__( 'Text to go in the callout box on the bottom of the nav menu.', 'provincetown' ),
					'default'   => '',
					'values'    => array(), // This will be populated via JS on the front. 
				)
			);
		}
	}

	/**
	 * Generate an option page.
	 *
	 * @return void
	 */
	public function eventive_options_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Eventive Settings', 'eventive' ); ?></h1>

			<h2><?php esc_html_e( 'Sync Films with Eventive', 'eventive' ); ?></h2>
			<p><?php esc_html_e( 'Click the buttons below to sync the respective films with Eventive.', 'eventive' ); ?></p>

			<!-- Festival Films Button -->
			<form method="post" action="">
				<?php wp_nonce_field( 'eventive_sync_events', 'eventive_sync_events_nonce' ); ?>
				<button type="submit" name="eventive_sync_events" class="button button-primary">
					<?php esc_html_e( 'Sync Films with Eventive', 'eventive' ); ?>
				</button>
				<br>
				<br>
			</form>
			
			<form method="post" action="options.php" accept-charset="utf-8">
		<?php
		settings_fields( 'eventive_options' );

		do_settings_sections( 'eventive_options' );

		submit_button();
		?>
			</form>
		</div>
		<?php
	}

	/**
	 * Sanitize a yes/no checkbox/option.
	 *
	 * @param  string $input Yes no value to sanitize.
	 * @return string
	 */
	public function eventive_checkbox_sanitize( $input ) {
		if ( strtolower( $input ) === 'yes' ) {
			return 'yes';
		}
		return 'no';
	}

	/**
	 * A generic callback to display admin checkbox fields
	 *
	 * @param  mixed $args The args for the comment area.
	 * @return void
	 */
	public function eventive_checkbox_field_callback( $args ) {
		// We sanitize $args.
		$field   = esc_attr( $args['label_for'] );
		$label   = esc_html( $args['label'] );
		$default = esc_attr( $args['default'] );

		$value = $this->eventive_checkbox_sanitize( get_option( $field, $default ) );

		echo '<label class="description"><input type="checkbox" name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '" value="yes" ' . checked( $value, 'yes', false ) . '> ' . esc_attr( $label ) . '</label>';
	}

	/**
	 * A generic callback to display admin textfields.
	 *
	 * @param  array $args Args for callback.
	 * @return void
	 */
	public function eventive_text_field_callback( $args ) {
		// We sanitize $args.
		$field   = esc_attr( $args['label_for'] );
		$default = esc_attr( $args['default'] );

		$value = get_option( $field, $default );

		echo '<input type="text" name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '" value="' . esc_attr( $value ) . '" style="width: 100%;">';
	}

	/**
	 * A generic callback to display admin textfields.
	 *
	 * @param  array $args Args for callback.
	 * @return void
	 */
	public function eventive_upload_field_callback( $args ) {
		// We sanitize $args.
		$field   = esc_attr( $args['label_for'] );
		$default = esc_attr( $args['default'] );

		$value = get_option( $field, $default );

		echo '<input type="text" name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '-field" value="' . esc_attr( $value ) . '"> <button type="button" class="button button-secondary upload-button" id="' . esc_attr( $field ) . '-button" name="' . esc_attr( $field ) . '">' . esc_html__( 'Choose File', 'provincetown' ) . '</button>';
	}

	/**
	 * A callback for URL Fields.
	 *
	 * @param  array $args Args for callback.
	 * @return void
	 */
	public function eventive_url_field_callback( $args ) {
		// We sanitize $args.
		$field   = esc_attr( $args['label_for'] );
		$default = esc_attr( $args['default'] );

		$value = get_option( $field, $default );

		echo '<input type="url" name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '" value="' . esc_attr( $value ) . '" style="width: 100%;">';
	}

	/**
	 * A generic callback to display admin textfields.
	 *
	 * @param  array $args Args for callback.
	 * @return void
	 */
	public function eventive_textarea_field_callback( $args ) {
		// We sanitize $args.
		$field   = esc_attr( $args['label_for'] );
		$default = esc_attr( $args['default'] );

		$value = get_option( $field, $default );

		echo '<textarea name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '" style="width: 100%;">' . esc_textarea( $value ) . '</textarea>';
	}

	/**
	 * Callback to display a dropdown of all pages on the site.
	 *
	 * @param array $args Arguments for the dropdown field.
	 * @return void
	 */
	public function eventive_dropdown_callback( $args ) {
		// Sanitize the arguments.
		$field   = esc_attr( $args['label_for'] );
		$default = esc_attr( $args['default'] );
		$values  = (array) ( isset( $args['values'] ) && is_array( $args['values'] ) ? $args['values'] : array() );

		// Get the current value of the setting.
		$value = get_option( $field, $default );

		// Start the dropdown.
		echo '<select name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '" style="width: 100%;">';
		echo '<option value="">' . esc_html__( 'Select an Option', 'provincetown' ) . '</option>';

		// Loop through the pages and add them as options.
		foreach ( $values as $key => $label ) {
			$selected = selected( $value, $key, false );
			echo '<option value="' . esc_attr( $key ) . '" ' . esc_html( $selected ) . '>' . esc_html( $label ) . '</option>';
		}

		// Close the dropdown.
		echo '</select>';
	}

	/**
	 * Handle sync films with Eventive.
	 *
	 * @return void
	 */
	public function handle_sync_films_with_eventive() {
		// Handle Festival Films Sync.
		if ( isset( $_POST['eventive_sync_festival_films'] ) && check_admin_referer( 'eventive_sync_festival_films', 'eventive_sync_festival_films_nonce' ) ) {
			$this->sync_films_with_eventive();
		}
	}

	/**
	 * Sync films by type.
	 *
	 * @param string $type  The type of films to sync.
	 * @param string $label The label for the admin notice.
	 * @return void
	 */
	private function sync_films_by_type( $type, $label ) {
		global $class_eventive_film;

		switch ( $type ) {
			case 'festival':
				$post_type = 'films';
				break;
			case 'cinema':
				$post_type = 'cinema_films';
				break;
			case 'event':
				$post_type = 'event_films';
				break;
			default:
				return;
		}

		// Get all published films of the specified type.
		$films = get_posts(
			array(
				'post_type'   => $post_type,
				'post_status' => 'publish',
				'numberposts' => -1,
			)
		);

		if ( ! empty( $films ) ) {
			foreach ( $films as $film ) {
				// Call the eventive_update_agile_film_data function for each film.
				$class_eventive_film->eventive_update_agile_film_data( null, $film->ID, 'eventive_film_agile_id', null );
			}

			// Add an admin notice to confirm the sync.
			add_action(
				'admin_notices',
				function () use ( $label ) {
					// Translators: %s is the label of the films synced.
					echo '<div class="notice notice-success is-dismissible"><p>' . sprintf( esc_html__( '%s successfully synced with Eventive.', 'provincetown' ), esc_html( $label ) ) . '</p></div>';
				}
			);
		} else {
			// Add an admin notice if no films were found.
			add_action(
				'admin_notices',
				function () use ( $label ) {
					// Translators: %s is the label of the films synced.
					echo '<div class="notice notice-warning is-dismissible"><p>' . sprintf( esc_html__( 'No %s found to sync.', 'provincetown' ), esc_html( $label ) ) . '</p></div>';
				}
			);
		}
	}
}
