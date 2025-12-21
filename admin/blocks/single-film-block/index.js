const { registerBlockType } = wp.blocks;
const { createElement: el, useState, useEffect } = wp.element;
const { InspectorControls } = wp.blockEditor;
const { useSelect } = wp.data;
const { PanelBody, SelectControl } = wp.components;

registerBlockType('eventive/single-film-block', {
    title: 'Single Film Block',
    icon: 'video-alt',
    category: 'eventive-blocks',
    attributes: {
        type: {
            type: 'string',
            default: 'film', // Default to "film"
        },
        id: {
            type: 'string',
            default: '', // Default empty ID
        },
    },
    edit: (props) => {
        const { attributes, setAttributes, clientId } = props;
        const { type, id } = attributes;

        const [films, setFilms] = useState([]);
        const [events, setEvents] = useState([]);
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState(null);

        // Track whether we’ve fetched data already
        const [didFetch, setDidFetch] = useState(false);

        // Detect if the block is currently selected in the editor
        const isSelected = useSelect(
            (select) => select('core/block-editor').getSelectedBlockClientId() === clientId,
            [clientId]
        );

        // Our data-fetching function
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Ensure Eventive script is loaded
                if (!window.Eventive || !window.Eventive.request) {
                    throw new Error(
                        'Eventive API is not available. Ensure the loader script is properly initialized.'
                    );
                }

                const { apiKey, eventBucket } = window.EventiveBlockData || {};
                if (!apiKey || !eventBucket) {
                    throw new Error('Missing API key or event bucket.');
                }

                // Fetch films & events in parallel
                const [filmsResponse, eventsResponse] = await Promise.allSettled([
                    window.Eventive.request({
                        method: 'GET',
                        path: `/event_buckets/${eventBucket}/films/`,
                        headers: { 'x-api-key': apiKey },
                    }),
                    window.Eventive.request({
                        method: 'GET',
                        path: `/event_buckets/${eventBucket}/events/`,
                        headers: { 'x-api-key': apiKey },
                    }),
                ]);

                // Handle films response
                if (filmsResponse.status === 'fulfilled') {
                    const fetchedFilms = filmsResponse.value.films || [];
                    setFilms(
                        fetchedFilms.map((film) => ({
                            label: film.name,
                            value: film.id,
                        }))
                    );
                } else {
                    console.error('Failed to fetch films:', filmsResponse.reason);
                    setFilms([]);
                }

                // Handle events response
                if (eventsResponse.status === 'fulfilled') {
                    const fetchedEvents = eventsResponse.value.events || [];
                    setEvents(
                        fetchedEvents.map((event) => ({
                            label: `${event.name} - ${new Date(event.start_time).toLocaleString()}`,
                            value: event.id,
                        }))
                    );
                } else {
                    console.error('Failed to fetch events:', eventsResponse.reason);
                    setEvents([]);
                }
            } catch (err) {
                console.error('Failed to fetch data:', err.message);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        // useEffect to fetch data the FIRST time the block is selected
        useEffect(() => {
            if (isSelected && !didFetch) {
                fetchData();
                setDidFetch(true);
            }
        }, [isSelected, didFetch]);

        // Construct a live preview of the shortcode
        const shortcode = id
            ? `[eventive-single-film ${type}-id="${id}"]`
            : 'Shortcode will appear here when a valid ID is selected.';

        return el(
            'div',
            { className: 'eventive-single-film-block' },
            [
                // Inspector controls (sidebar)
                el(
                    InspectorControls,
                    null,
                    el(
                        PanelBody,
                        { title: 'Settings' },
                        [
                            el(SelectControl, {
                                label: 'Type (film or event)',
                                value: type,
                                options: [
                                    { label: 'Film', value: 'film' },
                                    { label: 'Event', value: 'event' },
                                ],
                                // If you want to clear the ID when switching type, uncomment:
                                // onChange: (newType) => setAttributes({ type: newType, id: '' }),
                                onChange: (newType) => setAttributes({ type: newType }),
                            }),
                            type === 'film' &&
                                el(SelectControl, {
                                    label: 'Select Film',
                                    value: id,
                                    options: isLoading
                                        ? [{ label: 'Loading films...', value: '' }]
                                        : films.length
                                        ? films
                                        : [{ label: 'No films available', value: '' }],
                                    onChange: (newId) => setAttributes({ id: newId }),
                                }),
                            type === 'event' &&
                                el(SelectControl, {
                                    label: 'Select Event',
                                    value: id,
                                    options: isLoading
                                        ? [{ label: 'Loading events...', value: '' }]
                                        : events.length
                                        ? events
                                        : [{ label: 'No events available', value: '' }],
                                    onChange: (newId) => setAttributes({ id: newId }),
                                }),
                        ]
                    )
                ),
                // Block content/preview in the editor
                el(
                    'p',
                    { className: 'shortcode-preview' },
                    error ? `Error: ${error}` : shortcode
                ),
            ]
        );
    },
    save: ({ attributes }) => {
        const { type, id } = attributes;
        return `[eventive-single-film ${type}-id="${id}"]`;
    },
});