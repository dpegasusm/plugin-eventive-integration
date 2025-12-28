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
		// Global the sync object.
		global $eventive_sync;

		// Register the Admin menu item for the settings page.
		add_action( 'admin_menu', array( $this, 'eventive_admin_menu' ) );

		// Register the actual settings.
		add_action( 'admin_init', array( $this, 'eventive_register_settings' ) );

		// Enqueue scripts for the Eventive options page.
		add_action( 'admin_enqueue_scripts', array( $this, 'eventive_enqueue_admin_scripts' ) );

		// Hook into the settings saved to handle the update of the loader URL from bucket ID.
		add_action( 'eventive_bucket_id_settings_saved', array( $this, 'eventive_sync_update_loader_url_on_bucket_change' ), 10, 2 );
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
		// Global the API object.
		global $eventive_api;

		// Only load on the Eventive options page.
		if ( 'settings_page_eventive_options' !== $hook ) {
			return;
		}

		// Enqueue your custom script here.
		wp_enqueue_script(
			'eventive-settings-script',
			EVENTIVE_PLUGIN . 'assets/js/eventive-settings.js',
			array( 'jquery', 'wp-api-fetch' ),
			EVENTIVE_CURRENT_VERSION,
			true
		);

		// Prepare data to pass to view scripts.
		$localization = $eventive_api->get_api_localization_data();

		// Localize script with API data.
		wp_localize_script(
			'eventive-settings-script',
			'EventiveData',
			$localization
		);
	}

	/**
	 * Add our settings
	 *
	 * @return void
	 */
	public function eventive_register_settings() {
		// Create the Navbar section.
		add_settings_section( 'eventive_info_section', __( 'Eventive Configuration Settings', 'eventive' ), array( $this, 'eventive_admin_options_section_info' ), 'eventive_options' );

		// Add the Navbar settings - with sanitize callback.
		register_setting(
			'eventive_options',
			'eventive_secret_key',
			array(
				'sanitize_callback' => array( $this, 'eventive_sanitize_secret_key' ),
			)
		);

		// Fields to be added to the Navbar section.
		add_settings_field(
			'eventive_secret_key',
			esc_html__( 'Event Secret Key', 'eventive' ),
			array( $this, 'eventive_text_field_callback' ),
			'eventive_options',
			'eventive_info_section',
			array(
				'label_for' => 'eventive_secret_key',
				'label'     => esc_html__( 'Title to go in the callout box on the bottom of the nav menu.', 'eventive' ),
				'default'   => '',
			)
		);

		// Add the Event Bucket ID field.
		register_setting(
			'eventive_options',
			'eventive_default_bucket_id',
			array(
				'sanitize_callback' => array( $this, 'eventive_sanitize_bucket_id' ),
			)
		);

		// add the settings field.
		add_settings_field(
			'eventive_default_bucket_id',
			esc_html__( 'Event Default Bucket ID', 'eventive' ),
			array( $this, 'eventive_dropdown_callback' ),
			'eventive_options',
			'eventive_info_section',
			array(
				'label_for' => 'eventive_default_bucket_id',
				'label'     => esc_html__( 'Default bucket to use inside eventive. This can be overridden on a page by page basis.', 'eventive' ),
				'default'   => '',
				'values'    => array(), // This will be populated via JS on the front.
			)
		);
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
			<form method="post" action="options.php" accept-charset="utf-8">
				<?php
				settings_fields( 'eventive_options' );

				do_settings_sections( 'eventive_options' );

				submit_button();
				?>
			</form>

			<h2><?php esc_html_e( 'Sync with Eventive', 'eventive' ); ?></h2>
			<p><?php esc_html_e( 'Click the buttons below to sync the events with Eventive. This will also refresh the buckets list.', 'eventive' ); ?></p>

			<!-- Eventive Events Button -->
			<form method="post" action="">
				<?php wp_nonce_field( 'eventive_sync_events', 'eventive_sync_events_nonce' ); ?>
				<button type="submit" name="eventive_sync_events" class="button button-secondary">
					<?php esc_html_e( 'Sync with Eventive', 'eventive' ); ?>
				</button>
				<br>
				<div class='eventive-sync-progress' id='eventive-sync-events-progress' style='margin-top:10px; display:none;'>
					<?php esc_html_e( 'Syncing events, please wait...', 'eventive' ); ?>
				</div>
			</form>
		</div>
		<?php
	}

	/**
	 * Section info callback.
	 *
	 * @return void
	 */
	public function eventive_admin_options_section_info() {
		echo esc_html__( 'Welcome organizers! Use this page to configure the Eventive plugin options below.', 'eventive' );
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

		echo '<input type="text" name="' . esc_attr( $field ) . '" id="' . esc_attr( $field ) . '-field" value="' . esc_attr( $value ) . '"> <button type="button" class="button button-secondary upload-button" id="' . esc_attr( $field ) . '-button" name="' . esc_attr( $field ) . '">' . esc_html__( 'Choose File', 'eventive' ) . '</button>';
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
		echo '<option value="">' . esc_html__( 'Select an Option', 'eventive' ) . '</option>';

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
		// Load our global sync object.
		global $eventive_sync;

		// Handle Festival Films Sync.
		if ( isset( $_POST['eventive_sync_festival_films'] ) && check_admin_referer( 'eventive_sync_festival_films', 'eventive_sync_festival_films_nonce' ) ) {
			$eventive_sync->sync_films_with_eventive();
		}
	}

	/**
	 * Sanitize secret key on save.
	 *
	 * This function runs when the eventive_secret_key option is saved.
	 *
	 * @param string $value The value being saved.
	 * @return string Sanitized value.
	 */
	public function eventive_sanitize_secret_key( $value ) {
		// Sanitize the input.
		$sanitized_value = sanitize_text_field( $value );

		// Hook to run custom functions when settings are saved.
		do_action( 'eventive_api_key_settings_saved', 'eventive_secret_key', $sanitized_value );

		return $sanitized_value;
	}

	/**
	 * Sanitize bucket ID on save.
	 *
	 * This function runs when the eventive_default_bucket_id option is saved.
	 *
	 * @param string $value The value being saved.
	 * @return string Sanitized value.
	 */
	public function eventive_sanitize_bucket_id( $value ) {
		// Sanitize the input.
		$sanitized_value = sanitize_text_field( $value );

		// Hook to run custom functions when settings are saved.
		do_action( 'eventive_bucket_id_settings_saved', 'eventive_default_bucket_id', $sanitized_value );

		return $sanitized_value;
	}

	/**
	 * Update the loader URL when the bucket ID changes.
	 *
	 * @param string $option_name The name of the option being saved.
	 * @param string $bucket_id   The new bucket ID being saved.
	 * @return void
	 */
	public function eventive_sync_update_loader_url_on_bucket_change( $option_name, $bucket_id ) {
		// At this point the list of buckets is stored in the option 'eventive_buckets_list'.
		$buckets_list = get_option( 'eventive_buckets_list', array() );

		// Check that we have buckets.
		if ( empty( $buckets_list ) || ! is_array( $buckets_list ) ) {
			return;
		}

		// Get the loader url for our bucket from the list of buckets that match the bucket we are looking at.
		foreach ( $buckets_list as $bucket ) {
			$id = $bucket['id'] ?? '';
			if ( $id === $bucket_id ) {
				$root = $bucket['urls']['root'] ?? '';
				if ( ! empty( $root ) ) {
					$loader_url = untrailingslashit( $root ) . '/loader.js';
					// Update the loader URL option.
					update_option( 'eventive_default_bucket_root_url', esc_url_raw( $loader_url ) );
					break;
				}
			}
		}
	}
}



