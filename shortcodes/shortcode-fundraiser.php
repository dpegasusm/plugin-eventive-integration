<?php
function eventive_fundraiser($atts) {
            // Enqueue the CSS for the eventive-fundraiser
            wp_enqueue_style(
                'eventive-fundraiser-style',
                plugin_dir_url(__FILE__) . '../css/eventive-fundraiser.css',
                array(),
                '1.0.0'
            );
    // Parse shortcode attributes with default values
    $atts = shortcode_atts(
        [
            'start_time' => '', // Format: YYYY-MM-DD
            'end_time' => '',   // Format: YYYY-MM-DD
            'goal_amount' => 1000 // Default goal amount in dollars
        ],
        $atts
    );


    // Validate and sanitize inputs
    $start_date = sanitize_text_field($atts['start_time']);
    $end_date = sanitize_text_field($atts['end_time']);
    $goal_amount = floatval($atts['goal_amount']);

    if (empty($start_date) || empty($end_date)) {
        return '<p>Error: Start and end dates are required.</p>';
    }
    // Inline JavaScript for Eventive API integration
    ob_start(); ?>
    <div id="eventive-donations-container">
        <p>Loading fundraiser progress...</p>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // Pass start and end dates directly
            const startDate = '<?php echo esc_js($start_date); ?>';
            const endDate = '<?php echo esc_js($end_date); ?>';
            const goalAmount = <?php echo esc_js($goal_amount); ?>;

            // Construct API call
            const apiUrl = `/wp-json/eventive/v1/donations?start_time=${encodeURIComponent(startDate)}&end_time=${encodeURIComponent(endDate)}&type=PAYMENT`;

            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    const donationsContainer = document.getElementById('eventive-donations-container');
                    let totalDonations = 0;

                    // Process donations
                    if (data && Array.isArray(data.transactions)) {
                        data.transactions.forEach(transaction => {
                            if (transaction.category?.ref_label === 'Donation') {
                                totalDonations += parseFloat(transaction.gross) / 100;
                            }
                        });
                    }

                    const progressPercent = Math.min((totalDonations / goalAmount) * 100, 100).toFixed(2);
                    donationsContainer.innerHTML = `
                        <div>
                            <h3>Fundraiser Progress</h3>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="--progress-percent: ${progressPercent}%; width: ${progressPercent}%;"></div>
                            </div>
                            <p>$${totalDonations.toFixed(2)} of $${goalAmount.toFixed(2)} raised (${progressPercent}%)</p>
                        </div>
                    `;
                })
                .catch(error => {
                    document.getElementById('eventive-donations-container').innerHTML = `<p>Error fetching donations: ${error.message}</p>`;
                });
        });
    </script>
    <?php
    return ob_get_clean(); // Return the buffered content
}

add_shortcode('eventive-fundraiser', 'eventive_fundraiser');