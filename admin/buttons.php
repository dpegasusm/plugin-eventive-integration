<?php
require_once 'includes/ButtonDesigner.php';
require_once 'includes/ButtonDesignerSettings.php';
require_once 'includes/ButtonDesignerPreview.php';
require_once 'includes/ButtonDesignerCSS.php';

// Ensure the class is instantiated only once
if (!class_exists('Eventive_Buttons')) {
    new Eventive_Buttons();
}
?>