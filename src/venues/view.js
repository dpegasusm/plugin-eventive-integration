/**
 * Eventive Venues Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot, useState, useEffect } from '@wordpress/element';

/**
 * Venue component to render individual venue card
 *
 * @param {Object} props       Component props
 * @param {Object} props.venue Venue data object
 * @return {JSX.Element} Venue card component
 */
const VenueCard = ( { venue } ) => {
	return (
		<div
			className="eventive-venue-card"
			style={ {
				display: 'flex',
				border: '1px solid #ddd',
				padding: '2%',
				margin: '15px auto',
				borderRadius: '4px',
				backgroundColor: '#fff',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
			} }
		>
			<div style={ { flexGrow: 6 } }>
				<p>
					<strong style={ { fontSize: '1.2em', color: '#333' } }>
						{ venue.name }
					</strong>
					<br />
					{ venue.label && (
						<>
							<span style={ { color: '#666' } }>
								{ venue.label }
							</span>
							<br />
						</>
					) }
					<span style={ { color: '#555' } }>
						Capacity: { venue.default_capacity || 'N/A' }
					</span>
					<br />
					{ venue.description && (
						<>
							<span
								style={ {
									color: '#666',
									marginTop: '8px',
									display: 'block',
								} }
							>
								{ venue.description }
							</span>
							<br />
						</>
					) }
					{ venue.address && (
						<>
							<strong
								style={ { fontSize: '0.9em', color: '#555' } }
							>
								Street Address:
							</strong>
							<br />
							<span style={ { color: '#666' } }>
								{ venue.address }
							</span>
						</>
					) }
				</p>
			</div>
			{ venue.seatmap_preview_image && (
				<div style={ { marginLeft: '20px', flexShrink: 0 } }>
					<img
						src={ venue.seatmap_preview_image }
						alt={ `${ venue.name } seatmap` }
						style={ {
							maxWidth: '200px',
							height: 'auto',
							borderRadius: '4px',
						} }
					/>
				</div>
			) }
		</div>
	);
};

/**
 * Venues container component
 *
 * @return {JSX.Element} Venues container component
 */
const VenuesContainer = () => {
	const [ venues, setVenues ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		const loadVenues = async () => {
			try {
				// Get event bucket, endpoints and nonce from localized data
				const eventBucket = window.EventiveBlockData?.eventBucket || '';
				const endpoints = window.EventiveBlockData?.apiEndpoints || {};
				const nonce = window.EventiveBlockData?.eventNonce || '';

				if ( ! eventBucket ) {
					setError( 'Event bucket not configured.' );
					setLoading( false );
					return;
				}

				// Fetch venues from WordPress REST API
				const data = await wp.apiFetch( {
					path: `/eventive/v1/${ endpoints.event_buckets }?bucket_id=${ eventBucket }&endpoint=venues&eventive_nonce=${ nonce }`,
					method: 'GET',
				} );

				if ( data && Array.isArray( data.venues ) ) {
					setVenues( data.venues );
				} else {
					setError( 'No venues found.' );
				}
				setLoading( false );
			} catch ( err ) {
				console.error( 'Error fetching venues:', err );
				setError(
					`Error fetching venues: ${ err.message || 'Unknown error' }`
				);
				setLoading( false );
			}
		};

		loadVenues();
	}, [] );

	if ( loading ) {
		return (
			<div
				className="eventive-venues-loading"
				style={ { padding: '20px', textAlign: 'center' } }
			>
				<p>Loading venues...</p>
			</div>
		);
	}

	if ( error ) {
		return (
			<div
				className="eventive-venues-error"
				style={ {
					padding: '15px',
					backgroundColor: '#fef7f1',
					borderLeft: '4px solid #d63638',
					color: '#d63638',
				} }
			>
				<p>{ error }</p>
			</div>
		);
	}

	if ( venues.length === 0 ) {
		return (
			<div
				className="eventive-venues-empty"
				style={ { padding: '20px', textAlign: 'center' } }
			>
				<p>No venues found.</p>
			</div>
		);
	}

	return (
		<div className="eventive-venues-container">
			{ venues.map( ( venue ) => (
				<VenueCard key={ venue.id || venue.name } venue={ venue } />
			) ) }
		</div>
	);
};

/**
 * Initialize venues blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const venueContainers = document.querySelectorAll(
		'.wp-block-eventive-eventive-venues'
	);

	venueContainers.forEach( ( container ) => {
		// Check if already initialized
		if (
			container.querySelector(
				'.eventive-venues-container, .eventive-venues-loading'
			)
		) {
			return;
		}

		const root = createRoot( container );
		root.render( <VenuesContainer /> );
	} );
} );
