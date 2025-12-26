/**
 * Eventive Account Details Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * Helper: detect if this instance is inside the parent [eventive-account]
 */
function inParentAccountContainer( el ) {
	try {
		return !! ( el && el.closest && el.closest( '.eventive-account-container' ) );
	} catch ( _ ) {
		return false;
	}
}

/**
 * Helpers to safely extract values
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
		p.first_name && p.last_name ? p.first_name + ' ' + p.last_name : undefined,
		d.first_name && d.last_name ? d.first_name + ' ' + d.last_name : undefined
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

	const sms_tickets_enabled = pickFirst( p.sms_tickets_enabled, d.sms_tickets_enabled );

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

	useEffect( () => {
		const checkLoginAndFetch = async () => {
			if ( ! window.Eventive || ! window.Eventive.isLoggedIn ) {
				setTimeout( checkLoginAndFetch, 100 );
				return;
			}

			try {
				const loggedIn = window.Eventive.isLoggedIn();
				setIsLoggedIn( loggedIn );

				if ( loggedIn ) {
					const resp = await window.Eventive.request( {
						method: 'GET',
						path: 'people/self',
						authenticatePerson: true,
					} );
					const person = resp && ( resp.person || resp );
					window.eventivePersonId = person && person.id;
					const normalized = normalizePerson( person || {} );
					setDetails( normalized );

					// Render buttons if available
					if ( window.Eventive.renderButtons ) {
						setTimeout( () => window.Eventive.renderButtons(), 100 );
					}
				}
			} catch ( error ) {
				console.error( 'Error fetching account details:', error );
			} finally {
				setIsLoading( false );
			}
		};

		if ( window.Eventive && window.Eventive.on ) {
			window.Eventive.on( 'ready', checkLoginAndFetch );
		}

		checkLoginAndFetch();
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

			const wpApiSettings = window.wpApiSettings || { root: '/', nonce: '' };
			const url = `${ wpApiSettings.root }eventive/v1/person/${ personId }`;
			const payload = {};
			payload[ key ] = editValue;

			const res = await fetch( url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': wpApiSettings.nonce || '',
				},
				body: JSON.stringify( payload ),
			} );

			if ( ! res.ok ) {
				alert( 'Failed to update. Server error.' );
				return;
			}

			// Update local state
			setDetails( { ...details, [ key ]: editValue } );
			setEditingKey( null );
			setEditValue( '' );
		} catch ( err ) {
			console.error( 'Error submitting update:', err );
			alert( 'Failed to save changes. Please try again.' );
		}
	};

	const handleSmsToggle = async ( checked ) => {
		try {
			const personId = window.eventivePersonId;
			if ( ! personId ) {
				return;
			}

			const wpApiSettings = window.wpApiSettings || { root: '/', nonce: '' };
			const url = `${ wpApiSettings.root }eventive/v1/person/${ personId }`;
			const payload = { sms_tickets_enabled: checked };

			const res = await fetch( url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': wpApiSettings.nonce || '',
				},
				body: JSON.stringify( payload ),
			} );

			if ( res.ok ) {
				setDetails( { ...details, sms_tickets_enabled: checked } );
			}
		} catch ( err ) {
			console.error( 'Error updating SMS setting:', err );
		}
	};

	if ( isLoading ) {
		return (
			<div className="eventive-login-container" style={ { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' } }>
				<div className="loader"></div>
			</div>
		);
	}

	if ( ! isLoggedIn ) {
		return (
			<div className="eventive-notice" style={ { textAlign: 'center' } }>
				Please log in to view your account details.
			</div>
		);
	}

	if ( ! details ) {
		return (
			<div className="eventive-notice" style={ { textAlign: 'center' } }>
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

	if ( details && Object.prototype.hasOwnProperty.call( details, 'sms_tickets_enabled' ) ) {
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
							const rawValue = details[ key ];
							const value = rawValue !== undefined && rawValue !== null && rawValue !== '' ? rawValue : 'Not Set';
							const displayValue = typeof value === 'boolean' ? ( value ? 'Yes' : 'No' ) : value;
							const isEditing = editingKey === key;

							return (
								<tr key={ key }>
									<td>{ label }</td>
									<td className="static-value">
										{ isEditing ? (
											key === 'sms_tickets_enabled' ? (
												<select
													value={ editValue }
													onChange={ ( e ) => setEditValue( e.target.value ) }
													className="edit-select"
												>
													<option value="true">Yes</option>
													<option value="false">No</option>
												</select>
											) : (
												<input
													type="text"
													value={ editValue }
													onChange={ ( e ) => setEditValue( e.target.value ) }
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
													onChange={ ( e ) => handleSmsToggle( e.target.checked ) }
												/>
												<span className="slider"></span>
											</label>
										) : isEditing ? (
											<>
												<button
													className="submit-row-button"
													onClick={ () => handleSubmit( key ) }
												>
													Submit
												</button>{ ' ' }
												<button className="cancel-row-button" onClick={ handleCancel }>
													Cancel
												</button>
											</>
										) : (
											<button className="edit-row-button" onClick={ () => handleEdit( key, displayValue ) }>
												Edit
											</button>
										) }
									</td>
								</tr>
							);
						} ) }
					</tbody>
				</table>
				<div className="eventive-account-actions" style={ { marginTop: '16px' } }>
					<div className="eventive-button" data-payment="true" data-label="Manage Payment Details"></div>
				</div>
			</div>
		</div>
	);
}

/**
 * Initialize block on all matching elements
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const blocks = document.querySelectorAll( '.wp-block-eventive-account-details' );

	blocks.forEach( ( block ) => {
		const root = createRoot( block );
		root.render( <AccountDetailsApp /> );
	} );
} );
