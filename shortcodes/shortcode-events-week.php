<?php
/**
 * Shortcode to display a weekly calendar (table-based) of events.
 */
function eventive_events_week() {
    wp_enqueue_style(
        'eventive-events-week-style',
        plugin_dir_url(__FILE__) . '../css/eventive-events-week.css', // rename your CSS file as needed
        [],
        '1.0.0'
    );

    $eventive_admin_options = get_option('eventive_admin_options_option_name');
    $event_bucket = $eventive_admin_options['your_eventive_event_bucket_1'] ?? '';
    $api_key = $eventive_admin_options['your_eventive_secret_key_2'] ?? '';

    if (empty($event_bucket) || empty($api_key)) {
        return '<p class="error-message">Eventive event bucket or secret key is not configured. Please check your settings.</p>';
    }

    ob_start();
    ?>
    <div id="weekly-calendar-container" class="weekly-calendar-container">
        <div id="weekly-calendar-controls" class="weekly-calendar-controls">
            <button id="prev-week" class="week-nav-btn">← Previous Week</button>
            <span id="current-week-range">Loading...</span>
            <button id="next-week" class="week-nav-btn">Next Week →</button>
        </div>
        <div id="weekly-calendar-grid" class="weekly-calendar-grid">
            <p>Loading events...</p>
        </div>
        <!-- Event Details Modal -->
        <div id="event-modal" class="event-modal">
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <div id="modal-details"></div>
            </div>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // Ensure Eventive API is loaded
            if (window.Eventive && window.Eventive.on) {
                window.Eventive.on('ready', async function() {
                    const events = await fetchAllEvents();
                    initializeCalendar(events);
                });
            } else {
                console.error('Eventive API is not loaded or not ready.');
            }

            const eventBucket = "<?php echo esc_js($event_bucket); ?>";
            const apiKey = "<?php echo esc_js($api_key); ?>";
            let currentStartDate = getStartOfWeek(new Date());

            /**
             * Initialize the calendar by rendering the current week and setting up event listeners.
             * @param {Array} events - List of events fetched from the API.
             */
            async function initializeCalendar(events) {
                renderWeeklyTable(events);
                updateWeekRangeDisplay();
                setupNavigationButtons(events);
                setupEventTitleClick(events);
            }

            /**
             * Fetch all upcoming events from the Eventive API.
             * @returns {Promise<Array>} - A promise that resolves to an array of events.
             */
            async function fetchAllEvents() {
                try {
                    const response = await window.Eventive.request({
                        method: 'GET',
                        path: `event_buckets/${eventBucket}/events?upcoming_only=true`,
                        headers: { 'x-api-key': apiKey }
                    });
                    console.log('All events fetched:', response.events);
                    return response.events || [];
                } catch (error) {
                    console.error('Error fetching all events:', error);
                    return [];
                }
            }

            /**
             * Calculate the start of the week (Sunday).
             * @param {Date} date - The date to calculate the start of the week from.
             * @returns {Date} - The start date of the week.
             */
            function getStartOfWeek(date) {
                const start = new Date(date);
                start.setHours(0, 0, 0, 0);
                // Sunday is day 0 in JS
                start.setDate(start.getDate() - start.getDay());
                return start;
            }

            /**
             * Render the weekly grid in a table-based layout.
             * @param {Array} events - List of events to display.
             */
  /**
 * Render the weekly grid in a table-based layout.
 * @param {Array} events - List of events to display.
 */
function renderWeeklyTable(events) {
    const container = document.getElementById('weekly-calendar-grid');
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 8 AM to 8 PM

    // Filter events to the current week
    const weekEvents = filterEventsForWeek(events);

    // Build the table header
    let tableHtml = '<div class="calendar-grid">';
    tableHtml += '<div class="time-column"></div>'; // Placeholder for time column header
    daysOfWeek.forEach(day => {
        tableHtml += `<div class="day-header">${day.substring(0, 3)}</div>`;
    });

    // Build the table body
    hours.forEach(hour => {
        const hourFormatted = formatHour(hour);
        tableHtml += `<div class="time-label">${hourFormatted}</div>`; // Time labels

        // Each day column
        daysOfWeek.forEach((_, dayIndex) => {
            const eventsAtTime = weekEvents.filter(event => {
                const eventDate = new Date(event.start_time);
                const eventHour = eventDate.getHours();
                return eventDate.getDay() === dayIndex && eventHour === hour;
            });

            // Build event boxes
            let eventBoxes = '';
            eventsAtTime.forEach(event => {
                eventBoxes += `
                    <div class="event-box" data-event-id="${event.id}" 
                         title="${event.name}">${event.name}
                    </div>
                `;
            });

            tableHtml += `<div class="time-slot">${eventBoxes}</div>`;
        });
    });

    tableHtml += '</div>'; // Close grid container
    container.innerHTML = tableHtml;
}
            /**
             * Format the hour for display (e.g., 10 -> 10:00 AM).
             * @param {number} hour - The hour in 24-hour format.
             * @returns {string} - The formatted hour string.
             */
            function formatHour(hour) {
                const amPm = hour >= 12 ? 'PM' : 'AM';
                const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
                return `${formattedHour}:00 ${amPm}`;
            }

            /**
             * Calculate the height of an event box based on its duration.
             * @param {Object} event - The event object containing start and end times.
             * @returns {number} - The height in pixels.
             */
            function calculateEventHeight(event) {
                const eventStart = new Date(event.start_time);
                const eventEnd = new Date(event.end_time);
                const durationInHours = (eventEnd - eventStart) / (1000 * 60 * 60);
                // Ensure a minimum height for short events
                return Math.max(20, durationInHours * 60);
            }

            /**
             * Filter events to include only those within the current week.
             * @param {Array} events - List of all events.
             * @returns {Array} - Filtered list of events for the current week.
             */
            function filterEventsForWeek(events) {
                const weekStart = new Date(currentStartDate);
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart);
                // End is the last millisecond of day 6
                weekEnd.setDate(weekStart.getDate() + 7);
                weekEnd.setMilliseconds(-1);

                return events.filter(event => {
                    const eventDate = new Date(event.start_time);
                    return eventDate >= weekStart && eventDate <= weekEnd;
                });
            }

            /**
             * Update the week range display (e.g., "Week of Jan 1 - Jan 7").
             */
            function updateWeekRangeDisplay() {
                const weekStart = new Date(currentStartDate);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                const options = { month: 'short', day: 'numeric' };
                const weekStartStr = weekStart.toLocaleDateString(undefined, options);
                const weekEndStr = weekEnd.toLocaleDateString(undefined, options);

                const weekRangeText = `Week of ${weekStartStr} - ${weekEndStr}`;
                document.getElementById('current-week-range').textContent = weekRangeText;
            }

            /**
             * Set up event listeners for navigation buttons.
             * @param {Array} events - List of events to display.
             */
            function setupNavigationButtons(events) {
                document.getElementById('prev-week').addEventListener('click', function() {
                    currentStartDate.setDate(currentStartDate.getDate() - 7);
                    updateWeekRangeDisplay();
                    renderWeeklyTable(events);
                });

                document.getElementById('next-week').addEventListener('click', function() {
                    currentStartDate.setDate(currentStartDate.getDate() + 7);
                    updateWeekRangeDisplay();
                    renderWeeklyTable(events);
                });
            }

            /**
             * Set up click event listeners for event boxes to show modals.
             * @param {Array} events - List of events to display.
             */
            function setupEventTitleClick(events) {
                const gridContainer = document.getElementById('weekly-calendar-grid');
                gridContainer.addEventListener('click', function(event) {
                    const box = event.target.closest('.event-box');
                    if (box) {
                        const eventId = box.getAttribute('data-event-id');
                        const eventObj = events.find(e => e.id === eventId);
                        if (eventObj) {
                            showModal(eventObj);
                        } else {
                            console.error('Event not found for ID:', eventId);
                        }
                    }
                });
            }

            /**
             * Display the event details modal.
             * @param {Object} event - The event object to display.
             */
            function showModal(event) {
                const modal = document.getElementById('event-modal');
                const modalDetails = document.getElementById('modal-details');

                // Build and display modal content
                modalDetails.innerHTML = buildEventDetailsHTML(event);
                modal.style.display = 'block';

                // Close modal functionality
                document.querySelector('.close-modal').addEventListener('click', function() {
                    modal.style.display = 'none';
                });

                window.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });

                // Ensure Eventive buttons are rebuilt and rendered correctly
                if (window.Eventive && typeof window.Eventive.rebuild === 'function') {
                    window.Eventive.rebuild();
                } else {
                    console.error('Eventive API is not available to rebuild buttons.');
                }
            }

            /**
             * Build the HTML content for the event details modal.
             * @param {Object} event - The event object to display.
             * @returns {string} - The HTML string for the modal content.
             */
            function buildEventDetailsHTML(event) {
                const venueDetails = getVenueDetails(event);
                const startTime = event.start_time
                    ? new Date(event.start_time).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    }).replace(':00', '')
                    : event.is_virtual ? 'All Day' : 'No Start Time';

                // Tags
                const tagsFormatted = (event.tags || []).map(tag => `
                    <button class="tag-button film-tag" style="background: ${tag.color || '#ccc'}; color: ${getAccessibleTextColor(tag.color || '#ccc')};">
                        ${tag.name || 'Unknown Tag'}
                    </button>
                `).join('') || '<span class="tag">No Tags</span>';

                // Films
                let filmsContent = '';
                if (event.films && event.films.length > 0) {
                    filmsContent = event.films.map(film => `
                        <div class="film-card">
                            <div class="film-card-content">
                                <h3>${film.name || 'No Title'}</h3>
                                <p>${film.description || 'No Description'}</p>
                            </div>
                            <div class="film-poster">
                                <img src="${film.poster_image || 'default-image-url.jpg'}" alt="${film.name || 'No Title'}">
                            </div>
                        </div>
                    `).join('');
                } else {
                    filmsContent = `
                        <div class="film-card">
                            <div class="film-card-content">
                                <h3>${event.name || 'No Title'}</h3>
                                <p>${event.description || 'No Description'}</p>
                            </div>
                        </div>`;
                }

                return `
                    <div class="event-details">
                        <div class="details-left">
                            <h2>${event.name || 'No Title'}</h2>
                            <p>Start Time: ${startTime}</p>
                            <p>
                                Location: 
                                <span class="venue-tag" style="background: ${venueDetails.color}; color: ${getAccessibleTextColor(venueDetails.color)};">
                                    ${venueDetails.name}
                                </span>
                            </p>
                            <div class="tags">${tagsFormatted}</div>
                        </div>
                        <div class="details-right">
                            <!-- Eventive "Buy Tickets" or "Register" button goes here -->
                            <div class="eventive-button" data-event="${event.id}"></div>
                        </div>
                        <div class="films-container">
                            ${filmsContent}
                        </div>
                    </div>`;
            }

            /**


            /**
             * Get venue details based on event data.
             * @param {Object} event - The event object.
             * @returns {Object} - An object containing venue name and color.
             */
            function getVenueDetails(event) {
                if (event.is_virtual) {
                    return { name: 'Watch Online', color: '#9b59b6' };
                } else if (event.venue && event.venue.name) {
                    return { name: event.venue.name, color: event.venue.color || '#ccc' };
                }
                return { name: 'Unknown Location', color: '#ccc' };
            }

            /**
             * Determine accessible text color based on background color.
             * @param {string} backgroundColor - The background color in HEX format.
             * @returns {string} - The accessible text color ('#000000' or '#ffffff').
             */
            function getAccessibleTextColor(backgroundColor) {
                const color = backgroundColor.replace('#', '');
                const r = parseInt(color.substr(0, 2), 16);
                const g = parseInt(color.substr(2, 2), 16);
                const b = parseInt(color.substr(4, 2), 16);
                // Standard luminance calculation
                return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#ffffff';
            }
        });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive-events-week', 'eventive_events_week');
?>