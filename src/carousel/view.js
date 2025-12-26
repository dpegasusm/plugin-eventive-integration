/**
 * Eventive Carousel Block - Frontend View Script
 *
 * @package
 * @since 1.0.0
 */

import { createRoot, useState, useEffect, useRef } from '@wordpress/element';

/**
 * Get cover image helper
 * @param event
 */
function getCoverImage( event ) {
	const img =
		( event.images &&
			( event.images.cover_image || event.images.cover ) ) ||
		event.cover_image ||
		( event.films &&
			event.films[ 0 ] &&
			( event.films[ 0 ].still_image ||
				event.films[ 0 ].cover_image ||
				event.films[ 0 ].poster_image ) );
	return img || '';
}

/**
 * Carousel Slide component
 * @param root0
 * @param root0.event
 * @param root0.isActive
 */
function CarouselSlide( { event, isActive } ) {
	const name = event.name || 'Untitled Event';
	const dt = event.start_time ? new Date( event.start_time ) : null;
	const time = dt
		? dt
				.toLocaleTimeString( 'en-US', {
					hour: 'numeric',
					minute: '2-digit',
				} )
				.toLowerCase()
		: 'Time not available';
	const date = dt
		? dt.toLocaleDateString( 'en-US', {
				weekday: 'long',
				month: 'long',
				day: 'numeric',
		  } )
		: 'Date not available';
	const venue =
		event.venue && event.venue.name ? ` at ${ event.venue.name }` : '';
	const img = getCoverImage( event );
	const showButton = ! event.hide_tickets_button;

	return (
		<div
			className={ `carousel-slide ${ isActive ? 'active' : '' }` }
			style={ { backgroundImage: `url('${ img }')` } }
		>
			<div className="carousel-banner">
				<h3 className="carousel-title">{ name }</h3>
				<p className="carousel-time">
					{ date } • { time }
					{ venue }
				</p>
				{ showButton && (
					<div className="carousel-ticket-button">
						<div
							className="eventive-button"
							data-event={ event.id }
						/>
					</div>
				) }
			</div>
		</div>
	);
}

/**
 * Carousel component
 * @param root0
 * @param root0.limit
 * @param root0.showDescription
 */
function EventiveCarousel( { limit, showDescription } ) {
	const [ events, setEvents ] = useState( [] );
	const [ currentSlide, setCurrentSlide ] = useState( 0 );
	const [ isLoading, setIsLoading ] = useState( true );
	const [ isPaused, setIsPaused ] = useState( false );
	const containerRef = useRef( null );
	const autoplayRef = useRef( null );

	const eventBucket = window.EventiveBlockData?.eventBucket || '';

	useEffect( () => {
		if ( ! eventBucket ) {
			setIsLoading( false );
			return;
		}

		const fetchEvents = async () => {
			try {
				const endpoints = window.EventiveBlockData?.apiEndpoints || {};
				const nonce = window.EventiveBlockData?.eventNonce || '';

				const response = await wp.apiFetch( {
					path: `/eventive/v1/${ endpoints.event_buckets }?bucket_id=${ eventBucket }&endpoint=events&upcoming_only=true&eventive_nonce=${ nonce }`,
					method: 'GET',
				} );

				const eventList = response.events || [];
				setEvents( eventList.slice( 0, limit ) );
				setIsLoading( false );
			} catch ( error ) {
				console.error( 'Error fetching events:', error );
				setIsLoading( false );
			}
		};

		fetchEvents();
	}, [ eventBucket, limit ] );

	// Auto-advance slides
	useEffect( () => {
		if ( events.length <= 1 || isPaused ) {
			return;
		}

		// Check for reduced motion preference
		const prefersReducedMotion =
			window.matchMedia &&
			window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

		if ( prefersReducedMotion ) {
			return;
		}

		autoplayRef.current = setInterval( () => {
			setCurrentSlide( ( prev ) => ( prev + 1 ) % events.length );
		}, 5000 );

		return () => {
			if ( autoplayRef.current ) {
				clearInterval( autoplayRef.current );
			}
		};
	}, [ events.length, isPaused ] );

	// Rebuild Eventive buttons when slide changes
	useEffect( () => {
		if ( events.length > 0 && containerRef.current ) {
			setTimeout( () => {
				if ( window.Eventive && window.Eventive.rebuild ) {
					window.Eventive.rebuild( containerRef.current );
				}
			}, 100 );
		}
	}, [ currentSlide, events ] );

	const goToSlide = ( index ) => {
		setCurrentSlide( index );
	};

	const nextSlide = () => {
		setCurrentSlide( ( prev ) => ( prev + 1 ) % events.length );
	};

	const prevSlide = () => {
		setCurrentSlide(
			( prev ) => ( prev - 1 + events.length ) % events.length
		);
	};

	if ( isLoading ) {
		return <div className="carousel-loading">Loading events...</div>;
	}

	if ( events.length === 0 ) {
		return <div className="carousel-error">No upcoming events found.</div>;
	}

	return (
		<div
			ref={ containerRef }
			className="event-carousel-container"
			onMouseEnter={ () => setIsPaused( true ) }
			onMouseLeave={ () => setIsPaused( false ) }
		>
			<div className="carousel-slider">
				<button
					className="carousel-arrow left"
					onClick={ prevSlide }
					aria-label="Previous"
				>
					‹
				</button>
				<button
					className="carousel-arrow right"
					onClick={ nextSlide }
					aria-label="Next"
				>
					›
				</button>

				<div className="carousel-slides">
					{ events.map( ( event, index ) => (
						<CarouselSlide
							key={ event.id }
							event={ event }
							isActive={ index === currentSlide }
						/>
					) ) }
				</div>

				<div className="carousel-dots">
					{ events.map( ( _, index ) => (
						<button
							key={ index }
							className={ `carousel-dot ${
								index === currentSlide ? 'active' : ''
							}` }
							onClick={ () => goToSlide( index ) }
							aria-label={ `Go to slide ${ index + 1 }` }
						/>
					) ) }
				</div>
			</div>
		</div>
	);
}

/**
 * Initialize the block on page load
 */
document.addEventListener( 'DOMContentLoaded', () => {
	const containers = document.querySelectorAll(
		'.wp-block-eventive-eventive-carousel'
	);

	containers.forEach( ( container ) => {
		const limit = parseInt( container.dataset.limit || '10', 10 );
		const showDescription = container.dataset.showDescription === 'true';

		const root = createRoot( container );
		root.render(
			<EventiveCarousel
				limit={ limit }
				showDescription={ showDescription }
			/>
		);
	} );
} );
