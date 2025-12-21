<?php
class ButtonDesignerSettings {
    public static function register() {
        register_setting(
            'eventive_button_designer_option_group',
            'eventive_button_designer_options',
            ['sanitize_callback' => [self::class, 'sanitize']]
        );

        add_settings_section(
            'button_designer_settings_section',
            'Customize Buttons',
            function () {
                echo '<p>Use the options below to customize the appearance of Eventive Everywhere buttons.</p>';
            },
            'eventive-button-designer'
        );

        self::add_fields();
    }

    private static function add_fields() {
        add_settings_field('button_background_color', 'Button Background Color', [self::class, 'background_color_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_hover_color', 'Button Hover Color', [self::class, 'hover_color_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_font', 'Button Font Family', [self::class, 'font_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_text_color', 'Button Text Color', [self::class, 'text_color_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_border_color', 'Button Border Color', [self::class, 'border_color_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_border_width', 'Button Border Width (px)', [self::class, 'border_width_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_border_style', 'Button Border Style', [self::class, 'border_style_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_border_radius', 'Button Border Radius (px)', [self::class, 'border_radius_field'], 'eventive-button-designer', 'button_designer_settings_section');
        add_settings_field('button_box_shadow', 'Button Box Shadow (CSS)', [self::class, 'box_shadow_field'], 'eventive-button-designer', 'button_designer_settings_section');
    }

    public static function background_color_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_background_color'] ?? '#000000';
        echo "<input type='color' name='eventive_button_designer_options[button_background_color]' value='$value'>";
    }

    public static function hover_color_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_hover_color'] ?? '#ff4081';
        echo "<input type='color' name='eventive_button_designer_options[button_hover_color]' value='$value'>";
    }

    public static function font_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_font'] ?? 'Lato, sans-serif';
        echo "<input type='text' name='eventive_button_designer_options[button_font]' value='$value'>";
    }

    public static function text_color_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_text_color'] ?? '#ffffff';
        echo "<input type='color' name='eventive_button_designer_options[button_text_color]' value='$value'>";
    }

    public static function border_color_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_border_color'] ?? '#000000';
        echo "<input type='color' name='eventive_button_designer_options[button_border_color]' value='$value'>";
    }

    public static function border_width_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_border_width'] ?? '1';
        echo "<input type='number' name='eventive_button_designer_options[button_border_width]' value='$value' min='0' step='1'>";
    }

    public static function border_style_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_border_style'] ?? 'solid';
        echo "<select name='eventive_button_designer_options[button_border_style]'>
            <option value='solid' " . selected($value, 'solid', false) . ">Solid</option>
            <option value='dashed' " . selected($value, 'dashed', false) . ">Dashed</option>
            <option value='dotted' " . selected($value, 'dotted', false) . ">Dotted</option>
            <option value='double' " . selected($value, 'double', false) . ">Double</option>
            <option value='none' " . selected($value, 'none', false) . ">None</option>
        </select>";
    }

    public static function border_radius_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_border_radius'] ?? '4';
        echo "<input type='number' name='eventive_button_designer_options[button_border_radius]' value='$value' min='0' step='1'>";
    }

    public static function box_shadow_field() {
        $options = get_option('eventive_button_designer_options', []);
        $value = $options['button_box_shadow'] ?? '0px 4px 6px rgba(0, 0, 0, 0.1)';
        echo "<input type='text' name='eventive_button_designer_options[button_box_shadow]' value='" . esc_attr($value) . "' placeholder='e.g., 0px 4px 6px rgba(0,0,0,0.1)'>";
    }

    public static function sanitize($input) {
        $sanitized = [];
        if (isset($input['button_background_color'])) {
            $sanitized['button_background_color'] = sanitize_hex_color($input['button_background_color']);
        }
        if (isset($input['button_hover_color'])) {
            $sanitized['button_hover_color'] = sanitize_hex_color($input['button_hover_color']);
        }
        if (isset($input['button_font'])) {
            $sanitized['button_font'] = sanitize_text_field($input['button_font']);
        }
        if (isset($input['button_text_color'])) {
            $sanitized['button_text_color'] = sanitize_hex_color($input['button_text_color']);
        }
        if (isset($input['button_border_color'])) {
            $sanitized['button_border_color'] = sanitize_hex_color($input['button_border_color']);
        }
        if (isset($input['button_border_width'])) {
            $sanitized['button_border_width'] = absint($input['button_border_width']);
        }
        if (isset($input['button_border_style'])) {
            $sanitized['button_border_style'] = sanitize_text_field($input['button_border_style']);
        }
        if (isset($input['button_border_radius'])) {
            $sanitized['button_border_radius'] = absint($input['button_border_radius']);
        }
        if (isset($input['button_box_shadow'])) {
            $sanitized['button_box_shadow'] = sanitize_text_field($input['button_box_shadow']);
        }
        return $sanitized;
    }
}
?>