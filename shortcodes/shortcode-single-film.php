<?php
function eventive_single_film_or_event($atts) {
    // Enqueue the CSS for the hero-style film/event page
    wp_enqueue_style(
        'eventive-single-film-event-style',
        plugin_dir_url(__FILE__) . '../css/eventive-single-film.css',
        array(),
        '1.0.0'
    );

    // Shortcode attributes
    $atts = shortcode_atts(
        ['film-id' => '', 'event-id' => ''],
        $atts,
        'eventive-single-film'
    );

    $film_id = sanitize_text_field($atts['film-id']);
    $event_id = sanitize_text_field($atts['event-id']);

    if (empty($film_id) && empty($event_id)) {
        return '<div>Please provide either a valid film ID or event ID.</div>';
    }

    // Retrieve Eventive options
    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $event_bucket = $eventive_admin_options['your_eventive_event_bucket_1'];

    ob_start(); // Start output buffering
    ?>
<div id="single-film-or-event-container">
    <div id="hero-section">
        <!-- Hero background with Eventive button -->
    </div>
    <div id="details-container">
        <!-- Film or Event details will be dynamically loaded here -->
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        const heroSection = document.getElementById('hero-section');
        const detailsContainer = document.getElementById('details-container');

        if (window.Eventive) {
            Eventive.on('ready', function () {
                if ('<?php echo esc_js($film_id); ?>') {
                    // Fetch Film Details
                    const filmDetailsUrl = `films/<?php echo esc_js($film_id); ?>`;
                    const eventsUrl = `event_buckets/<?php echo esc_js($event_bucket); ?>/films/<?php echo esc_js($film_id); ?>/events`;

                    Eventive.request({ method: 'GET', path: filmDetailsUrl })
                        .then(film => {
                            // HERO Section
                            heroSection.style.backgroundImage = `url('${film.cover_image || ''}')`;
                            heroSection.innerHTML = `
                                <div class="hero-overlay">
                                    <h1 class="film-title">${film.name}</h1>
                                </div>`;

                            // Film Details
                            const tagsHTML = (film.tags || []).map(tag => 
                                `<span class="film-tag">${tag.name}</span>`
                            ).join('');

                            detailsContainer.innerHTML = `
                                <div class="film-details">
                                    <h2>About the Film</h2>
                                    <p>${film.description || 'No description available.'}</p>
                                    <div class="film-info">
                                        <div><strong>Director:</strong> ${film.credits?.director || 'Unknown'}</div>
                                        <div><strong>Runtime:</strong> ${film.details?.runtime || 'N/A'} minutes</div>
                                        <div><strong>Year:</strong> ${film.details?.year || 'N/A'}</div>
                                        <div><strong>Language:</strong> ${film.details?.language || 'N/A'}</div>
                                    </div>
                                    <div class="film-tags">${tagsHTML}</div>
                                </div>
                                <div id="film-events-container">
                                    <h2>Upcoming Screenings</h2>
                                </div>`;

                            // Fetch Film Events
                            Eventive.request({ method: 'GET', path: eventsUrl })
                                .then(eventsResponse => {
                                    const eventsContainer = document.getElementById('film-events-container');
                                    const events = eventsResponse.events || [];
                                    if (events.length === 0) {
                                        eventsContainer.innerHTML += '<p>No upcoming screenings found for this film.</p>';
                                    } else {
                                        eventsContainer.innerHTML += events.map(event => `
                                            <div class="event-item">
                                                <h3>${event.name}</h3>
                                                <p>${new Date(event.start_time).toLocaleString()}</p>
                                                <div class="eventive-button" data-event="${event.id}"></div>
                                            </div>`).join('');
                                    }
                                    Eventive.rebuild();
                                });
                        });
                } else if ('<?php echo esc_js($event_id); ?>') {
                    // Fetch Event Details
                    const eventDetailsUrl = `events/<?php echo esc_js($event_id); ?>`;

                    Eventive.request({ method: 'GET', path: eventDetailsUrl })
                        .then(event => {
                            // HERO Section
                            heroSection.style.backgroundImage = `url('${event.films?.[0]?.cover_image || ''}')`;
                            heroSection.innerHTML = `
                                <div class="hero-overlay">
                                    <h1 class="event-title">${event.name}</h1>
                                    <div class="eventive-button" data-event="${event.id}"></div>
                                </div>`;

                            // Event Details
                            const filmsHTML = (event.films || []).map(film => `
                                <div class="film-card">
                                    <img src="${film.poster_image}" alt="${film.name}" class="film-poster">
                                    <h3>${film.name}</h3>
                                    <p>${film.description || 'No description available.'}</p>
                                </div>
                            `).join('');

                            detailsContainer.innerHTML = `
                                <div class="event-details">
                                    <h2>About the Event</h2>
                                    <p>${event.description || 'No description available.'}</p>
                                    <div class="event-info">
                                        <div><strong>Venue:</strong> ${event.venue?.name || 'N/A'}</div>
                                        <div><strong>Date & Time:</strong> ${new Date(event.start_time).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div class="event-films">
                                    <h2>Featured Films</h2>
                                    <div class="films-container">
                                        ${filmsHTML}
                                    </div>
                                </div>`;
                            Eventive.rebuild();
                        });
                }
            });
        } else {
            console.error('Eventive API is not initialized.');
            heroSection.innerHTML = '<p>Eventive API is not available. Please check your integration.</p>';
        }
    });
</script>
    <?php

    return ob_get_clean();
}

add_shortcode('eventive-single-film', 'eventive_single_film_or_event');