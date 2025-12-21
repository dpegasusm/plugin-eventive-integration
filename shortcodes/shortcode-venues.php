<?php
// Shortcode: Eventive Venues
function eventive_venues($atts) {
    $eventive_admin_options_options = get_option('eventive_admin_options_option_name');
    $your_eventive_public_api_0 = $eventive_admin_options_options['your_eventive_public_api_0']; // Your Eventive Public API
    $your_eventive_event_bucket_1 = $eventive_admin_options_options['your_eventive_event_bucket_1']; // Your Eventive Event Bucket
    $your_eventive_secret_key_2 = $eventive_admin_options_options['your_eventive_secret_key_2']; // Your Eventive Secret API Key
    
    // Inline JavaScript for Eventive API integration
    ob_start(); ?>
    <div id="eventive-venues-container">
        <p>Loading venues...</p>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            if (window.Eventive) {
                window.Eventive.on('ready', function () {
                    const apiPath = `event_buckets/<?php echo esc_js($your_eventive_event_bucket_1); ?>/venues`;
                    const headers = { 'x-api-key': '<?php echo esc_js($your_eventive_secret_key_2); ?>' };

                    window.Eventive.request({
                        method: 'GET',
                        path: apiPath,
                        headers: headers
                    }).then(response => {
                        console.log('Venues response:', response);
                        const venuesContainer = document.getElementById('eventive-venues-container');
                        let venuesHTML = '';

                        if (response && Array.isArray(response.venues)) {
                            response.venues.forEach(venue => {
                                venuesHTML += `
                                    <div style="display: flex; border: 1px solid grey; padding: 2%; margin: 15px auto;">
                                        <div style="flex-grow: 6;">
                                            <p><strong>${venue.name}</strong><br />
                                            ${venue.label || ''}<br />
                                            Capacity: ${venue.default_capacity || 'N/A'}<br />
                                            ${venue.description || ''}<br />
                                            Street Address:<br />${venue.address || 'N/A'}</p>
                                        </div>
                                        ${venue.seatmap_preview_image ? `
                                            <div>
                                                <img src="${venue.seatmap_preview_image}" alt="${venue.name} seatmap" />
                                            </div>` : ''}
                                    </div>
                                `;
                            });
                        } else {
                            venuesHTML = '<p>No venues found.</p>';
                        }

                        venuesContainer.innerHTML = venuesHTML;
                    }).catch(error => {
                        console.error('Error fetching venues:', error);
                        document.getElementById('eventive-venues-container').innerHTML = `<p>Error fetching venues: ${error.message}</p>`;
                    });
                });
            } else {
                console.error('Eventive API is not initialized.');
                document.getElementById('eventive-venues-container').innerHTML = '<p>Error: Eventive API not initialized.</p>';
            }
        });
    </script>
    <?php
    return ob_get_clean();
}

add_shortcode('eventive-venues', 'eventive_venues');