<?php
class ButtonDesignerPreview {
    public static function render() {
        // Retrieve options with defaults
        $options = get_option('eventive_button_designer_options', []);
        $backgroundColor = $options['button_background_color'] ?? '#000000';
        $hoverColor = $options['button_hover_color'] ?? '#ff4081';
        $fontFamily = $options['button_font'] ?? 'Lato, sans-serif';
        $textColor = $options['button_text_color'] ?? '#ffffff';
        $borderColor = $options['button_border_color'] ?? '#000000';
        $borderWidth = $options['button_border_width'] ?? '1';
        $borderStyle = $options['button_border_style'] ?? 'solid';
        $borderRadius = $options['button_border_radius'] ?? '4';
        $boxShadow = $options['button_box_shadow'] ?? '0px 4px 6px rgba(0, 0, 0, 0.1)';

        // Render the preview container
        echo "<div style='padding: 20px; border: 1px solid #ddd; background: #f9f9f9; text-align: center;'>
            <h3>Button Preview</h3>
            <div style='display: inline-block;'>
                <button style='
                    color: $textColor;
                    background-color: $backgroundColor;
                    font-family: $fontFamily;
                    font-size: 16px;
                    font-weight: bold;
                    text-transform: uppercase;
                    text-align: center;
                    border: {$borderWidth}px {$borderStyle} $borderColor;
                    border-radius: {$borderRadius}px;
                    padding: 12px 24px;
                    box-shadow: $boxShadow;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ' 
                onmouseover=\"this.style.backgroundColor='$hoverColor'; this.style.transform='translateY(-3px)'; this.style.boxShadow='0px 8px 12px rgba(0, 0, 0, 0.3)';\" 
                onmouseout=\"this.style.backgroundColor='$backgroundColor'; this.style.transform='translateY(0px)'; this.style.boxShadow='$boxShadow';\">
                    Pre-Order Now
                </button>
            </div>
        </div>";
    }
}
?>