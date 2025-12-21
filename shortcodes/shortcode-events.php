<?php
/**
 * Eventive WP — [eventive-events] Shortcode
 *
 * Purpose
 * -------
 * Render upcoming, in‑person Eventive events from a configured Event Bucket and output
 * Eventive Everywhere ticket buttons that are hydrated by Eventive’s loader.
 *
 * Requirements
 * ------------
 * • WordPress admin settings (saved under option `eventive_admin_options_option_name`) must include:
 *   - `your_eventive_event_bucket_1`   → The Eventive "event bucket" ID/slug to query
 *   - `your_eventive_secret_key_2`     → Secret key used to authorize Eventive requests elsewhere
 * • Eventive’s loader must be present and initialize `window.Eventive` on the page where the shortcode renders.
 *   (This file calls `Eventive.on('ready', ...)` and `Eventive.request(...)`; without the loader, it will show an error.)
 * • The file enqueues `/css/eventive-events.css` next to this shortcode for basic layout/styling.
 *
 * Shortcode
 * ---------
 *   [eventive-events tag_id="" venue_id="" image="poster|cover|still" description="true|false"]
 *
 * Attributes (all optional)
 * -------------------------
 * • tag_id
 *   - Type: string (Eventive Tag ID — the canonical ID, not the human name or slug)
 *   - Use: Filters results to events carrying this tag.
 *
 * • venue_id
 *   - Type: string (Eventive Venue ID)
 *   - Use: Filters results to events at this venue.
 *
 * • image
 *   - Type: string; one of `poster`, `cover`, or `still`
 *   - Use: Controls whether the image appears to the left (poster) or spans the top (cover/still) and which film image to prefer.
 *   - Default: `poster`
 *
 * • description
 *   - Type: boolean-like string; `true` or `false`
 *   - Use: Toggle rendering of the event description to enable a tighter grid.
 *   - Default: `true`
 *
 * Behavior
 * --------
 * • Calls GET `/event_buckets/{bucket}/events` with `upcoming_only=true` and optional `tag-id`/`venue-id` query params.
 * • Filters out virtual events (`event.is_virtual === true`).
 * • Groups remaining events by calendar date (based on the event `start_time`).
 * • Renders image, title, time, venue, optional description, and a BUY TICKETS button.
 * • After injecting markup, calls `Eventive.rebuild()` so Eventive Everywhere buttons hydrate.
 *
 * @shortcode  [eventive-events]
 * @since      1.1.0
 * @author     Cold Coffee Media
 */
function eventive_schedule($atts) {
    // Enqueue the CSS for the eventive-events
    wp_enqueue_style(
        'eventive-events-style',
        plugin_dir_url(__FILE__) . '../css/eventive-events.css',
        array(),
        '1.1.0'
    );
    $eventive_admin_options = get_option('eventive_admin_options_option_name');

    if (empty($eventive_admin_options['your_eventive_event_bucket_1']) || empty($eventive_admin_options['your_eventive_secret_key_2'])) {
        return '<p class="error-message">Eventive event bucket or secret key is not configured. Please check your settings.</p>';
    }

    $atts = shortcode_atts([
        'tag_id' => null,
        'venue_id' => null,
        'image' => 'poster',     // poster | cover | still
        'description' => 'true',  // true | false
        'show_filter' => 'no',   // yes | no — render [eventive-tags] and enable client-side tag filtering
        'event_id' => null,    // optional: open a specific event in detail view on load (overridden by URL param ?eventId=...)
        'films_base' => null,   // optional: base URL where film pages live, e.g. https://example.org/films/
    ], $atts);

    $event_bucket = sanitize_text_field($eventive_admin_options['your_eventive_event_bucket_1']);
    $tag_id = $atts['tag_id'] ? sanitize_text_field($atts['tag_id']) : null;
    $venue_id = $atts['venue_id'] ? sanitize_text_field($atts['venue_id']) : null;
    $preselect_event_id = $atts['event_id'] ? sanitize_text_field($atts['event_id']) : null;
    // Build film detail base URL from WP options (as in shortcode-film-guide.php)
    $siteURL = get_site_url();
    $film_sync_enabled = get_option('eventive_enable_film_sync', '0') === '1';
    $selectedPageId = get_option('eventive_film_detail_page_id');
    $filmDetailPage = $selectedPageId ? get_post($selectedPageId) : null;
    $permalink_structure = get_option('permalink_structure');
    $pretty_permalinks = !empty($permalink_structure);
    $filmDetailBaseURL = $selectedPageId ? get_permalink($selectedPageId) : $siteURL;
    // Expose film sync flag for JS
    $film_sync_flag = $film_sync_enabled ? 'true' : 'false';

    // Optional shortcode override takes precedence if provided
    $films_base = $atts['films_base'] ? esc_url_raw($atts['films_base']) : $filmDetailBaseURL;

    $image_mode = in_array(strtolower($atts['image']), ['poster','cover','still'], true) ? strtolower($atts['image']) : 'poster';
    $show_description = strtolower($atts['description']) !== 'false';

    ob_start();
    if (strtolower($atts['show_filter']) === 'yes') {
        echo do_shortcode('[eventive-tags]');
    }
    ?>
    <div id="event-schedule-container" class="event-schedule-container">
        <p>Loading events...</p>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            const container = document.getElementById('event-schedule-container');
            const IMAGE_MODE = <?php echo json_encode($image_mode); ?>; // 'poster' | 'cover' | 'still'
            const SHOW_DESCRIPTION = <?php echo $show_description ? 'true' : 'false'; ?>;
            const SHOW_FILTER = <?php echo strtolower($atts['show_filter']) === 'yes' ? 'true' : 'false'; ?>;
            const URL_EVENT_ID = (new URLSearchParams(location.search)).get('eventId');
            const SHORTCODE_EVENT_ID = <?php echo json_encode($preselect_event_id); ?>; // from [eventive-events event_id="..."]
            const PRESELECT_EVENT_ID = URL_EVENT_ID || SHORTCODE_EVENT_ID || null;
            const FILM_BASE = <?php echo json_encode(trailingslashit($films_base)); ?>; // e.g., https://example.org/films/
            const FILM_PRETTY = <?php echo $atts['films_base'] ? 'true' : ($pretty_permalinks ? 'true' : 'false'); ?>;
            const FILM_SYNC_ENABLED = <?php echo $film_sync_flag; ?>; // true if films are imported to pages/posts
            const loader = container.querySelector('p');

            if (window.Eventive && typeof Eventive.request === 'function') {
                Eventive.on('ready', function () {
                    const apiPath = `event_buckets/${encodeURIComponent(<?php echo json_encode($event_bucket); ?>)}/events`;
                    const queryParams = {
                        upcoming_only: true,
                        <?php if ($tag_id) echo "'tag-id': " . json_encode($tag_id) . ","; ?>
                        <?php if ($venue_id) echo "'venue-id': " . json_encode($venue_id) . ","; ?>
                    };

                    Eventive.request({
                        method: 'GET',
                        path: apiPath,
                        qs: queryParams
                    })
                    .then(response => {
                        if (loader) loader.style.display = 'none';

                        if (!response || !Array.isArray(response.events)) {
                            container.innerHTML = '<p class="error-message">Unexpected API response format. Please verify your API integration.</p>';
                            console.error('Unexpected API response:', response);
                            return;
                        }

                        const allEvents = (response.events || []).filter(event => !event.is_virtual);

                        // Cache for single-event rendering
                        let CACHED_EVENTS = allEvents.slice();
                        let PREVIOUS_VIEW = 'List';

                        // Helper: determine if an event has a tag id present (searches both event and film tags)
                        function eventHasTag(ev, tagId) {
                            if (!tagId) return true;
                            const eventTags = Array.isArray(ev.tags) ? ev.tags : [];
                            const filmTags = (Array.isArray(ev.films) ? ev.films : [])
                                .flatMap(f => Array.isArray(f.tags) ? f.tags : []);
                            return [...eventTags, ...filmTags].some(t => t && t.id === tagId);
                        }

                        let ACTIVE_TAG_ID = null;
                        // If an eventId is present (from URL or shortcode), attempt to open its details after data loads
                        function openPreselectedIfAny() {
                            if (!PRESELECT_EVENT_ID) return false;
                            const match = CACHED_EVENTS.find(e => String(e.id) === String(PRESELECT_EVENT_ID));
                            if (!match) return false;
                            // Render list first to keep DOM consistent (and to keep back-to-list working), then open details
                            render(getFiltered());
                            showSingleEvent(PRESELECT_EVENT_ID);
                            return true;
                        }

                        // ---------- Single Event View Helpers ----------
                        // Ensure we always scroll to the very top (with fallback)
                        function scrollToTop() {
                            try {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            } catch (e) {
                                // Fallback for older browsers / Safari edge cases
                                window.scrollTo(0, 0);
                            }
                            // Extra defensive: set both roots just in case
                            document.documentElement.scrollTop = 0;
                            document.body.scrollTop = 0;
                        }
                        function pickEventCover(ev) {
                            const hasFilm = Array.isArray(ev.films) && ev.films.length > 0;
                            if (hasFilm) {
                                // Prefer first film cover, else poster, else still
                                const f = ev.films[0];
                                return f?.cover_image || f?.banner_image || f?.poster_image || f?.still_image || (Array.isArray(f?.stills) ? f.stills[0] : null) || null;
                            }
                            // Fallback to event-level cover
                            return (ev.images && ev.images.cover) || ev.cover_image || ev.banner_image || ev.image || null;
                        }

                        function sanitizeDescription(html) {
                            if (!html) return '';
                            // Strip empty paragraphs and <br>-only paras
                            return html.replace(/<p\b[^>]*>(\s|<br\s*\/?\>)*<\/p>/gi, '').trim() || '';
                        }

                        function slugify(str) {
                            return (str || '')
                                .toString()
                                .toLowerCase()
                                .trim()
                                .replace(/["']/g, '')
                                .replace(/&/g, ' and ')
                                .replace(/[^a-z0-9]+/g, '-')
                                .replace(/^-+|-+$/g, '');
                        }

                        // Build a film URL based on sync and pretty permalinks
                        function buildFilmUrl(film) {
                            const id = String(film?.id || '').trim();
                            const name = String(film?.name || '');
                            if (FILM_SYNC_ENABLED && FILM_PRETTY) {
                                return FILM_BASE + slugify(name);
                            }
                            // Fallback when film isn’t imported to a page/post or pretty permalinks aren’t used
                            return FILM_BASE + (FILM_BASE.includes('?') ? '&' : '?') + 'film-id=' + encodeURIComponent(id);
                        }

                        function renderSingleEvent(ev) {
                            const coverImage = pickEventCover(ev) || 'https://via.placeholder.com/1280x720?text=Event';
                            const description = sanitizeDescription(ev.description || '');

                            const films = Array.isArray(ev.films) ? ev.films : [];
                            const timeStr = ev.start_time
                                ? (() => {
                                    const dt = new Date(ev.start_time);
                                    const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                                    let tStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                    tStr = tStr.replace(/\s([AP]M)$/i, '$1'); // remove the space before AM/PM
                                    return `${dateStr} - ${tStr}`;
                                  })()
                                : '';
                            const venueName = ev.venue?.name || 'Not yet available';
                            const venueAddr = ev.venue?.address || '';

                            // Build per-film image list for single-view rotator (when multiple films)
                            let singleFilmImages = [];
                            if (Array.isArray(films) && films.length > 1) {
                                films.forEach(film => {
                                    const fPoster = film?.poster_image || null;
                                    const fCover  = film?.cover_image  || film?.banner_image || null;
                                    const fStill  = film?.still_image  || (Array.isArray(film?.stills) ? film.stills[0] : null) || null;
                                    let pick;
                                    if (IMAGE_MODE === 'cover')      pick = fCover || fPoster || fStill;
                                    else if (IMAGE_MODE === 'still') pick = fStill || fPoster || fCover;
                                    else                              pick = fPoster || fStill || fCover; // poster mode priority
                                    if (pick) singleFilmImages.push(pick);
                                });
                                singleFilmImages = [...new Set(singleFilmImages)];
                            }
                            const singleUseRotator = singleFilmImages.length > 1;

                            container.innerHTML = `
                                <div class="single-event" style="margin-top:20px;">
                                    <button id="back-to-list" class="sqs-block-button-element--small sqs-button-element--tertiary">← Back to ${PREVIOUS_VIEW} View</button> :: <span class="event-title" style="font-size: 1.6em; font-weight: bold;">${ev.name || ''} (Details)</span>
                                    <div class="single-event-header" style="margin-top:20px;">
${singleUseRotator ? `
    <div class="event-media ${IMAGE_MODE === 'poster' ? 'image-left' : 'image-top'} has-rotator" style="margin-bottom:12px;">
        <div class="event-poster-rotator" aria-live="polite">
            ${singleFilmImages.map((u, i) => `
                <img src="${u}" alt="${ev.name} Image ${i+1}" class="event-poster frame ${IMAGE_MODE} ${i===0 ? 'active' : ''}" loading="lazy">
            `).join('')}
        </div>
    </div>
` : ` 
<div class="event-media ${IMAGE_MODE === 'poster' ? 'image-left' : 'image-top'}" style="margin-bottom:12px;">
        <img src="${coverImage}" alt="${ev.name}" class="event-poster frame ${IMAGE_MODE}" style="width:300px;height:auto;border-radius:6px;" loading="lazy">
    </div>
    
`}
<div style="text-align:left; margin-top:12px;">
    <p class="event-description">${description}</p>
    <p><strong>Start:</strong> ${timeStr}</p>
    <p><strong>Venue:</strong><br />${venueName}<br />${venueAddr}</p>
</div>
    <div class="event-ticket-button" style="margin:12px 0;">
        <div class="eventive-button" data-event="${ev.id}"></div>
</div>
</div>
                                    </div>
                                    <div class="single-event-body" style="margin-top:20px;">    
${films.length > 1 ? `
<div class="film-details" style="margin-top:16px;">
    <h2>Films Showing</h2>
    <div class="film-grid">
        ${films.map(film => `
            <article class="film-card">
                <a class="film-link" href="${buildFilmUrl(film)}">
                    <div class="film-media">
                        <img src="${film.poster_image || film.cover_image || film.banner_image || 'https://via.placeholder.com/240x360?text=Poster'}" alt="${film.name || ''}">
                    </div>
                    <h3 class="film-title" style="padding:10px 10px 12px; margin:0;">${film.name || ''}</h3>
                </a>
            </article>
        `).join('')}
    </div>
</div>` : ''}
                                    </div>
                                </div>
                            `;

                            // Initialize rotator in single view (if present)
                            (function initSingleRotator() {
                                const rot = container.querySelector('.single-event .event-poster-rotator');
                                if (!rot) return;
                                const imgs = rot.querySelectorAll('img');
                                const count = imgs.length;
                                if (count < 2) return;
                                let idx = 0;
                                let iv;
                                if (count === 2) iv = 4000; else iv = Math.max(1500, Math.floor(8000 / count));
                                setInterval(() => {
                                    imgs[idx].classList.remove('active');
                                    idx = (idx + 1) % count;
                                    imgs[idx].classList.add('active');
                                }, iv);
                            })();

                            // Back button
                            const backBtn = container.querySelector('#back-to-list');
                            if (backBtn) backBtn.addEventListener('click', returnToList);

                            // Copy share link
                            const copyBtn = container.querySelector('#copy-share-link');
                            if (copyBtn) {
                                copyBtn.addEventListener('click', () => {
                                    const url = `${location.origin}${location.pathname}?eventId=${encodeURIComponent(String(ev.id))}`;
                                    navigator.clipboard.writeText(url).then(() => {
                                        const status = container.querySelector('#share-copy-status');
                                        if (status) status.textContent = 'Link copied!';
                                    }).catch(() => {
                                        const status = container.querySelector('#share-copy-status');
                                        if (status) status.textContent = 'Copy failed';
                                    });
                                });
                            }

                            // Hydrate Eventive buttons in single view
                            if (window.Eventive && typeof window.Eventive.rebuild === 'function') {
                                try { window.Eventive.rebuild(); } catch (e) { console.warn('Eventive rebuild (single) failed', e); }
                            }
                        }

                        function showSingleEvent(eventId) {
                            PREVIOUS_VIEW = 'List';
                            const ev = CACHED_EVENTS.find(e => String(e.id) === String(eventId));
                            if (!ev) return;
                            scrollToTop();
                            renderSingleEvent(ev);
                        }

                        function returnToList() {
                            render(getFiltered());
                            if (window.Eventive && typeof window.Eventive.rebuild === 'function') {
                                try { window.Eventive.rebuild(); } catch (e) { console.warn('Eventive rebuild (list) failed', e); }
                            }
                        }
                        // ---------- End Single Event View Helpers ----------

                        function render(events) {
                            if (!events || events.length === 0) {
                                container.innerHTML = '<p>No upcoming events found.</p>';
                                return;
                            }

                            // Group by local calendar day to avoid UTC date shifts
                            function localDateKeyFromDate(dt) {
                                const y = dt.getFullYear();
                                const m = String(dt.getMonth() + 1).padStart(2, '0');
                                const d = String(dt.getDate()).padStart(2, '0');
                                return `${y}-${m}-${d}`;
                            }
                            const eventsByDate = events.reduce((acc, ev) => {
                                if (!ev.start_time) {
                                    (acc['Unknown Date'] = acc['Unknown Date'] || []).push(ev);
                                    return acc;
                                }
                                const dt = new Date(ev.start_time);
                                const key = localDateKeyFromDate(dt); // uses viewer's local TZ
                                (acc[key] = acc[key] || []).push(ev);
                                return acc;
                            }, {});

                            let html = '';
                            for (const [dateKey, groupedEvents] of Object.entries(eventsByDate)) {
                                let dObj;
                                if (dateKey === 'Unknown Date') {
                                    dObj = null;
                                } else {
                                    const [y, m, d] = dateKey.split('-').map(Number);
                                    dObj = new Date(y, m - 1, d); // local midnight
                                }
                                const day = dObj ? dObj.toLocaleDateString('en-US', { weekday: 'long' }) : 'Date';
                                const formattedDate = dObj ? dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

                                // Add count-based class for smart column spanning (1 or 2 items wide)
                                const countClass = groupedEvents.length === 1 ? 'events-count-1' : (groupedEvents.length === 2 ? 'events-count-2' : 'events-count-3plus');

                                html += `
                                    <div class="event-group">
                                        <h2 class="event-group-header">${day}${formattedDate ? `, ${formattedDate}` : ''}</h2>
                                        <div class="event-group-items ${countClass}">
                                `;

                                groupedEvents.forEach(event => {
                                    const eventName = event.name || 'Untitled Event';
                                    const eventTime = event.start_time
  ? (() => {
      const dt = new Date(event.start_time);
      const dateStr = dt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      let timeStr = dt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      timeStr = timeStr.replace(/\s([AP]M)$/i, '$1');
      return `${dateStr} - ${timeStr}`;
    })()
  : 'Time not available';
                                    const eventDescription = event.description || '';
                                    const venueName = event.venue?.name || 'Not yet available';

                                    const hasFilm = Array.isArray(event.films) && event.films.length > 0;
                                    const primaryFilm = hasFilm ? event.films[0] : null;

                                    // Film-level sources
                                    let filmPoster = primaryFilm?.poster_image || null;
                                    let filmCover  = primaryFilm?.cover_image  || primaryFilm?.banner_image || null;
                                    let filmStill  = primaryFilm?.still_image  || (Array.isArray(primaryFilm?.stills) ? primaryFilm.stills[0] : null) || null;

                                    // Event-level cover for no-film scenarios
                                    let eventCover = (event.images && event.images.cover) || event.cover_image || event.banner_image || event.image || null;

                                    // Unified choices
                                    const posterSrc = hasFilm ? filmPoster : null;
                                    const stillSrc  = hasFilm ? filmStill  : null;
                                    const coverSrc  = hasFilm ? (filmCover || eventCover) : eventCover;

                                    function pickPreferred(mode) {
                                        if (mode === 'cover') return coverSrc || null;
                                        if (mode === 'still') return stillSrc || (hasFilm ? null : (eventCover || null));
                                        return posterSrc || (hasFilm ? null : (eventCover || null));
                                    }

                                    const priorityFallback = posterSrc || stillSrc || coverSrc || null;
                                    const chosenImg = pickPreferred(IMAGE_MODE) || priorityFallback;

                                    // Build per-film image list for rotator when multiple films
                                    let filmImageUrls = [];
                                    if (hasFilm && Array.isArray(event.films) && event.films.length > 1) {
                                        event.films.forEach(film => {
                                            const fPoster = film?.poster_image || null;
                                            const fCover  = film?.cover_image  || film?.banner_image || null;
                                            const fStill  = film?.still_image  || (Array.isArray(film?.stills) ? film.stills[0] : null) || null;
                                            let pick;
                                            if (IMAGE_MODE === 'cover')      pick = fCover || fPoster || fStill;
                                            else if (IMAGE_MODE === 'still') pick = fStill || fPoster || fCover;
                                            else                              pick = fPoster || fStill || fCover; // poster mode priority
                                            if (pick) filmImageUrls.push(pick);
                                        });
                                        // de-duplicate
                                        filmImageUrls = [...new Set(filmImageUrls)];
                                    }
                                    const useRotator = filmImageUrls.length > 1;

                                    let ticketButton = '';
                                    if (!event.hide_tickets_button) {
                                        ticketButton = `<div class="eventive-button" data-event="${event.id}"></div>`;
                                    }
                                    const itemClass = (IMAGE_MODE === 'poster') ? 'event-item image-left' : 'event-item image-top';
                                    const finalItemClass = chosenImg ? itemClass : 'event-item no-image';
                                    const descriptionHtml = SHOW_DESCRIPTION ? `<p>${eventDescription}</p>` : '';

                                    html += `
      <div class="${finalItemClass}">
          ${useRotator ? `
            <div class="event-media ${IMAGE_MODE === 'poster' ? 'image-left' : 'image-top'} has-rotator js-open-event" data-event-id="${event.id}" role="button" tabindex="0" aria-label="Open details for ${eventName}">
                <div class="event-poster-rotator" data-interval="3500" aria-live="polite">
                    ${filmImageUrls.map((u, i) => `
                        <img src="${u}" alt="${eventName} Image ${i+1}" class="event-poster frame ${IMAGE_MODE} ${i===0 ? 'active' : ''}" loading="lazy">
                    `).join('')}
                </div>
            </div>
          ` : (chosenImg ? `
            <div class="event-media ${IMAGE_MODE === 'poster' ? 'image-left' : 'image-top'} js-open-event" data-event-id="${event.id}" role="button" tabindex="0" aria-label="Open details for ${eventName}">
                <img src="${chosenImg}" alt="${eventName} Poster" class="event-poster frame ${IMAGE_MODE}" loading="lazy">
            </div>
          ` : '')}
          <div class="event-details-container">
              <h3 class="event-title"><span class="event-title js-open-event" data-event-id="${event.id}" role="link" tabindex="0" aria-label="Open details for ${eventName}">${eventName}</span></h3>
              <p><strong>${eventTime}</strong></p>
              <p><strong>Venue:</strong> ${venueName}</p>
              ${descriptionHtml}
              <div class="event-buy-tickets">${ticketButton}</div>
          </div>
      </div>
    `;
                                });

                                html += '</div></div>';
                            }

                            container.innerHTML = html;

                            // Initialize simple image rotators
                            (function initRotators() {
                                const rotators = container.querySelectorAll('.event-poster-rotator');
                                rotators.forEach(rot => {
                                    const imgs = rot.querySelectorAll('img');
                                    const count = imgs.length;
                                    if (count < 2) return;
                                    let idx = 0;
                                    // Base interval: 4000ms for 2 images, then faster for more images
                                    // e.g., 3 images => ~3000ms, 4 => ~2500ms, min 1500ms
                                    let iv;
                                    if (count === 2) iv = 4000;
                                    else iv = Math.max(1500, Math.floor(8000 / count));
                                    setInterval(() => {
                                        imgs[idx].classList.remove('active');
                                        idx = (idx + 1) % count;
                                        imgs[idx].classList.add('active');
                                    }, iv);
                                });
                            })();

                            // Bind click/enter on media to open single view
                            (function bindOpenHandlers() {
                                const triggers = container.querySelectorAll('.js-open-event');
                                triggers.forEach(el => {
                                    const id = el.getAttribute('data-event-id');
                                    if (!id) return;
                                    el.addEventListener('click', () => showSingleEvent(id));
                                    el.addEventListener('keypress', (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSingleEvent(id); }
                                    });
                                });
                            })();

                            // Rebuild Eventive buttons after DOM update
                            setTimeout(() => {
                                if (window.Eventive) {
                                    try { window.Eventive.rebuild(); } catch (err) { console.error('Eventive rebuild failed:', err); }
                                }
                            }, 100);
                        }

                        function getFiltered() {
                            return allEvents.filter(ev => eventHasTag(ev, ACTIVE_TAG_ID));
                        }

                        // Expose a setter for external tag widgets
                        window.setActiveTag = function (tagId) {
                            ACTIVE_TAG_ID = tagId || null;
                            render(getFiltered());
                        };

                        // Initial render (or open preselected single event)
                        if (!openPreselectedIfAny()) {
                            render(getFiltered());
                        }

                        // Optionally wire up external tag filter buttons (e.g., from [eventive-tags])
                        if (SHOW_FILTER) {
                            (function setupTagListeners(retries = 12) {
                                const els = document.querySelectorAll('.external-tag-filter[data-tag-id]');
                                if (els.length) {
                                    els.forEach(el => {
                                        el.addEventListener('click', function (e) {
                                            e.preventDefault();
                                            const tagId = this.getAttribute('data-tag-id');
                                            window.setActiveTag(tagId);
                                        });
                                    });
                                } else if (retries > 0) {
                                    setTimeout(() => setupTagListeners(retries - 1), 250);
                                }
                            })();
                        }
                    })
                    .catch(error => {
                        loader.style.display = 'none';
                        container.innerHTML = `<p class=\"error-message\">Error fetching events: ${error.message}</p>`;
                        console.error('Eventive request failed:', error);
                    });
                });
            } else {
                container.innerHTML = '<p class="error-message">Eventive API is not initialized. Please check your integration.</p>';
            }
        });
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode('eventive-events', 'eventive_schedule');