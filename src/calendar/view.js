/**
 * Eventive Calendar Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot, useState, useEffect } from '@wordpress/element';

/**
 * Get text color based on background brightness
 * @param bgColor
 */
function getAccessibleTextColor( bgColor ) {
	const hex = bgColor.replace( '#', '' );
	if ( hex.length === 6 ) {
		const r = parseInt( hex.substr( 0, 2 ), 16 );
		const g = parseInt( hex.substr( 2, 2 ), 16 );
		const b = parseInt( hex.substr( 4, 2 ), 16 );
		const brightness = ( r * 299 + g * 587 + b * 114 ) / 1000;
		return brightness > 150 ? '#000000' : '#ffffff';
	}
	return '#000000';
}

/**
 * Get venue details helper
 * @param event
 */
function getVenueDetails( event ) {
	if ( event.is_virtual ) {
		return { name: 'Watch Online', color: '#9b59b6' };
	} else if ( event.venue && event.venue.name ) {
		return { name: event.venue.name, color: event.venue.color || '#ccc' };
	}
	return { name: 'Unknown Location', color: '#ccc' };
}

/**
 * Calendar component
 */
function EventiveCalendar() {
	const [ events, setEvents ] = useState( [] );
	const [ currentYear, setCurrentYear ] = useState(
		new Date().getFullYear()
	);
	const [ currentMonth, setCurrentMonth ] = useState( new Date().getMonth() );
	const [ modalEvent, setModalEvent ] = useState( null );
	const [ isLoading, setIsLoading ] = useState( true );

	const eventBucket = window.EventiveBlockData?.eventBucket || '';

	useEffect( () => {
		if ( ! eventBucket ) {
			setIsLoading( false );
			return;
		}

		const fetchEvents = () => {
			// Check if Eventive API is available
			if (
				! window.Eventive ||
				typeof window.Eventive.request !== 'function'
			) {
				console.error(
					'[eventive-calendar] Eventive API is not available'
				);
				setIsLoading( false );
				return;
			}

			// Use Eventive.request() to fetch events
			window.Eventive.request( {
				method: 'GET',
				path: `event_buckets/${ eventBucket }/events`,
				authenticatePerson: false,
			} )
				.then( ( response ) => {
					setEvents( response.events || [] );
					setIsLoading( false );
				} )
				.catch( ( error ) => {
					console.error(
						'[eventive-calendar] Error fetching events:',
						error
					);
					setIsLoading( false );
				} );
		};

		// Initialize when Eventive API is ready
		if ( window.Eventive && window.Eventive._ready ) {
			fetchEvents();
		} else if (
			window.Eventive &&
			typeof window.Eventive.on === 'function'
		) {
			window.Eventive.on( 'ready', fetchEvents );
		} else {
			// Fallback: try after delay
			setTimeout( () => {
				if (
					window.Eventive &&
					typeof window.Eventive.request === 'function'
				) {
					fetchEvents();
				} else {
					console.error(
						'[eventive-calendar] Eventive API not found'
					);
					setIsLoading( false );
				}
			}, 1000 );
		}
	}, [ eventBucket ] );

	const generateCalendar = () => {
		const monthNames = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		];
		const dayNames = [ 'S', 'M', 'T', 'W', 'T', 'F', 'S' ];

		const firstDay = new Date( currentYear, currentMonth, 1 ).getDay();
		const daysInMonth = new Date(
			currentYear,
			currentMonth + 1,
			0
		).getDate();

		const days = [];

		// Add empty cells for days before the month starts
		for ( let i = 0; i < firstDay; i++ ) {
			days.push( <td key={ `empty-${ i }` } className="empty" /> );
		}

		// Add cells for each day of the month
		for ( let day = 1; day <= daysInMonth; day++ ) {
			const eventsForDay = events.filter( ( event ) => {
				if (
					event.is_virtual &&
					! event.start_time &&
					! event.end_time
				) {
					return true;
				}
				const eventDate = new Date( event.start_time );
				return (
					eventDate.getDate() === day &&
					eventDate.getMonth() === currentMonth &&
					eventDate.getFullYear() === currentYear
				);
			} );

			days.push(
				<td key={ day } className="eventive-cal-day">
					<div>
						{ day }
						{ eventsForDay.map( ( event ) => {
							const venueDetails = getVenueDetails( event );
							const startTime = event.start_time
								? new Date( event.start_time )
										.toLocaleTimeString( [], {
											hour: 'numeric',
											minute: '2-digit',
											hour12: true,
										} )
										.replace( ':00', '' )
								: event.is_virtual
								? 'All Day'
								: 'No Start Time';

							return (
								<div
									key={ event.id }
									className="event-name"
									style={ {
										backgroundColor: venueDetails.color,
										color: getAccessibleTextColor(
											venueDetails.color
										),
									} }
									onClick={ () => setModalEvent( event ) }
								>
									{ event.name } - { startTime }
								</div>
							);
						} ) }
					</div>
				</td>
			);
		}

		// Add empty cells to complete the last row
		const totalCells = firstDay + daysInMonth;
		const remainingCells = 7 - ( totalCells % 7 );
		if ( remainingCells < 7 ) {
			for ( let i = 0; i < remainingCells; i++ ) {
				days.push(
					<td key={ `empty-end-${ i }` } className="empty" />
				);
			}
		}

		// Group into weeks
		const weeks = [];
		for ( let i = 0; i < days.length; i += 7 ) {
			weeks.push(
				<tr key={ `week-${ i }` }>{ days.slice( i, i + 7 ) }</tr>
			);
		}

		return (
			<>
				<div className="calendar-controls">
					<button
						onClick={ () => {
							if ( currentMonth === 0 ) {
								setCurrentMonth( 11 );
								setCurrentYear( currentYear - 1 );
							} else {
								setCurrentMonth( currentMonth - 1 );
							}
						} }
					>
						← Prev
					</button>
					<h2>
						{ monthNames[ currentMonth ] } { currentYear }
					</h2>
					<button
						onClick={ () => {
							if ( currentMonth === 11 ) {
								setCurrentMonth( 0 );
								setCurrentYear( currentYear + 1 );
							} else {
								setCurrentMonth( currentMonth + 1 );
							}
						} }
					>
						Next →
					</button>
				</div>
				<table className="eventive-cal-table">
					<thead>
						<tr>
							{ dayNames.map( ( day ) => (
								<th key={ day }>{ day }</th>
							) ) }
						</tr>
					</thead>
					<tbody>{ weeks }</tbody>
				</table>
			</>
		);
	};

	useEffect( () => {
		if ( modalEvent && window.Eventive && window.Eventive.rebuild ) {
			// Rebuild Eventive buttons after modal opens
			setTimeout( () => window.Eventive.rebuild(), 100 );
		}
	}, [ modalEvent ] );

	if ( isLoading ) {
		return <div className="eventive-calendar-loading">Loading...</div>;
	}

	return (
		<div className="eventive-calendar-container">
			{ generateCalendar() }

			{ modalEvent && (
				<div className="modal" style={ { display: 'block' } }>
					<div className="modal-content">
						<span
							className="close"
							onClick={ () => setModalEvent( null ) }
						>
							&times;
						</span>
						<div className="event-details">
							<div className="details-left">
								<h2>{ modalEvent.name }</h2>
								<p>
									Start Time:{ ' ' }
									{ modalEvent.start_time
										? new Date(
												modalEvent.start_time
										  ).toLocaleTimeString( [], {
												hour: 'numeric',
												minute: '2-digit',
												hour12: true,
										  } )
										: 'All Day' }
								</p>
								<p>
									Location:{ ' ' }
									<span
										className="venue-tag"
										style={ {
											background:
												getVenueDetails( modalEvent )
													.color,
											color: getAccessibleTextColor(
												getVenueDetails( modalEvent )
													.color
											),
										} }
									>
										{ getVenueDetails( modalEvent ).name }
									</span>
								</p>
								{ modalEvent.tags &&
									modalEvent.tags.length > 0 && (
										<div className="tags">
											{ modalEvent.tags.map( ( tag ) => (
												<button
													key={ tag.id }
													className="tag-button film-tag"
													style={ {
														background:
															tag.color || '#ccc',
														color: getAccessibleTextColor(
															tag.color || '#ccc'
														),
													} }
												>
													{ tag.name }
												</button>
											) ) }
										</div>
									) }
							</div>
							<div className="details-right">
								<div
									className="eventive-button"
									data-event={ modalEvent.id }
								/>
							</div>
							{ modalEvent.films &&
								modalEvent.films.length > 0 && (
									<div className="films-container">
										{ modalEvent.films.map( ( film ) => (
											<div
												key={ film.id }
												className="film-card"
											>
												<div className="film-card-content">
													<h3>{ film.name }</h3>
													<p>{ film.description }</p>
												</div>
												{ film.poster_image && (
													<div className="film-poster">
														<img
															src={
																film.poster_image
															}
															alt={ film.name }
														/>
													</div>
												) }
											</div>
										) ) }
									</div>
								) }
						</div>
					</div>
				</div>
			) }
		</div>
	);
}

/**
 * Initialize the block on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll(
		'.wp-block-eventive-calendar'
	);

	containers.forEach( ( container ) => {
		const root = createRoot( container );
		root.render( <EventiveCalendar /> );
	} );
} );
