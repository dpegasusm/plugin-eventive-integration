/**
 * Film Showtimes Block - React Frontend Component
 */
import { createRoot } from '@wordpress/element';
import { useState, useEffect } from '@wordpress/element';

/**
 * FilmShowtimes React Component
 */
function FilmShowtimes( { filmId, bucketId } ) {
	const [ showtimes, setShowtimes ] = useState( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );

	useEffect( () => {
		if ( ! filmId || ! bucketId ) {
			setError( 'Missing film or bucket ID' );
			setLoading( false );
			return;
		}

		if ( ! window.Eventive || ! window.Eventive.request ) {
			setError( 'Eventive API not available' );
			setLoading( false );
			return;
		}

		// Fetch showtimes from Eventive API
		window.Eventive.request( {
			method: 'GET',
			path: `event_buckets/${ bucketId }/films/${ filmId }/events`,
			authenticatePerson: false,
		} )
			.then( ( response ) => {
				const events = response.events || [];
				if ( events.length === 0 ) {
					setError( 'No upcoming showtimes available' );
				} else {
					const grouped = groupEventsByDate( events );
					setShowtimes( grouped );
				}
				setLoading( false );
			} )
			.catch( ( err ) => {
				console.error(
					'[eventive-film-showtimes] Error fetching showtimes:',
					err
				);
				setError( 'Unable to load showtimes' );
				setLoading( false );
			} );
	}, [ filmId, bucketId ] );

	// Rebuild Eventive buttons after render
	useEffect( () => {
		if ( ! loading && ! error && showtimes.length > 0 ) {
			if ( window.Eventive?.rebuild ) {
				window.Eventive.rebuild();
			}
		}
	}, [ loading, error, showtimes ] );

	if ( loading ) {
		return <div className="eventive-loading">Loading showtimes...</div>;
	}

	if ( error ) {
		return <div className="eventive-error">{ error }</div>;
	}

	return (
		<div className="eventive-film-showtimes-container">
			{ Object.entries( showtimes ).map( ( [ dateKey, events ] ) => (
				<div key={ dateKey } className="eventive-showtime-date-group">
					<h3 className="eventive-showtime-date">{ dateKey }</h3>
					<div className="eventive-showtime-list">
						{ events.map( ( event ) => (
							<ShowtimeItem key={ event.id } event={ event } />
						) ) }
					</div>
				</div>
			) ) }
		</div>
	);
}

/**
 * ShowtimeItem Component
 */
function ShowtimeItem( { event } ) {
	const startTime = new Date( event.start_time );
	const timeString = startTime.toLocaleTimeString( 'en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	} );

	const venueName = event.venue?.name || 'Venue TBA';

	return (
		<div className="eventive-showtime-item">
			<div className="eventive-showtime-info">
				<span className="eventive-showtime-time">{ timeString }</span>
				<span className="eventive-showtime-venue">{ venueName }</span>
			</div>
			<div className="eventive-showtime-button">
				<div
					className="eventive-button"
					data-event={ event.id }
				></div>
			</div>
		</div>
	);
}

/**
 * Group events by date
 */
function groupEventsByDate( events ) {
	const grouped = {};

	events.forEach( ( event ) => {
		const startTime = new Date( event.start_time );
		const dateKey = startTime.toLocaleDateString( 'en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		} );

		if ( ! grouped[ dateKey ] ) {
			grouped[ dateKey ] = [];
		}

		grouped[ dateKey ].push( event );
	} );

	// Sort events within each date by time
	Object.keys( grouped ).forEach( ( dateKey ) => {
		grouped[ dateKey ].sort(
			( a, b ) => new Date( a.start_time ) - new Date( b.start_time )
		);
	} );

	return grouped;
}

/**
 * Initialize Film Showtimes blocks on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const showtimeBlocks = document.querySelectorAll(
		'.wp-block-eventive-film-showtimes'
	);

	showtimeBlocks.forEach( ( block ) => {
		// Get the current post ID from the page
		const postId = document.body.classList.contains( 'single-eventive_film' )
			? document.querySelector( 'article[id^="post-"]' )?.id?.replace( 'post-', '' )
			: null;

		if ( ! postId ) {
			block.innerHTML =
				'<div class="eventive-error">Unable to determine the current post ID.</div>';
			return;
		}

		// Display loading message while fetching
		block.innerHTML = '<div class="eventive-loading">Loading showtimes...</div>';

		// Fetch the film meta from WordPress REST API
		fetch( `/wp-json/wp/v2/eventive_film/${ postId }` )
			.then( ( response ) => {
				if ( ! response.ok ) {
					throw new Error( 'Failed to fetch post data' );
				}
				return response.json();
			} )
			.then( ( post ) => {
				const filmId = post.meta?._eventive_film_id;
				const bucketId =
					post.meta?._eventive_bucket_id ||
					window.EventiveBlockData?.eventBucket ||
					'';

				if ( ! filmId || ! bucketId ) {
					block.innerHTML =
						'<div class="eventive-error">Missing film or bucket configuration.</div>';
					return;
				}

				// Mount React component with the fetched data
				const root = createRoot( block );
				root.render(
					<FilmShowtimes filmId={ filmId } bucketId={ bucketId } />
				);
			} )
			.catch( ( error ) => {
				console.error(
					'[eventive-film-showtimes] Error fetching post data:',
					error
				);
				block.innerHTML =
					'<div class="eventive-error">Unable to load film data. Please try again later.</div>';
			} );
	} );
} );
