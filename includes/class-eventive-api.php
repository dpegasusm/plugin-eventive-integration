<?php
/**
 * Provincetown Film Plugin
 *
 * @package WordPress
 * @subpackage Provincetown
 * @since 1.0.0
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Provincetown_Film_API Class
 */
class Provincetown_Film_API {
	/**
	 * Base URL for the API.
	 *
	 * @access public
	 * @var string
	 */
	public $api_url_base = 'https://api.eventive.org/';

	/**
	 * Endpoint for listing items.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_item_list = '';

	/**
	 * Endpoint for getting a specific item.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_item_get = '';

	/**
	 * Endpoint for listing item prices.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_item_list_prices = '';

	/**
	 * Endpoint for listing venues.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_venue_list = '';

	/**
	 * Endpoint for getting a specific venue.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_venue_get = '';

	/**
	 * Endpoint for listing buyer types.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_buyer_type_list = '';

	/**
	 * Endpoint for listing inventory groups.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_inventory_group_list = '';

	/**
	 * Endpoint for getting organization control details.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_org_control_get = '';

	/**
	 * Endpoint for listing membership access.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_membership_list_access = '';

	/**
	 * Endpoint for listing member restrictions.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_member_restriction_list = '';

	/**
	 * Endpoint for authenticating via email.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_authenticate_email = '';

	/**
	 * Endpoint for authenticating a member.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_authenticate_member = '';

	/**
	 * Endpoint for adding a customer.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_add = '';

	/**
	 * Endpoint for updating a customer.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_update = '';

	/**
	 * Endpoint for searching customers.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_search = '';

	/**
	 * Endpoint for listing streaming customers.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_list_streaming = '';

	/**
	 * Endpoint for getting streaming customer details.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_get_streaming = '';

	/**
	 * Endpoint for redeeming streaming content.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_redeem_streaming = '';

	/**
	 * Endpoint for listing customer event history.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_list_event_history = '';

	/**
	 * Endpoint for listing customer e-delivery items.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_customer_list_edelivery = '';

	/**
	 * Endpoint for adding a web user.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_web_user_add = '';

	/**
	 * Endpoint for updating a web user.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_web_user_update = '';

	/**
	 * Endpoint for adding items to an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_add_items = '';

	/**
	 * Endpoint for deleting items from an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_delete_items = '';

	/**
	 * Endpoint for checking order status.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_status = '';

	/**
	 * Endpoint for updating an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_update = '';

	/**
	 * Endpoint for transferring an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_transfer = '';

	/**
	 * Endpoint for canceling an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_cancel = '';

	/**
	 * Endpoint for voiding an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_endpoint_order_void = '';

	/**
	 * Endpoint for voiding an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_app_key = '';

	/**
	 * Endpoint for voiding an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_user_key = '';

	/**
	 * Endpoint for voiding an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_corp_org_id = '';

	/**
	 * Endpoint for voiding an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_item_org_id = '';

	/**
	 * Endpoint for voiding an order.
	 *
	 * @access public
	 * @var string
	 */
	public $api_buyer_type_id = '';

	/**
	 * Init Class.
	 *
	 * @access public
	 * @return void
	 */
	public function init() {
		// Instantiate the base URL for the API.
		$this->api_url_base = esc_url_raw( $this->api_url_base );

		add_action( 'init', array( $this, 'provincetown_set_api_endpoints' ) );

		// Register our custom API endpoints.
		add_action( 'rest_api_init', array( $this, 'register_custom_api_endpoints' ) );
	}

	/**
	 * Set the API endpoints.
	 *
	 * @access public
	 * @return void
	 */
	public function provincetown_set_api_endpoints() {
		// Get the required Query Args for the API from the options.
		$api_app_key       = get_option( 'provincetown_agile_api_app_key', '' );
		$api_user_key      = get_option( 'provincetown_agile_api_user_key', '' );
		$api_corp_org_id   = get_option( 'provincetown_agile_api_corp_org_id', '' );
		$api_item_org_id   = get_option( 'provincetown_agile_api_item_org_id', '' );
		$api_buyer_type_id = intval( get_option( 'provincetown_agile_api_buyer_type_id', '' ) );

		// If the user is logged in, extract the Buyer Type ID from the user's memberships.
		if ( is_user_logged_in() ) {
			$current_user = wp_get_current_user();
			$customer_id  = intval( get_user_meta( $current_user->ID, 'provincetown_customer_id', true ) );

			// we also need ot get the buyer type ID as well as the membership ID.
			$buyer_type = intval( get_user_meta( $current_user->ID, 'provincetown_buyer_type', true ) );
			$member_id  = intval( get_user_meta( $current_user->ID, 'provincetown_member_id', true ) );

			// Lets do a quick sanity check on the Buyer type to verify its in the list of allowed types.
			$valid_buyer_types = get_option( 'provincetown_agile_api_valid_buyer_type_ids', '' );
			$valid_buyer_types = explode( ',', $valid_buyer_types );
			$valid_buyer_types = array_map( 'trim', $valid_buyer_types );
			$valid_buyer_types = array_map( 'intval', $valid_buyer_types );

			// If the buyer type is not in the list of valid buyer types, set it to an empty string.
			if ( in_array( $buyer_type, $valid_buyer_types, true ) ) {
				$api_buyer_type_id = $buyer_type;
			}
		}

		// Set the API keys.
		$this->api_app_key       = $api_app_key;
		$this->api_user_key      = $api_user_key;
		$this->api_corp_org_id   = $api_corp_org_id;
		$this->api_item_org_id   = $api_item_org_id;
		$this->api_buyer_type_id = $api_buyer_type_id;

		// These query args are required for the API to work.
		$required_query_args = array(
			'appkey'    => $this->api_app_key,
			'userkey'   => $this->api_user_key,
			'corporgid' => $this->api_corp_org_id,
		);

		// Set the API endpoints with the mandatory query args.
		$this->api_endpoint_item_list                   = add_query_arg( $required_query_args, $this->api_url_base . 'itemlist' );
		$this->api_endpoint_item_get                    = add_query_arg( $required_query_args, $this->api_url_base . 'itemget' );
		$this->api_endpoint_item_list_prices            = add_query_arg( $required_query_args, $this->api_url_base . 'itemlistprices' );
		$this->api_endpoint_venue_list                  = add_query_arg( $required_query_args, $this->api_url_base . 'venuelist' );
		$this->api_endpoint_venue_get                   = add_query_arg( $required_query_args, $this->api_url_base . 'venueget' );
		$this->api_endpoint_buyer_type_list             = add_query_arg( $required_query_args, $this->api_url_base . 'buyertypelist' );
		$this->api_endpoint_inventory_group_list        = add_query_arg( $required_query_args, $this->api_url_base . 'inventorygrouplist' );
		$this->api_endpoint_org_control_get             = add_query_arg( $required_query_args, $this->api_url_base . 'orgcontrolget' );
		$this->api_endpoint_membership_list_access      = add_query_arg( $required_query_args, $this->api_url_base . 'membershiplistaccess' );
		$this->api_endpoint_member_restriction_list     = add_query_arg( $required_query_args, $this->api_url_base . 'memberrestrictionlist' );
		$this->api_endpoint_authenticate_email          = add_query_arg( $required_query_args, $this->api_url_base . 'authenticateemail' );
		$this->api_endpoint_authenticate_member         = add_query_arg( $required_query_args, $this->api_url_base . 'authenticatemember' );
		$this->api_endpoint_customer_add                = add_query_arg( $required_query_args, $this->api_url_base . 'customeradd' );
		$this->api_endpoint_customer_update             = add_query_arg( $required_query_args, $this->api_url_base . 'customerupdate' );
		$this->api_endpoint_customer_search             = add_query_arg( $required_query_args, $this->api_url_base . 'customersearch' );
		$this->api_endpoint_customer_list_streaming     = add_query_arg( $required_query_args, $this->api_url_base . 'customerliststreaming' );
		$this->api_endpoint_customer_get_streaming      = add_query_arg( $required_query_args, $this->api_url_base . 'customergetstreaming' );
		$this->api_endpoint_customer_redeem_streaming   = add_query_arg( $required_query_args, $this->api_url_base . 'customerredeemstreaming' );
		$this->api_endpoint_customer_list_event_history = add_query_arg( $required_query_args, $this->api_url_base . 'customerlisteventhistory' );
		$this->api_endpoint_customer_list_edelivery     = add_query_arg( $required_query_args, $this->api_url_base . 'customerlistedelivery' );
		$this->api_endpoint_web_user_add                = add_query_arg( $required_query_args, $this->api_url_base . 'webuseradd' );
		$this->api_endpoint_web_user_update             = add_query_arg( $required_query_args, $this->api_url_base . 'webuserupdate' );
		$this->api_endpoint_order_add_items             = add_query_arg( $required_query_args, $this->api_url_base . 'orderadditems' );
		$this->api_endpoint_order_delete_items          = add_query_arg( $required_query_args, $this->api_url_base . 'orderdeleteitems' );
		$this->api_endpoint_order_status                = add_query_arg( $required_query_args, $this->api_url_base . 'orderstatus' );
		$this->api_endpoint_order_update                = add_query_arg( $required_query_args, $this->api_url_base . 'orderupdate' );
		$this->api_endpoint_order_transfer              = add_query_arg( $required_query_args, $this->api_url_base . 'ordertransfer' );
		$this->api_endpoint_order_cancel                = add_query_arg( $required_query_args, $this->api_url_base . 'ordercancel' );
		$this->api_endpoint_order_void                  = add_query_arg( $required_query_args, $this->api_url_base . 'ordervoid' );

		// Add the required Query Args to the URL.
		$buyer_query_args = array(
			'eventorgid' => $this->api_item_org_id,
		);

		$this->api_endpoint_item_list        = add_query_arg( $buyer_query_args, $this->api_endpoint_item_list );
		$this->api_endpoint_item_list_prices = add_query_arg( $buyer_query_args, $this->api_endpoint_item_list_prices );

		// Buyer Type ID is required for the item get endpoint.
		$buyer_type = array(
			'buyertypeid' => $this->api_buyer_type_id,
		);

		$this->api_endpoint_item_list_prices = add_query_arg( $buyer_type, $this->api_endpoint_item_list_prices );
		$this->api_endpoint_item_get         = add_query_arg( $buyer_type, $this->api_endpoint_item_get );
		$this->api_endpoint_order_add_items  = add_query_arg( $buyer_type, $this->api_endpoint_order_add_items );
	}

	/**
	 * Make an API call to the specified endpoint.
	 *
	 * @param string $endpoint      The API endpoint to call.
	 * @param string $response_body Optional. The response body to send with the request.
	 * @param array  $args          Optional. Arguments for the API call.
	 * @return array|WP_Error The response from the API or a WP_Error object on failure.
	 */
	public function provincetown_make_api_call( $endpoint, $response_body = '', $args = array() ) {
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

		// Validate the API URL.
		if ( ! wp_http_validate_url( $endpoint ) ) {
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
		$response = wp_remote_request( $endpoint, $args );

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
			error_log( 'API Call: ' . $endpoint ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			error_log( 'API Error Code: ' . $data['Code'] . ' :: ' . $data['Message'] ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log

			// Send a JSON error response.
			wp_send_json_error(
				array(
					'level'   => 'Error',
					'code'    => 'Agile Code: ' . $data['Code'],
					'message' => 'An error occured while processing your request: ' . $data['Message'],
				),
				400
			);
			wp_die();
		}

		// Return the Response body as decoded JSON.
		return $data;
	}
}
