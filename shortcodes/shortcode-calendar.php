<?php
function eventive_month_calendar($atts) {

    wp_enqueue_style(
        'eventive-calendar',
        plugin_dir_url(__FILE__) . '../css/eventive-calendar.css',
        [],
        '1.0.0'
    );

    // Retrieve options
    $eventive_admin_options_options = get_option('eventive_admin_options_option_name');
    $your_eventive_secret_key_2 = $eventive_admin_options_options['your_eventive_secret_key_2'];
    $your_eventive_event_bucket_1 = $eventive_admin_options_options['your_eventive_event_bucket_1'];

    ob_start();
    ?>

    <div id="calendarElement" data-event-bucket="<?php echo esc_attr($your_eventive_event_bucket_1); ?>"></div>

    <!-- Modal -->
    <div id="eventModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <div id="modal-details"></div>
        </div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const eventBucket = "<?php echo esc_js($your_eventive_event_bucket_1); ?>";
        const apiKey = "<?php echo esc_js($your_eventive_secret_key_2); ?>";
        let globalEventList = [];
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth();

        // Helper: Get accessible text color
        const getAccessibleTextColor = (backgroundColor) => {
            const hexToRgb = hex => {
                const bigint = parseInt(hex.slice(1), 16);
                return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
            };
            const [r, g, b] = hexToRgb(backgroundColor);
            const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            return luminance > 0.5 ? '#000000' : '#ffffff';
        };

        // Helper: Get venue details
        const getVenueDetails = (event) => {
            if (event.is_virtual) {
                return { name: 'Watch Online', color: '#9b59b6' };
            } else if (event.venue && event.venue.name) {
                return { name: event.venue.name, color: event.venue.color || '#ccc' };
            }
            return { name: 'Unknown Location', color: '#ccc' };
        };

        // Initialize Eventive API
        window.Eventive.on('ready', function() {
            window.Eventive.request({
                method: 'GET',
                path: `event_buckets/${eventBucket}/events?upcoming_only=true`,
                headers: { 'x-api-key': apiKey }
            }).then(response => {
                globalEventList = response.events;
                initializeEventCalendar();
            }).catch(error => console.error('Error fetching events:', error));
        });

        // Initialize Calendar
        const initializeEventCalendar = () => generateCalendar(currentYear, currentMonth);

        const generateCalendar = (year, month) => {
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
            const formattedMonthYear = `${monthNames[month]} ${year}`;

            let calendarHtml = `
            <div class="calendar-controls">
                <button id="prev-month">← Prev</button>
                <h2 id="current-month-year">${formattedMonthYear}</h2>
                <button id="next-month">Next →</button>
            </div>
            <table class="eventive-cal-table">
                <thead>
                    <tr>${dayNames.map(day => `<th>${day}</th>`).join('')}</tr>
                </thead>
                <tbody>`;

            let currentDay = 1;
            let currentWeekday = firstDay;

            // Add empty cells before first day of the month
            calendarHtml += '<tr>' + '<td class="empty"></td>'.repeat(firstDay);

            while (currentDay <= daysInMonth) {
                if (currentWeekday === 0) calendarHtml += '<tr>';

                const eventsForDay = globalEventList.filter(event => {
                    if (event.is_virtual && !event.start_time && !event.end_time) return true;
                    const eventDate = new Date(event.start_time);
                    return eventDate.getDate() === currentDay && eventDate.getMonth() === month && eventDate.getFullYear() === year;
                });

                let dayCellContent = '';
                eventsForDay.forEach(event => {
                    const venueDetails = getVenueDetails(event);
                    const startTime = event.start_time
                        ? new Date(event.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).replace(':00', '')
                        : event.is_virtual ? 'All Day' : 'No Start Time';

                    dayCellContent += `
                    <div class="event-name" 
                         data-event-id="${event.id}" 
                         data-venue-name="${venueDetails.name}" 
                         style="background-color: ${venueDetails.color}; color: ${getAccessibleTextColor(venueDetails.color)};">
                         ${event.name} - ${startTime}
                    </div>`;
                });

                calendarHtml += `<td class="eventive-cal-day"><div>${currentDay}${dayCellContent}</div></td>`;
                currentDay++;
                currentWeekday = (currentWeekday + 1) % 7;
                if (currentWeekday === 0) calendarHtml += '</tr>';
            }

            // Add empty cells after last day of the month
            if (currentWeekday > 0) {
                calendarHtml += '<td class="empty"></td>'.repeat(7 - currentWeekday) + '</tr>';
            }
            calendarHtml += '</tbody></table>';
            document.getElementById('calendarElement').innerHTML = calendarHtml;

            setupCalendarNavigation();
            setupEventTitleClick();
        };

        const setupCalendarNavigation = () => {
            document.getElementById('prev-month').addEventListener('click', () => {
                currentMonth = (currentMonth - 1 + 12) % 12;
                if (currentMonth === 11) currentYear--;
                generateCalendar(currentYear, currentMonth);
            });

            document.getElementById('next-month').addEventListener('click', () => {
                currentMonth = (currentMonth + 1) % 12;
                if (currentMonth === 0) currentYear++;
                generateCalendar(currentYear, currentMonth);
            });
        };

        const setupEventTitleClick = () => {
            document.getElementById('calendarElement').addEventListener('click', function(event) {
                if (event.target.classList.contains('event-name')) showModal(event.target.dataset.eventId);
            });
        };
        const showModal = (eventId) => {
    const event = globalEventList.find(e => e.id === eventId);
    if (!event) return console.error('Event not found for ID:', eventId);

    // Venue Details
    const venueDetails = getVenueDetails(event);

    // Start Time
    const startTime = event.start_time
        ? new Date(event.start_time).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(':00', '') // Remove trailing ":00"
        : event.is_virtual ? 'All Day' : 'No Start Time';

    // Tags
    const tagsFormatted = (event.tags || []).map(tag => `
        <button class="tag-button film-tag" 
                style="background: ${tag.color || '#ccc'}; color: ${getAccessibleTextColor(tag.color || '#ccc')};">
            ${tag.name || 'Unknown Tag'}
        </button>
    `).join('') || '<span class="tag">No Tags</span>';

 // Films content
 let filmsContent = '';
        if (event.films && event.films.length > 0) {
            event.films.forEach(film => {
                const posterImage = film.poster_image || 'default-image-url.jpg';
                filmsContent += `
                    <div class="film-card">
                        <div class="film-card-content">
                            <h3>${film.name || 'No Title'}</h3>
                            <p>${film.description || 'No Description'}</p>
                        </div>
                        <div class="film-poster">
                            <img src="${posterImage}" alt="${film.name || 'No Title'}">
                        </div>
                    </div>`;
            });
        } else {
            filmsContent = `
                <div class="film-card">
                    <div class="film-card-content">
                        <h3>${event.name || 'No Title'}</h3>
                        <p>${event.description || 'No Description'}</p>
                    </div>
                </div>`;
        }

    // Event Details Template
    const eventDetails = `
        <div class="event-details">
            <div class="details-left">
                <h2>${event.name || 'No Title'}</h2>
                <p>Start Time: ${startTime}</p>
                <p>Location: 
                    <span class="venue-tag" style="background: ${venueDetails.color}; color: ${getAccessibleTextColor(venueDetails.color)};">
                        ${venueDetails.name}
                    </span>
                </p>
                <div class="tags">${tagsFormatted}</div>
            </div>
            <div class="details-right">
                <div class="eventive-button" data-event="${event.id}"></div>
            </div>
            <div class="films-container">${filmsContent}</div>
        </div>`;

    // Insert Details into Modal
    const modal = document.getElementById('eventModal');
    const modalDetails = document.getElementById('modal-details');
    modalDetails.innerHTML = eventDetails;

    // Show Modal
    modal.style.display = 'block';

    // Close Button Functionality
    document.querySelector('.close').onclick = () => modal.style.display = 'none';

    // Ensure Eventive Button is Rendered
    if (window.Eventive) {
        window.Eventive.rebuild();
    } else {
        console.error('Eventive object not found. Ensure Eventive script is properly loaded.');
    }
};
    });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive_month_calendar', 'eventive_month_calendar');
?>