<?php
class Eventive_Options {
	private $eventive_admin_options_options;
	// $api_key = $this->eventive_admin_options_options['your_eventive_public_api_0'] ?? '';
	public function __construct() {
		// Add admin menu and initialize settings
		add_action( 'admin_menu', array( $this, 'eventive_admin_options_add_plugin_page' ) );
		add_action( 'admin_init', array( $this, 'eventive_admin_options_page_init' ) );
		// Enqueue styles for the admin page
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_styles' ) );
	}

	/**
	 * Enqueue admin styles for the plugin's admin page.
	 */
	public function enqueue_admin_styles( $hook_suffix ) {
		if ( $hook_suffix === 'toplevel_page_eventive-admin-options' ) {
			wp_enqueue_style(
				'eventive-admin-style',
				plugin_dir_url( dirname( __DIR__, 1 ) ) . 'admin/css/eventive-admin.css',
				array(),
				'1.0.0'
			);
		}
	}

	/**
	 * Add plugin options page to the admin menu.
	 */
	public function eventive_admin_options_add_plugin_page() {
		add_menu_page(
			'Eventive Admin Options',
			'EventiveWP',
			'manage_options',
			'eventive-admin-options',
			array( $this, 'eventive_admin_options_create_admin_page' ),
			'dashicons-tickets-alt',
			20
		);
	}
	/**
	 * Render the admin options and dashboard on the same page.
	 */
	public function eventive_admin_options_create_admin_page() {
		$this->eventive_admin_options_options = get_option( 'eventive_admin_options_option_name' );
		// Fetch the Secret Key from the options
		$api_key = $this->eventive_admin_options_options['your_eventive_secret_key_2'] ?? null;
		?>
		<div class="eventive-admin-container">
			<div class="eventive-admin-box">
				<h2>Eventive Admin Options</h2>
				<p>Welcome organizers! Use this page to configure the Eventive plugin options.</p>
				<?php settings_errors(); ?>
				<form method="post" action="options.php">
					<?php
					settings_fields( 'eventive_admin_options_option_group' );
					do_settings_sections( 'eventive-admin-options-admin' );
					submit_button();
					?>
				</form>
			</div>
	   

		<div class="eventive-admin-box">
			<h2>Dashboard</h2>
			<?php
			if ( ! $api_key ) {
				echo '<div class="notice notice-error"><p>Please configure the API Key and Event Bucket ID to view the dashboard.</p></div>';
			} else {
				$dashboard = new Eventive_Dashboard();
				echo $dashboard->render_dashboard();
			}
			?>
		</div>
		

		<div class="eventive-admin-box">
	<h2>Film Record Sync</h2>
		<?php
		if ( ! $api_key ) {
			echo '<div class="notice notice-error"><p>Please configure the API Key and Event Bucket ID to sync films.</p></div>';
		} elseif ( class_exists( 'Eventive_Sync_Films' ) ) {
				$film_sync = new Eventive_Sync_Films();
				echo $film_sync->render_film_sync();
		} else {
			echo '<div class="notice notice-error"><p>Film Sync class not found. Please check your plugin installation.</p></div>';
		}
		?>
</div>

		</div>
		<?php
	}

	/**
	 * Initialize settings and sections.
	 */
	public function eventive_admin_options_page_init() {
		register_setting(
			'eventive_admin_options_option_group',
			'eventive_admin_options_option_name',
			array( $this, 'eventive_admin_options_sanitize' )
		);

		add_settings_section(
			'eventive_admin_options_setting_section',
			'Settings',
			array( $this, 'eventive_admin_options_section_info' ),
			'eventive-admin-options-admin'
		);

		$this->add_settings_fields();
	}

	/**
	 * Add settings fields to the options page.
	 */
	private function add_settings_fields() {
		add_settings_field(
			'your_eventive_secret_key_2',
			'Your Eventive SECRET KEY',
			array( $this, 'your_eventive_secret_key_2_callback' ),
			'eventive-admin-options-admin',
			'eventive_admin_options_setting_section'
		);

		add_settings_field(
			'your_eventive_event_bucket_1',
			'Your Eventive Event Bucket',
			array( $this, 'your_eventive_event_bucket_1_callback' ),
			'eventive-admin-options-admin',
			'eventive_admin_options_setting_section'
		);

		add_settings_field(
			'eventive_color_mode',
			'Color Mode',
			array( $this, 'eventive_color_mode_callback' ),
			'eventive-admin-options-admin',
			'eventive_admin_options_setting_section'
		);
	}



	/**
	 * Section information for settings.
	 */
	public function eventive_admin_options_section_info() {
		echo '<p>Configure your Eventive settings below:</p>';
	}

	/**
	 * Sanitize input values.
	 */
	public function eventive_admin_options_sanitize( $input ) {
		$sanitary_values = array();

		if ( isset( $input['your_eventive_event_bucket_1'] ) ) {
			$sanitary_values['your_eventive_event_bucket_1'] = sanitize_text_field( $input['your_eventive_event_bucket_1'] );
		}

		if ( isset( $input['your_eventive_secret_key_2'] ) ) {
			$sanitary_values['your_eventive_secret_key_2'] = sanitize_text_field( $input['your_eventive_secret_key_2'] );
		}

		if ( isset( $input['eventive_color_mode'] ) ) {
			$valid_modes                            = array( 'light', 'dark', 'default' );
			$sanitary_values['eventive_color_mode'] = in_array( $input['eventive_color_mode'], $valid_modes, true )
				? sanitize_text_field( $input['eventive_color_mode'] )
				: 'default';
		}

		return $sanitary_values;
	}

	/**
	 * Callback for Eventive Secret Key field.
	 */
	public function your_eventive_secret_key_2_callback() {
		$value = $this->eventive_admin_options_options['your_eventive_secret_key_2'] ?? '';
		printf(
			'<input class="regular-text" type="password" id="eventive_secret_key" name="eventive_admin_options_option_name[your_eventive_secret_key_2]" value="%s">',
			esc_attr( $value )
		);
	}

	/**
	 * Callback for Eventive Event Bucket field.
	 */
	public function your_eventive_event_bucket_1_callback() {
		$secret_key = $this->eventive_admin_options_options['your_eventive_secret_key_2'] ?? '';

		if ( empty( $secret_key ) ) {
			echo '<p class="notice notice-error">Please set your Secret Key to see available Event Buckets.</p>';
			return;
		}

		$buckets = $this->get_eventive_event_buckets( $secret_key );

		if ( is_wp_error( $buckets ) ) {
			echo '<p class="notice notice-error">Error fetching event buckets: ' . esc_html( $buckets->get_error_message() ) . '</p>';
			return;
		}

		$selected_bucket = $this->eventive_admin_options_options['your_eventive_event_bucket_1'] ?? '';
		echo '<select name="eventive_admin_options_option_name[your_eventive_event_bucket_1]" class="regular-text">';
		foreach ( $buckets as $bucket ) {
			$selected = selected( $selected_bucket, $bucket['id'], false );
			printf( '<option value="%s" %s>%s</option>', esc_attr( $bucket['id'] ), $selected, esc_html( $bucket['name'] ) );
		}
		echo '</select>';
	}

	/**
	 * Fetch event buckets from the API.
	 */
	private function get_eventive_event_buckets( $secret_key ) {
		$response = wp_remote_get(
			'https://api.eventive.org/event_buckets',
			array(
				'headers' => array(
					'x-api-key' => $secret_key,
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( json_last_error() !== JSON_ERROR_NONE || empty( $data['event_buckets'] ) ) {
			return new WP_Error( 'api_error', 'Invalid API response or no event buckets found.' );
		}

		return $data['event_buckets'];
	}

	/**
	 * Callback for Color Mode dropdown.
	 */
	public function eventive_color_mode_callback() {
		$value = $this->eventive_admin_options_options['eventive_color_mode'] ?? 'default';
		?>
		<select name="eventive_admin_options_option_name[eventive_color_mode]">
			<option value="default" <?php selected( $value, 'default' ); ?>>Default</option>
			<option value="light" <?php selected( $value, 'light' ); ?>>Light</option>
			<option value="dark" <?php selected( $value, 'dark' ); ?>>Dark</option>
		</select>
		<?php
	}
}