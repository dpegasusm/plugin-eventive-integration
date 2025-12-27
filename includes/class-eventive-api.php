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
	 * The App API Key in memory.
	 *
	 * @var int $api_secret_key
	 */
	private $api_secret_key = '';

	/**
	 * The api bucket ID in memory.
	 *
	 * @var int $api_bucket_id
	 */
	private $api_bucket_id = null;

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
		$this->api_secret_key = get_option( 'eventive_secret_key', '' );
		$this->api_bucket_id  = get_option( 'eventive_event_bucket_id', '' );

		// end here if we dont have an API key or bucket ID.
		if ( empty( $this->api_secret_key ) || empty( $this->api_bucket_id ) ) {
			return;
		}

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
		return rest_url( 'eventive/v1/' );
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
						'default'           => 0,
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
					),
					'tag_id'    => array(
						'default'           => 0,
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
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
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
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
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
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
						'sanitize_callback' => 'absint',
						'validate_callback' => function ( $param ) {
							return is_int( $param ) && $param >= 0;
						},
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
	 * Validate the endpoint parameter for event buckets.
	 *
	 * @param string $param The endpoint parameter to validate.
	 * @return bool True if valid, false otherwise.
	 */
	public function validate_event_bucket_endpoint( $param ) {
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
	 * @param string $param The endpoint parameter to validate.
	 * @return bool True if valid, false otherwise.
	 */
	public function validate_ticket_endpoint( $param ) {
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
	 * @param string $endpoint      The API endpoint to call.
	 * @param string $response_body Optional. The response body to send with the request.
	 * @param array  $args          Optional. Arguments for the API call.
	 * @return array|WP_Error The response from the API or a WP_Error object on failure.
	 */
	public function eventive_make_api_call( $api_url, $response_body = '', $args = array() ) {
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

		// Set the request body.
		if ( ! empty( $response_body ) ) {
			$args['body'] = $response_body;
		}

		// Create a cache key based on the endpoint and uid.
		$cache_key = 'eventive_api_' . md5( $api_url . wp_json_encode( $args ) );

		// Check if we have cached data for GET requests.
		if ( 'GET' === $args['method'] && ! empty( $uid ) ) {
			$cached_data = get_transient( $cache_key );
			if ( false !== $cached_data ) {
				return $cached_data;
			}
		}

		// Validate the API URL.
		if ( ! wp_http_validate_url( $api_url ) ) {
			wp_send_json_error(
				array(
					'level'   => 'Error',
					'code'    => 0010,
					'message' => 'Invalid API URL.',
				),
				400
			);
			wp_die();
		}

		// Make the API request.
		$response = wp_remote_request( $api_url, $args );

		// Check for errors in the API response.
		if ( is_wp_error( $response ) ) {
			wp_send_json_error(
				array(
					'level'   => 'Error',
					'code'    => 0020,
					'message' => 'Failed to fetch data from the API.',
				),
				400
			);
			wp_die();
		}

		// Parse the API response body.
		$response_body = wp_remote_retrieve_body( $response );
		$data          = json_decode( $response_body, true );

		// If we get a code in the response, we should assume an error and process it as such.
		// Don't show the user the error code, but log it for debugging.
		if ( isset( $data['Code'] ) && ! empty( $data['Code'] ) ) {
			if ( 1050 === $data['Code'] ) {
				// This is an invlid cart. We need to pass this back and clear it.
				// This is a special case where we need to clear the cart and return an error.
				return $data;
			}

			// Log the error code for debugging.
			error_log( 'API Call: ' . $api_url ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( 'API Error Code: ' . $data['Code'] . ' :: ' . $data['Message'] ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log

			// Send a JSON error response.
			wp_send_json_error(
				array(
					'level'   => 'Error',
					'code'    => 'Error Code: ' . $data['Code'],
					'message' => 'An error occured while processing your request: ' . $data['Message'],
				),
				400
			);
			wp_die();
		}

		// Cache the successful response for GET requests.
		if ( 'GET' === $args['method'] ) {
			set_transient( $cache_key, $data, $this->api_cache_duration );
		}

		// Return the Response body as decoded JSON.
		return $data;
	}

	/**
	 * Get API Buckets
	 *
	 * @access public
	 * @return void
	 */
	public function get_api_event_buckets( $request ) {
		// Prepare the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_event_buckets;

		// get the parameters.
		$bucket_id = $request->get_param( 'bucket_id' );
		$tag_id    = $request->get_param( 'tag_id' );
		$endpoint  = $request->get_param( 'endpoint' );
		$tag_point = $request->get_param( 'tag_point' );

		// Modify the endpoint based on parameters.
		switch ( $endpoint ) {
			case 'tags':
				if ( ! empty( $tag_id ) ) {
					$api_url .= '/tags/' . absint( $tag_id ) . '/' . $tag_point;
				}
				break;
			case 'active':
				$api_url = $api_url . '/active';
				break;
			default:
				// if the bucket is set use it.
				if ( ! empty( $bucket_id ) && is_int( $bucket_id ) && absint( $bucket_id ) > 0 ) {
					$api_url .= '/' . absint( $bucket_id );
				}
				break;
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Events
	 *
	 * @access public
	 * @return void
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
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Films
	 *
	 * @access public
	 * @return void
	 */
	public function get_api_films( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_films;

		// Get the parameters.
		$film_id = $request->get_param( 'film_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $film_id ) && is_int( $film_id ) && absint( $film_id ) > 0 ) {
			$api_url .= '/' . absint( $film_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Item Buckets
	 *
	 * @access public
	 * @return void
	 */
	public function get_api_item_buckets( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_item_buckets;

		// Get the parameters.
		$item_bucket_id = $request->get_param( 'item_bucket_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $item_bucket_id ) && is_int( $item_bucket_id ) && absint( $item_bucket_id ) > 0 ) {
			$api_url .= '/' . absint( $item_bucket_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Items
	 *
	 * @access public
	 * @return void
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
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Ledger
	 *
	 * @access public
	 * @return void
	 */
	public function get_api_ledger( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_ledger;

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Order
	 *
	 * @access public
	 * @return void
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
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Passes
	 *
	 * @access public
	 * @return void
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
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API People
	 *
	 * @access public
	 * @return void
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
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Tags
	 *
	 * @access public
	 * @return void
	 */
	public function get_api_tags( $request ) {
		// Build the endpoint URL.
		$api_url = $this->api_url_base . $this->api_endpoint_tags;

		// Get the parameters.
		$tag_id = $request->get_param( 'tag_id' );

		// Modify the endpoint based on parameters.
		if ( ! empty( $tag_id ) && is_int( $tag_id ) && absint( $tag_id ) > 0 ) {
			$api_url .= '/' . absint( $tag_id );
		}

		// Prepare other parameters.
		$response_body = '';
		$args          = array();

		// Make the API call.
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}

	/**
	 * Get API Tickets
	 *
	 * @access public
	 * @return void
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
		$response = $this->eventive_make_api_call( esc_url_raw( $api_url ), $response_body, $args );
		return rest_ensure_response( $response );
	}
}
