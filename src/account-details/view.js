/**
 * Eventive Account Details Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect, useRef } from '@wordpress/element';

/**
 * Helper: detect if this instance is inside the parent [eventive-account]
 * @param el
 */
function inParentAccountContainer( el ) {
	try {
		return !! (
			el &&
			el.closest &&
			el.closest( '.eventive-account-container' )
		);
	} catch ( _ ) {
		return false;
	}
}

/**
 * Helpers to safely extract values
 * @param {...any} args
 */
function pickFirst( ...args ) {
	for ( let i = 0; i < args.length; i++ ) {
		const v = args[ i ];
		if ( v !== undefined && v !== null && v !== '' ) {
			return v;
		}
	}
	return undefined;
}

function firstIn( arr, key ) {
	if ( ! arr || ! arr.length ) {
		return undefined;
	}
	if ( ! key ) {
		return arr[ 0 ];
	}
	const v = arr[ 0 ];
	return v && typeof v === 'object' ? v[ key ] : v;
}

function joinAddress( obj ) {
	if ( ! obj || typeof obj !== 'object' ) {
		return obj;
	}
	const parts = [
		obj.street || obj.line1 || obj.address1,
		obj.line2 || obj.address2,
		obj.city,
		obj.region || obj.state,
		obj.postal_code || obj.postalCode || obj.zip,
		obj.country,
	].filter( Boolean );
	return parts.length ? parts.join( ', ' ) : undefined;
}

function normalizePerson( p ) {
	if ( ! p || typeof p !== 'object' ) {
		return {};
	}
	const d = p.details || {};
	const addresses = p.addresses || d.addresses;
	const phones = p.phones || d.phones;
	const emails = p.emails || d.emails;

	const name = pickFirst(
		p.name,
		d.name,
		p.full_name,
		p.fullName,
		p.first_name && p.last_name
			? p.first_name + ' ' + p.last_name
			: undefined,
		d.first_name && d.last_name
			? d.first_name + ' ' + d.last_name
			: undefined
	);
	const email = pickFirst( p.email, d.email, firstIn( emails, 'email' ) );
	const phone_number = pickFirst(
		p.phone_number,
		d.phone_number,
		p.phone,
		d.phone,
		p.phoneNumber,
		d.phoneNumber,
		firstIn( phones, 'number' )
	);

	const mailing_address = pickFirst(
		joinAddress( p.mailing_address ),
		joinAddress( d.mailing_address ),
		joinAddress( p.address ),
		joinAddress( d.address ),
		joinAddress( firstIn( addresses ) ),
		p.mailing_address,
		d.mailing_address,
		p.address,
		d.address,
		firstIn( addresses )
	);

	const sms_tickets_enabled = pickFirst(
		p.sms_tickets_enabled,
		d.sms_tickets_enabled
	);

	return {
		name,
		email,
		phone_number,
		mailing_address,
		sms_tickets_enabled,
		_raw: p,
	};
}

/**
 * Account Details Component
 */
function AccountDetailsApp() {
	const [ isLoggedIn, setIsLoggedIn ] = useState( false );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ details, setDetails ] = useState( null );
	const [ editingKey, setEditingKey ] = useState( null );
	const [ editValue, setEditValue ] = useState( '' );

	const hasFetchedRef = useRef( false );

	useEffect( () => {
		let cancelled = false;
		let tries = 0;
		const maxTries = 60;

		const checkLoginAndFetch = async () => {
			if ( cancelled ) {
				return;
			}

			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				tries++;
				if ( tries < maxTries ) {
					setTimeout( checkLoginAndFetch, 100 );
				} else {
					setIsLoading( false );
				}
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn && ! hasFetchedRef.current ) {
					hasFetchedRef.current = true;

					// Use people/self endpoint
					const resp = await window.Eventive.request( {
						method: 'GET',
						path: 'people/self',
						authenticatePerson: true,
					} );

					if ( cancelled ) {
						return;
					}

					const person = resp && ( resp.person || resp );
					window.eventivePersonId = person && person.id;
					const normalized = normalizePerson( person || {} );
					setDetails( normalized );

					// Render Eventive buttons if available
					setTimeout( () => {
						if (
							window.Eventive &&
							typeof window.Eventive.renderButtons === 'function'
						) {
							try {
								window.Eventive.renderButtons();
							} catch ( _ ) {}
						}
					}, 100 );
				}
			} catch ( error ) {
				if ( cancelled ) {
					return;
				}

				if (
					error &&
					( error.code === 'InvalidCredentials' ||
						error.message === 'InvalidCredentials' ||
						( error.message && error.message.includes( '401' ) ) ||
						( error.message && error.message.includes( 'Unauthorized' ) ) )
				) {
					setIsLoggedIn( false );
					hasFetchedRef.current = false;
				}
			} finally {
				if ( ! cancelled ) {
					setIsLoading( false );
				}
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLoginAndFetch );
		}
		checkLoginAndFetch();

		return () => {
			cancelled = true;
			if ( window.Eventive && window.Eventive.off ) {
				window.Eventive.off( 'ready', checkLoginAndFetch );
			}
		};
	}, [] );

	const handleEdit = ( key, currentValue ) => {
		setEditingKey( key );
		setEditValue( currentValue === 'Not Set' ? '' : currentValue );
	};

	const handleCancel = () => {
		setEditingKey( null );
		setEditValue( '' );
	};

	const handleSubmit = async ( key ) => {
		try {
			const personId = window.eventivePersonId;
			if ( ! personId ) {
				alert( 'Missing person ID' );
				return;
			}

			const payload = {};
			payload[ key ] = editValue;

			// Use people/{id} endpoint with POST
			await window.Eventive.request( {
				method: 'POST',
				path: `people/${ personId }`,
				authenticatePerson: true,
				data: payload,
			} );

			// Update local state
			setDetails( { ...details, [ key ]: editValue } );
			setEditingKey( null );
			setEditValue( '' );
		} catch ( err ) {
			console.error(
				'[eventive-account-details] Error submitting update:',
				err
			);
			alert( 'Failed to save changes. Please try again.' );
		}
	};

	const handleSmsToggle = async ( checked ) => {
		try {
			const personId = window.eventivePersonId;
			if ( ! personId ) {
				return;
			}

			const payload = { sms_tickets_enabled: checked };

			await window.Eventive.request( {
				method: 'POST',
				path: `people/${ personId }`,
				authenticatePerson: true,
				data: payload,
			} );
			setDetails( { ...details, sms_tickets_enabled: checked } );
		} catch ( err ) {
			console.error(
				'[eventive-account-details] Error updating SMS setting:',
				err
			);
		}
	};

	if ( isLoading ) {
		return (
			<div className="eventive-login-container">
				<div className="loader"></div>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-notice">
				Please log in to view your account details.
			</div>
		);
	}

	if ( ! details ) {
		return (
			<div className="eventive-notice">
				Unable to load account details.
			</div>
		);
	}

	const fields = {
		name: 'Name',
		email: 'Email',
		phone_number: 'Phone Number',
		mailing_address: 'Mailing Address',
	};

	if (
		details &&
		Object.prototype.hasOwnProperty.call( details, 'sms_tickets_enabled' )
	) {
		fields.sms_tickets_enabled = 'SMS Tickets Enabled';
	}

	return (
		<div className="eventive-account-details">
			<div className="eventive-account-details-content">
				<h2>My Account Details</h2>
				<table className="styled-table">
					<thead>
						<tr>
							<th>Field</th>
							<th>Value</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{ Object.keys( fields ).map( ( key ) => {
							const label = fields[ key ];
							let rawValue = details[ key ];

							// Common fallbacks for known fields
							if ( rawValue === undefined ) {
								const R = details._raw || {};
								if ( key === 'phone_number' ) {
									rawValue =
										details.phone ||
										details.phoneNumber ||
										( R.details &&
											( R.details.phone ||
												R.details.phone_number ) ) ||
										( R.phones &&
											firstIn( R.phones, 'number' ) );
								}
								if ( key === 'mailing_address' ) {
									rawValue =
										details.address ||
										details.mailingAddress ||
										details.mailing_address ||
										( R.details &&
											( R.details.address ||
												R.details.mailing_address ) ) ||
										joinAddress( firstIn( R.addresses ) );
								}
								if ( key === 'name' ) {
									rawValue =
										R &&
										( R.name ||
											R.full_name ||
											( R.first_name &&
												R.last_name &&
												R.first_name +
													' ' +
													R.last_name ) );
								}
								if ( key === 'email' ) {
									rawValue =
										R &&
										( R.email ||
											( R.emails &&
												firstIn(
													R.emails,
													'email'
												) ) );
								}
							}

							// Normalize mailing_address object -> string
							if (
								key === 'mailing_address' &&
								rawValue &&
								typeof rawValue === 'object'
							) {
								const parts = [
									rawValue.street || rawValue.line1,
									rawValue.line2,
									rawValue.city,
									rawValue.region || rawValue.state,
									rawValue.postal_code || rawValue.postalCode,
									rawValue.country,
								].filter( Boolean );
								rawValue = parts.join( ', ' );
							}

							const value =
								rawValue !== undefined &&
								rawValue !== null &&
								rawValue !== ''
									? rawValue
									: 'Not Set';
							const displayValue =
								typeof value === 'boolean'
									? value
										? 'Yes'
										: 'No'
									: value;
							const isEditing = editingKey === key;

							return (
								<tr key={ key }>
									<td>{ label }</td>
									<td className="static-value">
										{ isEditing ? (
											key === 'sms_tickets_enabled' ? (
												<select
													value={ editValue }
													onChange={ ( e ) =>
														setEditValue(
															e.target.value
														)
													}
													className="edit-select"
												>
													<option value="true">
														Yes
													</option>
													<option value="false">
														No
													</option>
												</select>
											) : (
												<input
													type="text"
													value={ editValue }
													onChange={ ( e ) =>
														setEditValue(
															e.target.value
														)
													}
													className="edit-input"
												/>
											)
										) : (
											displayValue
										) }
									</td>
									<td>
										{ key === 'sms_tickets_enabled' ? (
											<label className="toggle-switch">
												<input
													type="checkbox"
													className="sms-toggle"
													checked={ value === true }
													onChange={ ( e ) =>
														handleSmsToggle(
															e.target.checked
														)
													}
												/>
												<span className="slider"></span>
											</label>
										) : isEditing ? (
											<>
												<button
													className="submit-row-button"
													onClick={ () =>
														handleSubmit( key )
													}
												>
													Submit
												</button>{ ' ' }
												<button
													className="cancel-row-button"
													onClick={ handleCancel }
												>
													Cancel
												</button>
											</>
										) : (
											<button
												className="edit-row-button"
												onClick={ () =>
													handleEdit(
														key,
														displayValue
													)
												}
											>
												Edit
											</button>
										) }
									</td>
								</tr>
							);
						} ) }
					</tbody>
				</table>
				<div className="eventive-account-actions">
					<div
						className="eventive-button"
						data-payment="true"
						data-label="Manage Payment Details"
					></div>
				</div>
			</div>
		</div>
	);
}

/**
 * Initialize block on all matching elements
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll(
		'.wp-block-eventive-account-details'
	);

	blocks.forEach( ( block ) => {
		// Idempotent guard - don't initialize twice
		if ( block.__evtInited ) {
			return;
		}
		block.__evtInited = true;

		const root = createRoot( block );
		root.render( <AccountDetailsApp /> );
	} );
} );
