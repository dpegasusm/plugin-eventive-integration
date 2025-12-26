/**
 * Eventive Single Film Block (Selector) - Edit Component
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';

/**
 * Edit component - renders the block in the editor
 *
 * @param {Object}   props               Block properties
 * @param {Object}   props.attributes    Block attributes
 * @param {Function} props.setAttributes Function to update attributes
 * @param {string}   props.clientId      Block client ID
 * @return {JSX.Element} Edit component
 */
export default function Edit( { attributes, setAttributes, clientId } ) {
	const blockProps = useBlockProps();
	const { type, id } = attributes;

	const [ films, setFilms ] = useState( [] );
	const [ events, setEvents ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ didFetch, setDidFetch ] = useState( false );

	// Detect if the block is currently selected in the editor
	const isSelected = useSelect(
		( select ) =>
			select( 'core/block-editor' ).getSelectedBlockClientId() === clientId,
		[ clientId ]
	);

	// Data-fetching function
	const fetchData = async () => {
		setIsLoading( true );
		setError( null );

		try {
			// Ensure Eventive script is loaded
			if ( ! window.Eventive || ! window.Eventive.request ) {
				throw new Error(
					'Eventive API is not available. Ensure the loader script is properly initialized.'
				);
			}

			const { apiKey, eventBucket } = window.EventiveBlockData || {};
			if ( ! apiKey || ! eventBucket ) {
				throw new Error( 'Missing API key or event bucket.' );
			}

			// Fetch films & events in parallel
			const [ filmsResponse, eventsResponse ] = await Promise.allSettled( [
				window.Eventive.request( {
					method: 'GET',
					path: `/event_buckets/${ eventBucket }/films/`,
					headers: { 'x-api-key': apiKey },
				} ),
				window.Eventive.request( {
					method: 'GET',
					path: `/event_buckets/${ eventBucket }/events/`,
					headers: { 'x-api-key': apiKey },
				} ),
			] );

			// Handle films response
			if ( filmsResponse.status === 'fulfilled' ) {
				const fetchedFilms = filmsResponse.value.films || [];
				setFilms(
					fetchedFilms.map( ( film ) => ( {
						label: film.name,
						value: film.id,
					} ) )
				);
			} else {
				console.error( 'Failed to fetch films:', filmsResponse.reason );
				setFilms( [] );
			}

			// Handle events response
			if ( eventsResponse.status === 'fulfilled' ) {
				const fetchedEvents = eventsResponse.value.events || [];
				setEvents(
					fetchedEvents.map( ( event ) => ( {
						label: `${ event.name } - ${ new Date(
							event.start_time
						).toLocaleString() }`,
						value: event.id,
					} ) )
				);
			} else {
				console.error( 'Failed to fetch events:', eventsResponse.reason );
				setEvents( [] );
			}
		} catch ( err ) {
			console.error( 'Failed to fetch data:', err.message );
			setError( err.message );
		} finally {
			setIsLoading( false );
		}
	};

	// Fetch data the first time the block is selected
	useEffect( () => {
		if ( isSelected && ! didFetch ) {
			fetchData();
			setDidFetch( true );
		}
	}, [ isSelected, didFetch ] );

	// Construct a live preview of the shortcode
	const shortcode = id
		? `[eventive-single-film ${ type }-id="${ id }"]`
		: 'Shortcode will appear here when a valid ID is selected.';

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Film/Event Settings', 'eventive' ) }>
					<SelectControl
						label={ __( 'Type', 'eventive' ) }
						value={ type }
						options={ [
							{ label: 'Film', value: 'film' },
							{ label: 'Event', value: 'event' },
						] }
						onChange={ ( newType ) => setAttributes( { type: newType } ) }
					/>
					{ type === 'film' && (
						<SelectControl
							label={ __( 'Select Film', 'eventive' ) }
							value={ id }
							options={
								isLoading
									? [ { label: 'Loading films...', value: '' } ]
									: films.length
									? films
									: [ { label: 'No films available', value: '' } ]
							}
							onChange={ ( newId ) => setAttributes( { id: newId } ) }
						/>
					) }
					{ type === 'event' && (
						<SelectControl
							label={ __( 'Select Event', 'eventive' ) }
							value={ id }
							options={
								isLoading
									? [ { label: 'Loading events...', value: '' } ]
									: events.length
									? events
									: [ { label: 'No events available', value: '' } ]
							}
							onChange={ ( newId ) => setAttributes( { id: newId } ) }
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="eventive-block-placeholder">
					<h3>{ __( 'Single Film Block (Selector)', 'eventive' ) }</h3>
					{ error ? (
						<p className="error">{ __( 'Error:', 'eventive' ) } { error }</p>
					) : (
						<p className="shortcode-preview">{ shortcode }</p>
					) }
				</div>
			</div>
		</>
	);
}
