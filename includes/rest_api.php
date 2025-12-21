<?php

// ====================================================
// REST API ENDPOINTS FOR EVENTIVE_WP PLUGIN
// ====================================================
//
// This file registers custom REST API endpoints for the Eventive_WP plugin.
// Endpoints include:
//   - GET /eventive/v1/donations: Fetches donation transactions from Eventive API.
//   - POST /eventive/v1/person/{person_id}: Updates a person's details in Eventive.
//
// Each endpoint handles authentication, parameter validation, and error handling.
// ====================================================

add_action('rest_api_init', function () {
    register_rest_route('eventive/v1', '/donations', [
        'methods'             => 'GET',
        'callback'            => 'fetch_eventive_donations',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('eventive/v1', '/person/(?P<person_id>[a-zA-Z0-9]+)', [
        'methods'             => 'POST',
        'callback'            => 'eventive_update_person_details',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('eventive/v1', '/passes/(?P<pass_id>[a-zA-Z0-9]+)', [
        'methods'             => 'POST',
        'callback'            => 'eventive_update_pass_details',
        'permission_callback' => '__return_true',
    ]);
});

/**
 * Fetch Eventive Donations
 * 
 * Endpoint: GET /eventive/v1/donations
 * 
 * Expects 'start_time' and 'end_time' (YYYY-MM-DD) as query parameters.
 * Returns donation transactions from the Eventive API within the given date range.
 */
function fetch_eventive_donations(WP_REST_Request $request) {
    $start_time = sanitize_text_field($request->get_param('start_time'));
    $end_time = sanitize_text_field($request->get_param('end_time'));

    if (empty($start_time) || empty($end_time)) {
        return new WP_Error('missing_params', 'Start and end times are required.', ['status' => 400]);
    }

    $start_time_iso = $start_time . 'T00:00:00.000Z';
    $end_time_iso = $end_time . 'T23:59:59.999Z';
    $options = get_option('eventive_admin_options_option_name');
    $api_key = $options['your_eventive_secret_key_2'] ?? '';

    if (!$api_key) return new WP_Error('missing_api_key', 'API key is not configured.', ['status' => 500]);

    $response = wp_remote_get("https://api.eventive.org/ledger/transactions?expand=person&date=" . urlencode(json_encode(['$gt' => $start_time_iso, '$lt' => $end_time_iso])), [
        'headers' => ['x-api-key' => $api_key],
    ]);

    if (is_wp_error($response)) return new WP_Error('api_error', 'Failed to fetch donations.', ['status' => 500]);

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (json_last_error() !== JSON_ERROR_NONE) return new WP_Error('json_error', 'Invalid JSON response.', ['status' => 500]);

    return rest_ensure_response($data);
}

/**
 * Update Eventive Person Details
 * 
 * Endpoint: POST /eventive/v1/person/{person_id}
 * 
 * Expects a JSON payload with fields to update for the specified person.
 * Merges existing person details with the new data and updates via the Eventive API.
 */
function eventive_update_person_details(WP_REST_Request $request) {
    $params = $request->get_json_params();

    $person_id = sanitize_text_field($request->get_param('person_id'));

    if (!$person_id || empty($params)) {
        return new WP_Error('missing_params', 'Missing person_id or update payload.', ['status' => 400]);
    }

    error_log("📬 Updating person ID: $person_id");
    error_log("📦 Update payload: " . json_encode($params));

    $options = get_option('eventive_admin_options_option_name');
    $api_key = $options['your_eventive_secret_key_2'] ?? '';

    if (!$api_key) {
        return new WP_Error('missing_api_key', 'API key is not configured.', ['status' => 500]);
    }

    // Fetch existing person details
    $response_existing = wp_remote_get("https://api.eventive.org/people/{$person_id}", [
        'headers' => [
            'x-api-key' => $api_key,
        ],
    ]);

    if (is_wp_error($response_existing)) {
        error_log("❌ Failed to fetch existing details: " . $response_existing->get_error_message());
        return new WP_Error('api_error', $response_existing->get_error_message(), ['status' => 500]);
    }

    $existing_body = wp_remote_retrieve_body($response_existing);
    $existing_data = json_decode($existing_body, true);
    $existing_details = $existing_data ?? [];

    // Merge existing details with new params
    $merged_fields = array_merge($existing_details, $params);

    error_log("📤 Sent to Eventive: " . json_encode($merged_fields));

    // Update person details via Eventive API
    $response = wp_remote_post("https://api.eventive.org/people/{$person_id}", [
        'headers' => [
            'Content-Type'  => 'application/json',
            'x-api-key'     => $api_key,
        ],
        'body' => json_encode($merged_fields)
    ]);

    if (is_wp_error($response)) {
        error_log("❌ WP Error: " . $response->get_error_message());
        return new WP_Error('api_error', $response->get_error_message(), ['status' => 500]);
    }

    $body_raw = wp_remote_retrieve_body($response);
    error_log("📥 Raw API Response: $body_raw");

    $body = json_decode($body_raw, true);
    return rest_ensure_response($body);
}
/**
 * Update Eventive Pass Details
 * 
 * Endpoint: POST /eventive/v1/passes/{pass_id}
 * 
 * Expects a JSON payload with fields to update for the specified pass.
 * Merges existing pass details with the new data and updates via the Eventive API.
 */
function eventive_update_pass_details(WP_REST_Request $request) {
    $params = $request->get_json_params();
    $pass_id = sanitize_text_field($request->get_param('pass_id'));

    if (!$pass_id || empty($params)) {
        return new WP_Error('missing_params', 'Missing pass_id or update payload.', ['status' => 400]);
    }

    error_log("📬 Updating pass ID: $pass_id");
    error_log("📦 Update payload: " . json_encode($params));

    $options = get_option('eventive_admin_options_option_name');
    $api_key = $options['your_eventive_secret_key_2'] ?? '';

    if (!$api_key) {
        return new WP_Error('missing_api_key', 'API key is not configured.', ['status' => 500]);
    }

    // Fetch existing pass details
    $response_existing = wp_remote_get("https://api.eventive.org/passes/{$pass_id}", [
        'headers' => [
            'x-api-key' => $api_key,
        ],
    ]);

    if (is_wp_error($response_existing)) {
        error_log("❌ Failed to fetch existing pass details: " . $response_existing->get_error_message());
        return new WP_Error('api_error', $response_existing->get_error_message(), ['status' => 500]);
    }

    $existing_body = wp_remote_retrieve_body($response_existing);
    $existing_data = json_decode($existing_body, true);
    $existing_details = $existing_data ?? [];

    // Merge existing details with new params
    $merged_fields = array_merge($existing_details, $params);

    // Prevent updating the pass_bucket
    unset($merged_fields['pass_bucket']);

    error_log("📤 Sent to Eventive: " . json_encode($merged_fields));

    // Ensure supplementary_data is only sent if it's not null/empty
    if (isset($merged_fields['supplementary_data'])) {
        if (is_array($merged_fields['supplementary_data']) && empty($merged_fields['supplementary_data'])) {
            unset($merged_fields['supplementary_data']);
        } elseif (is_array($merged_fields['supplementary_data'])) {
            $merged_fields['supplementary_data'] = json_encode($merged_fields['supplementary_data']);
        }
    }

    // Update pass details via Eventive API (using JSON body)
    $response = wp_remote_post("https://api.eventive.org/passes/{$pass_id}", [
        'headers' => [
            'Content-Type'  => 'application/json',
            'x-api-key'     => $api_key,
        ],
        'body' => json_encode($merged_fields)
    ]);

    if (is_wp_error($response)) {
        error_log("❌ WP Error: " . $response->get_error_message());
        return new WP_Error('api_error', $response->get_error_message(), ['status' => 500]);
    }

    $body_raw = wp_remote_retrieve_body($response);
    error_log("📥 Raw API Response: $body_raw");

    $body = json_decode($body_raw, true);
    return rest_ensure_response($body);
}