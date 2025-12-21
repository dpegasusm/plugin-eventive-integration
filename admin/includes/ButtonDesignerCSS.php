<?php
if (!class_exists('ButtonDesignerCSS')) {
    class ButtonDesignerCSS {
        public static function defaults() {
            return [
                'button_background_color' => '#000000',
                'button_hover_color' => '#ff4081',
                'button_font' => 'Lato, sans-serif',
                'button_text_color' => '#ffffff',
                'button_border_color' => '#000000',
                'button_border_width' => 1,
                'button_border_style' => 'solid',
                'button_border_radius' => 4,
                'button_box_shadow' => '0px 4px 6px rgba(0, 0, 0, 0.1)',
            ];
        }

        public static function generate() {
            // Fetch the button designer options from the database, merging with defaults
            $options = array_merge(
                self::defaults(),
                get_option('eventive_button_designer_options', [])
            );
            $background_color = $options['button_background_color'] ?? '#000000';
            $hover_color = $options['button_hover_color'] ?? '#ff4081';
            $font_family = $options['button_font'] ?? 'Lato, sans-serif';
            $text_color = $options['button_text_color'] ?? '#ffffff';
            $border_color = $options['button_border_color'] ?? '#000000';
            $border_width = $options['button_border_width'] ?? '1';
            $border_style = $options['button_border_style'] ?? 'solid';
            $border_radius = $options['button_border_radius'] ?? '4';
            $box_shadow = $options['button_box_shadow'] ?? '0px 4px 6px rgba(0, 0, 0, 0.1)';

            // Output the dynamic CSS
            echo "<style>
                 .eventive-button{
        background-color: $background_color !important;
                  border: {$border_width}px {$border_style} {$border_color} !important;
            border-radius: {$border_radius}px !important;
            box-shadow: {$box_shadow} !important;
            padding: 0 !important;
             display: inline-block !important;
        }

        .eventive-button:hover{
        background-color: $hover_color !important;
                  border: {$border_width}px {$border_style} {$border_color} !important;
            border-radius: {$border_radius}px !important;
            box-shadow: {$box_shadow} !important;
            padding: 0 !important;
        }

        .eventive-button span{
        color: $text_color !important;
    }

        .eventive__ticket-button__container button div div {
            background-color: $background_color !important;
            color: $text_color !important;
              display: inline-block !important;
    }

    .eventive__ticket-button__button, .eventive__universal_ticket-button__button{
    background-color: $background_color !important;
    display: inline-block !important;
          
    }



        /* Default button styling */
        .eventive__ticket-button__container button {
            background-color: $background_color !important;
            font-family: $font_family !important;
            color: $text_color !important;
            transition: background-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease !important;
            // border-radius: 4px !important; /* Optional for better aesthetics */
             display: inline-block !important;
          
        }
    
        /* Hover state */
        .eventive__ticket-button__container button:hover {
            background-color: $hover_color !important;
            transform: translateY(-3px) !important; /* Lift effect */
            box-shadow: 0 8px 12px rgba(0, 0, 0, 0.3) !important; /* Add shadow on hover */
            color: $text_color !important;
               display: inline-block !important;
            
        }

        .eventive__ticket-button__container button div:hover {
            background-color: $hover_color !important;
            color: $text_color !important;
    }
    
        /* Active state */
        .eventive__ticket-button__container button:active {
            transform: translateY(1px) !important; /* Slight press effect */
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important; /* Reduced shadow on click */
            color: $text_color !important;
        }
    
        /* Focus state for accessibility */
        .eventive__ticket-button__container button:focus {
            outline: 2px dashed $hover_color !important; /* Highlight for accessibility */
            outline-offset: 4px !important;
            color: $text_color !important;
        }
            </style>";
        }
    }
}
?>