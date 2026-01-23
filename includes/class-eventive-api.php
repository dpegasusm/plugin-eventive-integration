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
 * Eventive_API Class
 */
class Eventive_API {
	/**
	 * Base URL for the API.
	 *
	 * @access public
	 * @var string
	 */
	public $api_url_base = 'https://api.eventive.org/';

	/**
	 * The cache duration for search results.
	 *
	 * @var int $api_cache_duration
	 */
	private $api_cache_duration = 3600; // 1 hour.

	/**
	 * The App API Public Key in memory.
	 *
	 * @var int $api_public_key
	 */
	private $api_public_key = '';

	/**
	 * The App API Secret Key in memory.
	 *
	 * @var int $api_secret_key
	 */
	private $api_secret_key = '';

	/**
	 * The api bucket ID in memory.
	 *
	 * @var int $api_default_bucket_id
	 */
	private $api_default_bucket_id = 0;

	/**
	 * Endpoint for event buckets.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_event_buckets = 'event_buckets';

	/**
	 * Endpoint for event bucket variable endpoints.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_event_bucket_endpoints = array(
		'tags',
		'active',
		'venues',
	);

	/**
	 * Endpoint for event tag buckets.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_event_bucket_tags = array(
		'events',
		'films',
	);

	/**
	 * Endpoint for event bucket addons.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_ticket_addons = array(
		'transfer-history',
	);

	/**
	 * Endpoint for events.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_events = 'events';

	/**
	 * Endpoint for films.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_films = 'films';

	/**
	 * Endpoint for item buckets.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_item_buckets = 'item_buckets';

	/**
	 * Endpoint for items.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_items = 'items';

	/**
	 * Endpoint for ledger.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_ledger = 'ledger';

	/**
	 * Endpoint for order.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_order = 'order';

	/**
	 * Endpoint for getting organization control details.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_passes = 'passes';

	/**
	 * Endpoint for people.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_people = 'people';

	/**
	 * Endpoint for tags.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_tags = 'tags';

	/**
	 * Endpoint for tickets.
	 *
	 * @access private
	 * @var string
	 */
	private $api_endpoint_tickets = 'tickets';

	/**
	 * Init Class.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Register our custom API endpoints.
		add_action( 'rest_api_init', array( $this, 'eventive_set_api_endpoints' ) );

		// Instantiate the base URL for the API.
		$this->api_url_base = apply_filters( 'eventive_api_url_base', esc_url_raw( $this->api_url_base ) );

		// Cache Duration.
		$this->api_cache_duration = apply_filters( 'eventive_api_cache_duration', 3600 ); // 1 hour

		// Get the required Query Args for the API from the options.
		$this->api_public_key        = get_option( 'eventive_public_key', '' );
		$this->api_secret_key        = get_option( 'eventive_secret_key', '' );
		$this->api_default_bucket_id = get_option( 'eventive_default_bucket_id', '' );

		// Set the API endpoints with the mandatory query args.
		$this->api_endpoint_event_buckets = apply_filters( 'api_endpoint_event_buckets', esc_attr( $this->api_endpoint_event_buckets ) );
		$this->api_endpoint_events        = apply_filters( 'api_endpoint_events', esc_attr( $this->api_endpoint_events ) );
		$this->api_endpoint_films         = apply_filters( 'api_endpoint_films', esc_attr( $this->api_endpoint_films ) );
		$this->api_endpoint_item_buckets  = apply_filters( 'api_endpoint_item_buckets', esc_attr( $this->api_endpoint_item_buckets ) );
		$this->api_endpoint_items         = apply_filters( 'api_endpoint_items', esc_attr( $this->api_endpoint_items ) );
		$this->api_endpoint_ledger        = apply_filters( 'api_endpoint_ledger', esc_attr( $this->api_endpoint_ledger ) );
		$this->api_endpoint_order         = apply_filters( 'api_endpoint_order', esc_attr( $this->api_endpoint_order ) );
		$this->api_endpoint_passes        = apply_filters( 'api_endpoint_passes', esc_attr( $this->api_endpoint_passes ) );
		$this->api_endpoint_people        = apply_filters( 'api_endpoint_people', esc_attr( $this->api_endpoint_people ) );
		$this->api_endpoint_tags          = apply_filters( 'api_endpoint_tags', esc_attr( $this->api_endpoint_tags ) );
		$this->api_endpoint_tickets       = apply_filters( 'api_endpoint_tickets', esc_attr( $this->api_endpoint_tickets ) );
	}

	/**
	 * Get the API base endpoint.
	 * Helper function to get the API base endpoint.
	 *
	 * @access public
	 * @return string The API base endpoint URL.
	 */
	public function get_api_base() {
		return $this->api_url_base;
	}

	/**
	 * Get the API secret key.
	 * Helper function to get the API secret key.
	 *
	 * @access public
	 * @return string The API secret key.
	 */
	public function get_api_public_key() {
		return $this->api_public_key;
	}

	/**
	 * Get the API bucket ID.
	 * Helper function to get the API bucket ID.
	 *
	 * @access public
	 * @return string The API bucket ID.
	 */
	public function get_api_default_bucket_id() {
		return $this->api_default_bucket_id;
	}

	/**
	 * Get the API endpoints in an array.
	 *
	 * @access public
	 * @return array The API endpoints.
	 */
	public function get_api_endpoints() {
		return array(
			'event_buckets' => $this->api_endpoint_event_buckets,
			'events'        => $this->api_endpoint_events,
			'films'         => $this->api_endpoint_films,
			'item_buckets'  => $this->api_endpoint_item_buckets,
			'items'         => $this->api_endpoint_items,
			'ledger'        => $this->api_endpoint_ledger,
			'order'         => $this->api_endpoint_order,
			'passes'        => $this->api_endpoint_passes,
			'people'        => $this->api_endpoint_people,
			'tags'          => $this->api_endpoint_tags,
			'tickets'       => $this->api_endpoint_tickets,
		);
	}

	/**
	 * Return the localization data all in one place.
	 *
	 * @access public
	 * @return array The localization data.
	 */
	public function get_api_localization_data() {
		return array(
			'apiBase'       => $this->get_api_base(),
			'apiKey'        => $this->get_api_public_key(),
			'apiEndpoints'  => $this->get_api_endpoints(),
			'defaultBucket' => $this->get_api_default_bucket_id(),
			'eventBucket'   => $this->get_api_default_bucket_id(),
			'restUrl'       => esc_url_raw( rest_url( 'eventive/v1' ) ),
			'eventNonce'    => wp_create_nonce( 'eventive_api_nonce' ),
		);
	}

	/**
	 * Set the API endpoints.
	 *
	 * @access public
	 * @return void
	 */
	public function eventive_set_api_endpoints() {
		// Get our event Buckets.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_event_buckets,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_event_buckets' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'bucket_id' => array(
						'default'           => '',
						'sanitize_callback' => array( $this, 'sanitize_eventive_id' ),
						'validate_callback' => array( $this, 'validate_eventive_id' ),
					),
					'tag_id'    => array(
						'default'           => '',
						'sanitize_callback' => array( $this, 'sanitize_eventive_id' ),
						'validate_callback' => array( $this, 'validate_eventive_id' ),
					),
					'endpoint'  => array(
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( $this, 'validate_event_bucket_endpoint' ),
					),
					'tag_point' => array(
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( $this, 'validate_event_bucket_tag_point' ),
					),
				),
			)
		);

		// Charts rest route.
		register_rest_route(
			'eventive/v1',
			'/charts',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_charts' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'event_bucket' => array(
						'required'          => true,
						'default'           => '',
						'sanitize_callback' => array( $this, 'sanitize_eventive_id' ),
						'validate_callback' => array( $this, 'validate_eventive_id' ),
					),
				),
			)
		);

		// Events Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_events,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_events' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'event_id' => array(
						'default'           => '',
						'sanitize_callback' => array( $this, 'sanitize_eventive_id' ),
						'validate_callback' => array( $this, 'validate_eventive_id' ),
					),
				),
			)
		);

		// Films Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_films,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_films' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'film_id' => array(
						'default'           => '',
						'sanitize_callback' => array( $this, 'sanitize_eventive_id' ),
						'validate_callback' => array( $this, 'validate_eventive_id' ),
					),
				),
			)
		);

		// Item Buckets Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_item_buckets,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_item_buckets' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'item_bucket_id' => array(
						'default'           => '',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
				),
			)
		);

		// Items Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_items,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_items' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'item_id' => array(
						'default'           => '',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
				),
			)
		);

		// Ledger Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_ledger,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_ledger' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'start' => array(
						'required'          => true,
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'end'   => array(
						'required'          => true,
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'type'  => array(
						'required'          => true,
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// Order Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_order,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_order' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'order_id' => array(
						'default'           => '',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
				),
			)
		);

		// Passes Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_passes,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_passes' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'pass_id' => array(
						'default'           => '',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
				),
			)
		);

		// People Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_people,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_people' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'person_id' => array(
						'required'          => true,
						'default'           => '',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
				),
			)
		);

		// Tags Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_tags,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_tags' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'tag_id' => array(
						'default'           => '',
						'sanitize_callback' => array( $this, 'sanitize_eventive_id' ),
						'validate_callback' => array( $this, 'validate_eventive_id' ),
					),
				),
			)
		);

		// Tickets Rest Route.
		register_rest_route(
			'eventive/v1',
			'/' . $this->api_endpoint_tickets,
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_api_tickets' ),
				'permission_callback' => array( $this, 'check_api_nonce' ),
				'args'                => array(
					'ticket_id' => array(
						'default'           => '',
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
					'endpoint'  => array(
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( $this, 'validate_ticket_endpoint' ),
					),
				),
			)
		);
	}

	/**
	 * Check that this is a valid request via the nonce check parameter.
	 *
	 * @since 1.0.0
	 * @param WP_REST_Request $request The request object.
	 *
	 * @return bool True if valid, false otherwise.
	 */
	public function check_api_nonce( $request ) {
		// While we develop and check make these readable.
		$nonce = $request->get_param( 'eventive_nonce' );
		if ( $nonce && wp_verify_nonce( $nonce, 'eventive_api_nonce' ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Sanitize the Eventive ID parameter.
	 *
	 * @param string $param The Eventive ID parameter to sanitize.
	 * @return string The sanitized Eventive ID.
	 */
	public function sanitize_eventive_id( $param ) {
		// Empty is ok.
		if ( empty( $param ) ) {
			return '';
		}

		// Sanitize to lowercase letters and numbers only.
		return preg_replace( '/[^a-z0-9]/', '', $param );
	}

	/**
	 * Validate the Eventive ID parameter.
	 *
	 * @param string $param The Eventive ID parameter to validate.
	 * @return bool True if valid, false otherwise.
	 */
	public function validate_eventive_id( $param ) {
		// Empty is ok.
		if ( empty( $param ) ) {
			return true;
		}

		// Check if the parameter contains only lowercase letters and numbers.
		if ( preg_match( '/^[a-z0-9]+$/', $param ) ) {
			return true;
		}

		// Invalid Eventive ID.
		return false;
	}

	/**
	 * Validate the endpoint parameter for event buckets.
	 *
	 * @param string $param The event bucket endpoint parameter to validate.
	 * @return bool True if valid, false otherwise.
	 */
	public function validate_event_bucket_endpoint( $param ) {
		// Empty is ok.
		if ( empty( $param ) ) {
			return true;
		}

		// Get the valid endpoints.
		$valid_endpoints = $this->api_endpoint_event_bucket_endpoints;

		// Check if the parameter is valid against the keys in the valid array.
		if ( in_array( $param, $valid_endpoints, true ) ) {
			return true;
		}

		// Invalid endpoint.
		return false;
	}

	/**
	 * Validate the tag_point parameter for event buckets.
	 *
	 * @param string $param The tag_point parameter to validate.
	 * @return bool True if valid, false otherwise.
	 */
	public function validate_event_bucket_tag_point( $param ) {
		// Empty is ok.
		if ( empty( $param ) ) {
			return true;
		}

		// Get the valid tag points.
		$valid_tag_points = $this->api_endpoint_event_bucket_tags;

		// Check if the parameter is valid against the keys in the valid array.
		if ( in_array( $param, $valid_tag_points, true ) ) {
			return true;
		}

		// Invalid tag point.
		return false;
	}

	/**
	 * Validate the endpoint parameter for tickets.
	 *
	 * @access public
	 * @param string $param The ticket endpoint parameter to validate.
	 * @return bool True if valid, false otherwise.
	 */
	public function validate_ticket_endpoint( $param ) {
		// Empty is ok.
		if ( empty( $param ) ) {
			return true;
		}

		// Get the valid endpoints.
		$valid_endpoints = $this->api_endpoint_ticket_addons;

		// Check if the parameter is valid against the keys in the valid array.
		if ( in_array( $param, $valid_endpoints, true ) ) {
			return true;
		}

		// Invalid endpoint.
		return false;
	}

	/**
	 * Make an API call to the specified endpoint.
	 *
	 * @param string $api_url       The API endpoint to call.
	 * @param string $response_body Optional. The response body to send with the request.
	 * @param array  $args          Optional. Arguments for the API call.
	 * @param bool   $secret        Optional. Whether to use the secret API key. Default false.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function eventive_make_api_call( $api_url, $response_body = '', $args = array(), $secret = false ) {
		// Set the default arguments for the API call.
		$default_args = array(
			'method'      => 'GET',
			'headers'     => array(
				'Content-Type' => 'application/json',
				'Accept'       => 'application/json',
			),
			'timeout'     => 15,
			'data_format' => 'body',
		);

		// Merge the default arguments with the provided arguments.
		$args = wp_parse_args( $args, $default_args );

		// Add the API Key to the headers, use secret if specified.
		$args['headers']['x-api-key'] = $secret ? $this->api_secret_key : $this->api_public_key;

		// Set the request body.
		if ( ! empty( $response_body ) ) {
			$args['body'] = $response_body;
		}

		// Create a cache key based on the endpoint and uid.
		$cache_key = 'eventive_api_' . md5( $api_url . wp_json_encode( $args ) );

		// Check if we have cached data for GET requests.
		if ( 'GET' === $args['method'] ) {
			$cached_data = get_transient( $cache_key );
			if ( false !== $cached_data ) {
				return new WP_REST_Response( $cached_data, 200 );
			}
		}

		// Validate the API URL.
		if ( ! wp_http_validate_url( $api_url ) ) {
			return new WP_Error(
				'invalid_api_url',
				'Invalid API URL.',
				array(
					'status' => 400,
				)
			);
		}

		// Make the API request.
		$response = wp_remote_request( $api_url, $args );

		// Check for errors in the API response.
		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'api_request_failed',
				'Failed to fetch data from the API: ' . $response->get_error_message(),
				array(
					'status' => 400,
				)
			);
		}

		// If we got back a non-200 response, return an error.
		$response_code = wp_remote_retrieve_response_code( $response );

		// Check for non-200 response codes.
		if ( 200 !== $response_code ) {
			return new WP_Error(
				'api_request_failed',
				'API request returned an error. Response code: ' . $response_code,
				array(
					'status' => $response_code,
				)
			);
		}

		// Parse the API response body.
		$response_body = wp_remote_retrieve_body( $response );
		$data          = json_decode( $response_body, true );

		// Cache the successful response for GET requests.
		if ( 'GET' === $args['method'] ) {
			set_transient( $cache_key, $data, $this->api_cache_duration );
		}

		// Return the Response as a WP_REST_Response.
		return new WP_REST_Response( $data, 200 );
	}

	/**
	 * Get API Buckets
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_event_buckets( $request ) {
		// Prepare the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_event_buckets;

		// get the parameters.
		$bucket_id = $request->get_param( 'bucket_id' );
		$tag_id    = $request->get_param( 'tag_id' );
		$endpoint  = $request->get_param( 'endpoint' );
		$tag_point = $request->get_param( 'tag_point' );

		// if this is a bucket refresh set the flag.
		$bucket_refresh = false;

		// Modify the endpoint based on parameters.
		switch ( $endpoint ) {
			case 'tags':
				if ( ! empty( $tag_id ) ) {
					$api_url .= '/tags/' . sanitize_text_field( $tag_id ) . '/' . sanitize_text_field( $tag_point );
				}
				break;
			case 'active':
				$api_url = $api_url . '/active';
				break;
			case 'venues':
				// Use default bucket if none provided.
				if ( empty( $bucket_id ) ) {
					$bucket_id = $this->api_default_bucket_id;
				}
				$api_url .= '/' . sanitize_text_field( $bucket_id ) . '/venues';
				break;
			default:
				// if the bucket is set use it.
				if ( ! empty( $bucket_id ) && is_string( $bucket_id ) && strlen( $bucket_id ) > 0 ) {
					$api_url .= '/' . sanitize_text_field( $bucket_id );
				} else {
					$bucket_refresh = true;
				}
				break;
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();
		$use_secret    = ( 'venues' === $endpoint ) ? true : false; // Venues require secret key.

		// Make the call.
		$bucket_response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args, $use_secret );

		// If this was a bucket refresh, update the buckets list.
		if ( $bucket_refresh && ! is_wp_error( $bucket_response ) ) {
			update_option( 'eventive_buckets_list', $bucket_response->get_data() );
		}

		// Make the API call.
		return $bucket_response;
	}

	/**
	 * Get API Charts
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_charts( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . 'charts/overview';

		// get the parameters.
		$bucket_id = $request->get_param( 'event_bucket' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $bucket_id ) && is_string( $bucket_id ) && strlen( $bucket_id ) > 0 ) {
			$api_url .= '?event_bucket=' . sanitize_text_field( $bucket_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args, true );
	}

	/**
	 * Get API Events
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_events( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_events;

		// get the parameters.
		$event_id = $request->get_param( 'event_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $event_id ) && is_int( $event_id ) && absint( $event_id ) > 0 ) {
			$api_url .= '/' . absint( $event_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args, true );
	}

	/**
	 * Get API Films
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_films( $request ) {
		// Fetch all films.
		$api_url = $this->api_url_base . $this->api_endpoint_films;

		// Get the parameters.
		$film_id = $request->get_param( 'film_id' );

		// Build the endpoint URL based on parameters.
		if ( ! empty( $film_id ) && is_string( $film_id ) && strlen( $film_id ) > 0 ) {
			// Fetch a specific film by ID.
			$api_url .= '/' . sanitize_text_field( $film_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args, true );
	}

	/**
	 * Get API Item Buckets
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_item_buckets( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_item_buckets;

		// Get the parameters.
		$item_bucket_id = $request->get_param( 'item_bucket_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $item_bucket_id ) && is_string( $item_bucket_id ) && strlen( $item_bucket_id ) > 0 ) {
			$api_url .= '/' . sanitize_text_field( $item_bucket_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
	}

	/**
	 * Get API Items
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_items( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_items;

		// Get the parameters.
		$item_id = $request->get_param( 'item_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $item_id ) && is_int( $item_id ) && absint( $item_id ) > 0 ) {
			$api_url .= '/' . absint( $item_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
	}

	/**
	 * Get API Ledger
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_ledger( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_ledger . '/transactions';

		// Get the parameters.
		$start = $request->get_param( 'start' );
		$end   = $request->get_param( 'end' );
		$type  = $request->get_param( 'type' );

		// Build query string.
		$query_params = array();
		if ( ! empty( $start ) ) {
			$query_params[] = 'start=' . rawurlencode( $start );
		}
		if ( ! empty( $end ) ) {
			$query_params[] = 'end=' . rawurlencode( $end );
		}
		if ( ! empty( $type ) ) {
			$query_params[] = 'type=' . rawurlencode( $type );
		}

		// Append query string if we have parameters.
		if ( ! empty( $query_params ) ) {
			$api_url .= '?' . implode( '&', $query_params );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call to get raw transaction data.
		$api_response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args, true );

		// Check if the API call was successful.
		if ( is_wp_error( $api_response ) ) {
			return $api_response;
		}

		// Get the raw data from the response.
		$raw_data = $api_response->get_data();

		// Aggregate donation statistics (non-sensitive data only).
		$aggregated_data = array(
			'total_donations' => 0,
			'donation_count'  => 0,
			'start_date'      => $start,
			'end_date'        => $end,
			'currency'        => 'USD',
		);

		// Process transactions to extract donation totals.
		if ( isset( $raw_data['transactions'] ) && is_array( $raw_data['transactions'] ) ) {
			foreach ( $raw_data['transactions'] as $transaction ) {
				// Check if this is a donation transaction.
				if ( isset( $transaction['category']['ref_label'] ) && 'Donation' === $transaction['category']['ref_label'] ) {
					// Aggregate the donation amount (convert from cents to dollars).
					if ( isset( $transaction['gross'] ) && is_numeric( $transaction['gross'] ) ) {
						$amount_in_dollars                   = floatval( $transaction['gross'] ) / 100;
						$aggregated_data['total_donations'] += $amount_in_dollars;
						++$aggregated_data['donation_count'];
					}
				}
			}
		}

		// Round total to 2 decimal places.
		$aggregated_data['total_donations'] = round( $aggregated_data['total_donations'], 2 );

		// Return only the aggregated, non-sensitive statistics.
		return new WP_REST_Response( $aggregated_data, 200 );
	}

	/**
	 * Get API Order
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_order( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_order;

		// Get the parameters.
		$order_id = $request->get_param( 'order_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $order_id ) && is_int( $order_id ) && absint( $order_id ) > 0 ) {
			$api_url .= '/' . absint( $order_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
	}

	/**
	 * Get API Passes
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_passes( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_passes;

		// Get the parameters.
		$pass_id = $request->get_param( 'pass_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $pass_id ) && is_int( $pass_id ) && absint( $pass_id ) > 0 ) {
			$api_url .= '/' . absint( $pass_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
	}

	/**
	 * Get API People
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_people( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_people;

		// Get the parameters.
		$person_id = $request->get_param( 'person_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $person_id ) && is_int( $person_id ) && absint( $person_id ) > 0 ) {
			$api_url .= '/' . absint( $person_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
	}

	/**
	 * Get API Tags
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_tags( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_tags;

		// Get the parameters.
		$tag_id = $request->get_param( 'tag_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $tag_id ) && is_string( $tag_id ) && strlen( $tag_id ) > 0 ) {
			$api_url .= '/' . sanitize_text_field( $tag_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args, true );
	}

	/**
	 * Get API Tickets
	 *
	 * @access public
	 * @param string $request The request object to extract our data from.
	 * @return WP_REST_Response|WP_Error The REST response or a WP_Error object on failure.
	 */
	public function get_api_tickets( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_tickets;

		// Get the parameters.
		$ticket_id = $request->get_param( 'ticket_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $ticket_id ) && is_int( $ticket_id ) && absint( $ticket_id ) > 0 ) {
			$api_url .= '/' . absint( $ticket_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		return $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
	}
}
