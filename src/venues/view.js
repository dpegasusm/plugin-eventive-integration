/**
 * Eventive Venues Block - Frontend View Script
 *
 * @package Eventive
 * @since 1.0.0
 */

import { createRoot } from '@wordpress/element';

/**
 * Venue component to render individual venue card
 *
 * @param {Object} props Component props
 * @param {Object} props.venue Venue data object
 * @return {JSX.Element} Venue card component
 */
const VenueCard = ({ venue }) => {
	return (
		<div
			className="eventive-venue-card"
			style={{
				display: 'flex',
				border: '1px solid #ddd',
				padding: '2%',
				margin: '15px auto',
				borderRadius: '4px',
				backgroundColor: '#fff',
				boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
			}}
		>
			<div style={{ flexGrow: 6 }}>
				<p>
					<strong style={{ fontSize: '1.2em', color: '#333' }}>
						{venue.name}
					</strong>
					<br />
					{venue.label && (
						<>
							<span style={{ color: '#666' }}>{venue.label}</span>
							<br />
						</>
					)}
					<span style={{ color: '#555' }}>
						Capacity: {venue.default_capacity || 'N/A'}
					</span>
					<br />
					{venue.description && (
						<>
							<span style={{ color: '#666', marginTop: '8px', display: 'block' }}>
								{venue.description}
							</span>
							<br />
						</>
					)}
					{venue.address && (
						<>
							<strong style={{ fontSize: '0.9em', color: '#555' }}>
								Street Address:
							</strong>
							<br />
							<span style={{ color: '#666' }}>{venue.address}</span>
						</>
					)}
				</p>
			</div>
			{venue.seatmap_preview_image && (
				<div style={{ marginLeft: '20px', flexShrink: 0 }}>
					<img
						src={venue.seatmap_preview_image}
						alt={`${venue.name} seatmap`}
						style={{
							maxWidth: '200px',
							height: 'auto',
							borderRadius: '4px',
						}}
					/>
				</div>
			)}
		</div>
	);
};

/**
 * Venues container component
 *
 * @return {JSX.Element} Venues container component
 */
const VenuesContainer = () => {
	const [venues, setVenues] = React.useState([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState(null);

	React.useEffect(() => {
		const loadVenues = () => {
			if (!window.Eventive) {
				setError('Eventive API is not initialized.');
				setLoading(false);
				return;
			}

			const handleEventiveReady = () => {
				// Get API credentials from localized script data
				const eventBucket = window.EventiveBlockData?.eventBucket || '';
				const apiKey = window.EventiveBlockData?.apiKey || '';

				if (!eventBucket) {
					setError('Event bucket not configured.');
					setLoading(false);
					return;
				}

				const apiPath = `event_buckets/${encodeURIComponent(eventBucket)}/venues`;
				const headers = apiKey ? { 'x-api-key': apiKey } : {};

				window.Eventive.request({
					method: 'GET',
					path: apiPath,
					headers: headers,
				})
					.then((response) => {
						console.log('Venues response:', response);
						if (response && Array.isArray(response.venues)) {
							setVenues(response.venues);
						} else {
							setError('No venues found.');
						}
						setLoading(false);
					})
					.catch((err) => {
						console.error('Error fetching venues:', err);
						setError(`Error fetching venues: ${err.message || 'Unknown error'}`);
						setLoading(false);
					});
			};

			// Check if Eventive is ready
			if (window.Eventive.ready) {
				handleEventiveReady();
			} else {
				window.Eventive.on('ready', handleEventiveReady);
			}
		};

		loadVenues();
	}, []);

	if (loading) {
		return (
			<div className="eventive-venues-loading" style={{ padding: '20px', textAlign: 'center' }}>
				<p>Loading venues...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className="eventive-venues-error"
				style={{
					padding: '15px',
					backgroundColor: '#fef7f1',
					borderLeft: '4px solid #d63638',
					color: '#d63638',
				}}
			>
				<p>{error}</p>
			</div>
		);
	}

	if (venues.length === 0) {
		return (
			<div className="eventive-venues-empty" style={{ padding: '20px', textAlign: 'center' }}>
				<p>No venues found.</p>
			</div>
		);
	}

	return (
		<div className="eventive-venues-container">
			{venues.map((venue) => (
				<VenueCard key={venue.id || venue.name} venue={venue} />
			))}
		</div>
	);
};

/**
 * Initialize venues blocks on page load
 */
document.addEventListener('DOMContentLoaded', () => {
	const venueContainers = document.querySelectorAll('.wp-block-eventive-eventive-venues');

	venueContainers.forEach((container) => {
		// Check if already initialized
		if (container.querySelector('.eventive-venues-container, .eventive-venues-loading')) {
			return;
		}

		const root = createRoot(container);
		root.render(<VenuesContainer />);
	});
});
