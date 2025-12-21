<?php
class Eventive_Buttons {
    public function __construct() {
        add_action('admin_menu', [$this, 'add_button_designer_submenu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_head', [$this, 'generate_dynamic_css'], 99);
    }

    public function add_button_designer_submenu() {
        add_submenu_page(
            'eventive-admin-options',
            'Button Designer',
            'Button Designer',
            'manage_options',
            'eventive-button-designer',
            [$this, 'render_button_designer_page']
        );
    }

    public function render_button_designer_page() {
        echo '<div class="wrap">';
        echo '<h1>Button Designer</h1>';
        echo '<p>Use the form below to customize your button styles and see a live preview.</p>';
    
        // Render settings form
        echo '<form method="post" action="options.php">';
        settings_fields('eventive_button_designer_option_group');
        do_settings_sections('eventive-button-designer');
        submit_button('Save Changes');
        echo '</form>';

        echo '<form method="post">';
        echo '<input type="hidden" name="eventive_reset_buttons" value="1">';
        submit_button('Reset to Defaults', 'delete');
        echo '</form>';

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['eventive_reset_buttons'])) {
            $this->reset_button_customizations();
        }
    
        // Render preview
        echo '<h2>Live Preview</h2>';
        require_once 'ButtonDesignerPreview.php';
        ButtonDesignerPreview::render();
    
        echo '</div>';
    }

    public function register_settings() {
        require_once 'ButtonDesignerSettings.php';
        ButtonDesignerSettings::register();
    }

    public function generate_dynamic_css() {
        require_once 'ButtonDesignerCSS.php';
        ButtonDesignerCSS::generate();
    }

    public function reset_button_customizations() {
        // Delete individual legacy options
        $option_keys = [
            'eventive_button_background_color',
            'eventive_button_text_color',
            'eventive_button_border_radius',
            'eventive_button_font_size',
            'eventive_button_padding',
            'eventive_button_hover_background',
            'eventive_button_hover_text_color',
            // Add additional option keys here as needed
        ];

        foreach ($option_keys as $key) {
            delete_option($key);
        }

        // Also clear the grouped options array used by the settings and CSS generator
        delete_option('eventive_button_designer_options');

        add_settings_error('eventive_button_designer', 'reset_success', 'Button customizations have been reset.', 'updated');
    }
}
?>