(function () {
  // Shared page cache
  window.__Eventive_EventCache = window.__Eventive_EventCache || {};

  // Global-ish film detail config (first initialized container wins)
  var __EventiveFilmDetailBase = '';
  var __EventiveFilmDetailPretty = true;

  function fetchEventsOnce(bucket, opts) {
    opts = opts || {};
    var includePast    = !!opts.includePast;       // default false
    var includeVirtual = !!opts.includeVirtual;    // default false (filter client-side as well)
    var forceAll       = !!opts.forceAll;          // when true, do NOT use upcoming_only so undated events are included

    var key = bucket + '::past=' + (includePast?1:0) + '::virt=' + (includeVirtual?1:0) + '::all=' + (forceAll?1:0);
    var C = window.__Eventive_EventCache;
    if (C[key]) return Promise.resolve(C[key]);
    if (!window.Eventive) return Promise.reject(new Error('Eventive API is not initialized.'));

    var qs = {};
    if (!(includePast || forceAll)) {
      // Prefer server filtering when possible
      qs.upcoming_only = true;
      // Many Eventive endpoints also honor marquee=true to bias future/current
      qs.marquee = true;
    }
    if (includeVirtual) qs.include_virtual = true; // harmless if not supported

    return Eventive.request({
      method: 'GET',
      path: 'event_buckets/' + encodeURIComponent(bucket) + '/events',
      qs: qs
    }).then(function (d) {
      var events = (d && d.events) || [];
      C[key] = events;
      return C[key];
    });
  }

  function getTextColor(bg) {
    var hex = (bg || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(hex.substr(0, 2), 16) || 0,
        g = parseInt(hex.substr(2, 2), 16) || 0,
        b = parseInt(hex.substr(4, 2), 16) || 0;
    var br = (r * 299 + g * 587 + b * 114) / 1000;
    return br > 150 ? '#000' : '#fff';
  }

  // Helper to resolve the best available URL for a film object
  function resolveFilmUrl(film) {
    if (!film || typeof film !== 'object') return '';
    // Try a series of common/link fields, including WP sync and Eventive URLs
    var candidates = [
      'wp_detail_url',
      'wp_permalink',
      'permalink',
      'detail_url',
      'details_url',
      'url',
      'public_url',
      'site_url'
    ];
    for (var i = 0; i < candidates.length; i++) {
      var key = candidates[i];
      var val = film[key];
      if (typeof val === 'string' && val) return val;
    }

    // Fallback: if we have a configured film-detail base, build a URL from the film id (or slug) as a query parameter
    var idOrSlug = film.id || film.slug || film.slugified_title;
    if (idOrSlug && __EventiveFilmDetailBase) {
      var base = __EventiveFilmDetailBase.replace(/\/+$/, '');
      return base + '/?film-id=' + encodeURIComponent(idOrSlug);
    }

    return '';
  }

  function setURLTagParam(tagId, method){
    try {
      var u = new URL(window.location.href);
      if (!tagId) u.searchParams.delete('tag-id');
      else u.searchParams.set('tag-id', tagId);
      if (method === 'replace') history.replaceState({}, '', u.toString());
      else history.pushState({}, '', u.toString());
    } catch(_){}
  }

  function initContainer(container) {
    if (!container || container.__eventiveInited) return;
    container.__eventiveInited = true;

    container.classList.add('eventive-events-list--inited');

    var loaderId = container.id.replace(/_container$/, '_loader');
    var loader = document.getElementById(loaderId);

    var bucket          = container.getAttribute('data-event-bucket') || '';
    var limit           = parseInt(container.getAttribute('data-limit') || '0', 10) || 0;
    var tagDefault      = container.getAttribute('data-tag-default') || '';
    var tagsListRaw     = container.getAttribute('data-tags-list') || '';
    var shortcodeTags   = tagsListRaw
      ? tagsListRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
      : [];
    var excludeTagsRaw  = container.getAttribute('data-exclude-tags') || '';
    var excludeTokens   = excludeTagsRaw
      ? excludeTagsRaw.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
      : [];
    var venueId         = container.getAttribute('data-venue-id') || '';
    // Short / full description visibility
    // Support both data-show-short-description and data-short-event-description
    var rawShortDescAttr = container.getAttribute('data-show-short-description')
                          || container.getAttribute('data-short-event-description');
    var showShortDesc    = (rawShortDescAttr == null)
      ? false
      : parseBool(rawShortDescAttr);

    // Support both data-show-description and data-event-description
    var rawDescAttr      = container.getAttribute('data-show-description')
                          || container.getAttribute('data-event-description');
    var showDescription  = (rawDescAttr == null)
      ? false
      : parseBool(rawDescAttr);

    var showPoster      = container.getAttribute('data-show-poster') === 'true';
    var imagePref       = container.getAttribute('data-image-preference') || 'cover';
    var includeVirtual  = container.getAttribute('data-include-virtual') === 'true';
    var includePast     = container.getAttribute('data-include-past') === 'true'; // default false
    var viewMode        = container.getAttribute('data-view-mode') || 'list';
    // Show undated events (defaults to true)
    var showUndated     = container.getAttribute('data-show-undated');
    showUndated = (showUndated === null || showUndated === '' || showUndated === 'true');

    // Optional date range filtering (start-date / end-date)
    // Expecting ISO-like YYYY-MM-DD strings in data-start-date / data-end-date.
    // If provided, we treat the range as inclusive, with end-date extended to end-of-day.
    var startDateStr = container.getAttribute('data-start-date') || '';
    var endDateStr   = container.getAttribute('data-end-date') || '';
    var startDateTs  = null;
    var endDateTs    = null;
    if (startDateStr) {
      var sd = new Date(startDateStr);
      if (isFinite(sd.getTime())) startDateTs = sd.getTime();
    }
    if (endDateStr) {
      var ed = new Date(endDateStr);
      if (isFinite(ed.getTime())) {
        // bump to end-of-day for inclusive behavior
        ed.setHours(23, 59, 59, 999);
        endDateTs = ed.getTime();
      }
    }

    // Optional film-detail configuration (first initialized container wins)
    var filmDetailBaseAttr = container.getAttribute('data-film-detail-base');
    if (filmDetailBaseAttr) {
      __EventiveFilmDetailBase = filmDetailBaseAttr;
    }
    var filmDetailPrettyAttr = container.getAttribute('data-film-detail-pretty');
    if (filmDetailPrettyAttr !== null && filmDetailPrettyAttr !== '') {
      __EventiveFilmDetailPretty = String(filmDetailPrettyAttr).toLowerCase() === 'true';
    }

    // Add a tiny boolean parser for showFilter
    function parseBool(v){
      if (v == null) return true; // default true when missing
      v = String(v).trim().toLowerCase();
      return !(v === 'false' || v === '0' || v === 'no' || v === 'off' || v === '');
    }

    // Read data-show-filter
    var showFilter     = parseBool(container.getAttribute('data-show-filter'));

    // If filter is disabled, hide or remove any pre-existing wrappers near this container
    if (!showFilter) {
      try {
        var parent = container.parentElement;
        if (parent) {
          parent.querySelectorAll('.eventive-events-tags-filter').forEach(function(el){
            el.classList.add('is-hidden');
            el.setAttribute('hidden', '');
            el.style.display = 'none';
          });
        }
      } catch(_) {}
    }

    // Active tag state (empty string = All)
    var activeTag = (new URLSearchParams(window.location.search).get('tag-id') || '').trim();

    // Where to render our in-frame tags filter (create if missing)
    var tagsWrap = (function(){
      if (!showFilter) return null;
      var scoped = container.parentElement && container.parentElement.querySelector && container.parentElement.querySelector('.eventive-events-tags-filter');
      if (scoped) return scoped;
      var div = document.createElement('div');
      div.className = 'eventive-events-tags-filter';
      container.parentElement && container.parentElement.insertBefore(div, container);
      return div;
    })();

    function collectTagsFromEvents(list){
      var map = new Map(); // key -> {id,name,color,count}
      (list || []).forEach(function(ev){
        var evTags = Array.isArray(ev.tags) ? ev.tags : [];
        var fmTags = (Array.isArray(ev.films) ? ev.films : []).flatMap(function(f){ return Array.isArray(f.tags) ? f.tags : []; });
        evTags.concat(fmTags).forEach(function(t){
          if (!t) return;
          var id = (t.id != null) ? String(t.id) : '';
          var name = t.name || t.title || t.label || (id ? ('#' + id) : '');
          if (!id && !name) return;

          // If this tag is in the exclusion list (by ID or name), skip it for the filter UI
          if (excludeTokens && excludeTokens.length) {
            var lowerName = String(name).toLowerCase();
            var shouldExclude = excludeTokens.some(function(tok){
              var idTok = String(tok);
              var nameTok = String(tok).toLowerCase();
              return (id && idTok === id) || (lowerName && nameTok === lowerName);
            });
            if (shouldExclude) return;
          }

          var key = id || name.toLowerCase();
          var cur = map.get(key) || { id:id, name:name, color:(t.color||'#e0e0e0'), count:0 };
          cur.count += 1;
          map.set(key, cur);
        });
      });
      return Array.from(map.values());
    }

    function highlightActiveTag(){
      if (!showFilter || !tagsWrap) return;
      try{
        var links = tagsWrap.querySelectorAll('a.external-tag-filter');
        links.forEach(function(l){ l.classList.remove('is-active'); });
        links.forEach(function(l){ var id=l.getAttribute('data-tag-id')||''; if (!activeTag){ if(!id) l.classList.add('is-active'); } else if (id===activeTag){ l.classList.add('is-active'); } });
      }catch(_){ }
    }

    function renderEventTags(list){
      if (!showFilter) { if (tagsWrap) tagsWrap.innerHTML = ''; return; }
      if (!tagsWrap) return;
      // Build from available (upcoming) events only; do not apply activeTag filter so options remain complete
      var tags = collectTagsFromEvents(list);
      if (!tags.length){ tagsWrap.innerHTML=''; return; }
      tags.sort(function(a,b){ return a.name.toLowerCase()<b.name.toLowerCase()?-1:1; });

      var resetUrl = (function(){ try{ var u=new URL(window.location.href); u.searchParams.delete('tag-id'); return u.toString(); }catch(_){ return '#'; } })();
      var html = '<div class="tag-container eventive-tags">'
        + '<span class="tag-label is-all"><a class="external-tag-filter" data-tag-id="" href="'+resetUrl+'">All</a></span>'
        + tags.map(function(t){
            var fg = getTextColor(t.color||'#e0e0e0');
            var href = (function(){ try{ var u=new URL(resetUrl); u.searchParams.set('tag-id', t.id||t.name); return u.toString(); }catch(_){ return '#'; } })();
            return '<span class="tag-label" style="background-color:'+(t.color||'#e0e0e0')+';color:'+fg+'">'
                + '<a class="external-tag-filter" data-tag-id="'+(t.id||t.name)+'" href="'+href+'">'+t.name+'</a>'
                + '</span>';
          }).join('')
        + '</div>';
      tagsWrap.innerHTML = html;
      highlightActiveTag();

      // If filter toggles off dynamically, ensure wrapper is hidden
      if (!showFilter && tagsWrap){ tagsWrap.classList.add('is-hidden'); tagsWrap.setAttribute('hidden',''); tagsWrap.style.display='none'; }

      if (showFilter && tagsWrap && !tagsWrap.__evtClickBound){
        tagsWrap.__evtClickBound = true;
        tagsWrap.addEventListener('click', function(e){
          var a = e.target && e.target.closest ? e.target.closest('a.external-tag-filter') : null;
          if (!a) return;
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target==='_blank') return;
          e.preventDefault(); e.stopPropagation();
          activeTag = String(a.getAttribute('data-tag-id') || '');
          setURLTagParam(activeTag, 'replace');
          highlightActiveTag();
          if (Array.isArray(window.allEventiveEvents)) render(window.allEventiveEvents, activeTag);
        }, true);
      }
    }

    function isUpcoming(ev){
      if (includePast) return true;
      var t = ev && ev.start_time ? new Date(ev.start_time).getTime() : NaN;
      if (!isFinite(t)) return false; // skip malformed dates when upcoming-only
      return t >= Date.now();
    }

    function render(events, overrideTag) {
      var tagId = (typeof overrideTag === 'string') ? overrideTag : (activeTag || tagDefault);

      // When showUndated=true (default), we fetch all events and render undated first; dated events still respect upcoming/past filtering.
      // 1) Partition events so undated entries (is_date === false, or is_dated === false, or missing start_time/date) render FIRST
      var undated = [], dated = [];
      (events || []).forEach(function (event) {
        // Venue / virtual checks first (fast-fail)
        if (venueId && (!event.venue || event.venue.id !== venueId)) return;
        if (!includeVirtual && event.is_virtual) return;

        // Determine which tag filters to apply:
        // - If an active tag (from URL / UI) is present, use it alone.
        // - Otherwise, fall back to the shortcode's list of tags (IDs or names) from data-tags-list.
        var filterTokens = [];
        if (tagId) {
          filterTokens = [String(tagId)];
        } else if (shortcodeTags && shortcodeTags.length) {
          filterTokens = shortcodeTags.slice();
        }

        // Collect tag IDs and names from event-level tags and the first film's tags
        var evTagsArr = Array.isArray(event.tags) ? event.tags : [];
        var fmTagsArr = (event.films && event.films[0] && Array.isArray(event.films[0].tags))
          ? event.films[0].tags
          : [];
        var allTagObjs = evTagsArr.concat(fmTagsArr);
        var eventTagIds = [];
        var eventTagNames = [];

        allTagObjs.forEach(function (t) {
          if (!t) return;
          if (t.id != null) eventTagIds.push(String(t.id));
          if (t.name) eventTagNames.push(String(t.name).toLowerCase());
        });

        if (filterTokens.length) {
          var matches = filterTokens.some(function (tok) {
            var idTok = String(tok);
            var nameTok = String(tok).toLowerCase();
            return (eventTagIds.indexOf(idTok) !== -1) || (eventTagNames.indexOf(nameTok) !== -1);
          });
          if (!matches) return;
        }

        // Optional date-range filter: if startDateTs and/or endDateTs are set,
        // ensure this event's start_time falls within the inclusive range.
        if ((startDateTs != null || endDateTs != null) && event.start_time) {
          var evTime = new Date(event.start_time).getTime();
          if (isFinite(evTime)) {
            if (startDateTs != null && evTime < startDateTs) return;
            if (endDateTs != null && evTime > endDateTs) return;
          }
        }

        // Special case: if this event effectively has only one tag and that tag is excluded,
        // do not show the event at all. Events with multiple tags are still shown, with
        // excluded tags stripped out in the label rendering.
        if (excludeTokens && excludeTokens.length && allTagObjs.length === 1) {
          var onlyTag = allTagObjs[0];
          if (onlyTag) {
            var onlyId   = onlyTag.id != null ? String(onlyTag.id) : '';
            var onlyName = onlyTag.name || onlyTag.title || onlyTag.label || (onlyId ? ('#' + onlyId) : '');
            if (onlyId || onlyName) {
              var lowerOnlyName = String(onlyName).toLowerCase();
              var onlyExcluded = excludeTokens.some(function (tok) {
                var idTok = String(tok);
                var nameTok = String(tok).toLowerCase();
                return (onlyId && idTok === onlyId) || (lowerOnlyName && nameTok === lowerOnlyName);
              });
              if (onlyExcluded) return;
            }
          }
        }

        // Note: excludeTokens no longer filters entire events in the general case; it only
        // affects tag label rendering plus the single-tag-excluded rule above.

        // Upcoming vs undated (support both API keys and a safe fallback)
        var isUndated = (event.is_date === false) || (event.is_dated === false) || (!event.start_time && event.date == null);
        if (isUndated) {
          if (!showUndated) return; // skip entirely if disabled
          undated.push(event);      // include regardless of upcoming/past
        } else {
          if (!isUpcoming(event)) return; // enforce upcoming/past rule for dated events
          dated.push(event);
        }
      });

      // 2) Order: undated first, then dated; respect limit AFTER ordering
      var ordered = undated.concat(dated);
      if (limit && limit > 0) ordered = ordered.slice(0, limit);

      // 3) Build HTML
      var html = [];
      ordered.forEach(function (event) {
        var startHtml = '';
        if (event.start_time && event.is_date !== false) {
          var dt = new Date(event.start_time);
          if (!isNaN(dt)) {
            var d = dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            var t = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            startHtml = d + ' at ' + t;
          }
        }

        var name = event.name || 'Untitled Event';
        var desc = event.description || '';
        var shortDesc = event.short_description
          || (event.films && event.films[0] && event.films[0].short_description)
          || '';
        var venueName = (event.venue && event.venue.name) || 'No venue specified';

        // Build film title HTML with links to film detail locations when available
        var filmTitlesHtml = '';
        if (event.films && event.films.length) {
          filmTitlesHtml = event.films.map(function (f) {
            if (!f || !f.name) return '';
            var url = resolveFilmUrl(f);
            var inner = url
              ? '<a href="' + url + '" class="events-film-link">' + f.name + '</a>'
              : f.name;
            return '<span class="events-film-title">' + inner + '</span>';
          }).join('');
        }

        // Build the film metadata block:
        // - If exactly one film: "View Film Details" (linked if possible)
        // - If multiple films: "Showing:" + list of film titles
        var filmMetaHtml = '';
        if (event.films && event.films.length) {
          if (event.films.length === 1) {
            var singleFilm = event.films[0];
            var singleUrl  = resolveFilmUrl(singleFilm);
            var singleInner = singleUrl
              ? '<a href="' + singleUrl + '" class="events-film-link view-film-details">View Film Details</a>'
              : 'View Film Details';
            filmMetaHtml = '<div class="event-film-list single-film">' + singleInner + '</div>';
          } else {
            filmMetaHtml = '<div class="event-film-list"><em>Showing:</em> ' + filmTitlesHtml + '</div>';
          }
        }

        var imageUrl = '';
        if (imagePref === 'cover') {
          imageUrl = event.cover_image
            || (event.images && event.images.cover)
            || (event.films && event.films[0] && (event.films[0].cover_image
                || (event.films[0].images && event.films[0].images.cover)))
            || '';
        } else if (imagePref === 'poster') {
          imageUrl = (event.films && event.films[0] && event.films[0].poster_image) || '';
        }

        // Build poster HTML; if exactly one film is attached, make the image link to that film's detail page
        var posterHtml = '';
        if (showPoster && imagePref !== 'none' && imageUrl) {
          var posterInner = '<div class="poster-container"><img src="' + imageUrl + '" alt="' + name + ' Image" class="poster" /></div>';
          if (event.films && event.films.length === 1) {
            var posterFilm = event.films[0];
            var posterUrl  = resolveFilmUrl(posterFilm);
            if (posterUrl) {
              posterInner = '<a href="' + posterUrl + '" class="event-poster-link">' + posterInner + '</a>';
            }
          }
          posterHtml = posterInner;
        }

        var ticketBtn = event.hide_tickets_button ? '' : '<div class="eventive-button" data-event="' + (event.id || '') + '"></div>';

        var tagMap = new Map();
        (event.tags || []).concat((event.films || []).flatMap(function (f) { return f.tags || []; }))
          .forEach(function (tag) {
            if (!tag) return;
            var id   = tag.id != null ? String(tag.id) : '';
            var name = tag.name || tag.title || tag.label || (id ? ('#' + id) : '');
            if (!id && !name) return;

            // Skip any tag that is in the exclusion list (by ID or name)
            if (excludeTokens && excludeTokens.length) {
              var lowerName = String(name).toLowerCase();
              var shouldExclude = excludeTokens.some(function (tok) {
                var idTok = String(tok);
                var nameTok = String(tok).toLowerCase();
                return (id && idTok === id) || (lowerName && nameTok === lowerName);
              });
              if (shouldExclude) return;
            }

            var key = id || name.toLowerCase();
            if (!tagMap.has(key)) tagMap.set(key, tag);
          });
        var tagLabels = Array.from(tagMap.values()).map(function (tag) {
          var bg = tag.color || '#888', fg = getTextColor(bg);
          return '<span class="event-label" style="background-color:' + bg + '; color:' + fg + '">' + tag.name + '</span>';
        }).join('');

        if (viewMode === 'grid') {
          var bgStyle = imageUrl ? ' style="background-image:url(' + imageUrl + ')"' : '';
          html.push(
            '<div class="event-grid-card">'
              + '<div class="event-grid-media"' + bgStyle + '></div>'
              + '<div class="event-grid-info">'
                + (startHtml ? '<p class="event-grid-time">' + startHtml + (venueName !== 'No venue specified' ? '<br /> @ ' + venueName : '') + '</p>' : '')
                + '<h3 class="event-grid-title">' + name + '</h3>'
                + (tagLabels ? '<div class="event-grid-tags">' + tagLabels + '</div>' : '')
              + '</div>'
              + (ticketBtn ? '<div class="event-grid-ticket">' + ticketBtn + '</div>' : '')
            + '</div>'
          );
        } else {
          html.push(
            '<div class="event-list-item entry">'
              + posterHtml
              + '<div class="content-1">'
                + (startHtml ? '<p class="event-list-time">' + startHtml + (venueName !== 'No venue specified' ? '<br /> @ ' + venueName : '') + '</p>' : '')
                + '<h3 class="event-list-name entry-title">' + name + '</h3>'
                + filmMetaHtml
                + '<div class="event-labels">' + tagLabels + '</div>'
                + ((showShortDesc && shortDesc) ? '<p class="event-list-short-description">' + shortDesc + '</p>' : '')
                + (showDescription ? '<p class="event-list-description entry-content">' + desc + '</p>' : '')
              + '</div>'
              + (ticketBtn ? '<div class="event-list-buy-tickets">' + ticketBtn + '</div>' : '')
            + '</div>'
          );
        }
      });

      container.classList.remove('event-list', 'event-grid');
      container.classList.add(viewMode === 'grid' ? 'event-grid' : 'event-list');
      container.innerHTML = html.length ? html.join('') : '<p class="no-events">No upcoming events found.</p>';

      setTimeout(function () {
        if (container.querySelector('.eventive-button')){
          if (window.Eventive && Eventive.rebuild) { try { Eventive.rebuild(); } catch (e) {} }
        }
      }, 100);
    }

    function boot() {
      if (!window.Eventive) {
        if (loader) loader.style.display = 'none';
        container.innerHTML = '<p class="error-message">Eventive API is not initialized. Please check your integration.</p>';
        return;
      }
      var run = function () {
        var urlTag = new URLSearchParams(window.location.search).get('tag-id') || tagDefault;
        fetchEventsOnce(bucket, { includePast: includePast, includeVirtual: includeVirtual, forceAll: showUndated }).then(function (events) {
          if (loader) loader.style.display = 'none';
          window.allEventiveEvents = events;
          if (showFilter) renderEventTags(events);
          render(events, urlTag);
        }).catch(function () {
          if (loader) loader.style.display = 'none';
          container.innerHTML = '<p class="error-message">Error fetching events.</p>';
        });
      };
      if (Eventive._ready || Eventive.ready) run();
      else Eventive.on('ready', run);
    }

    document.addEventListener('eventive:setActiveTag', function (ev) {
      var tagId = ev && ev.detail && (ev.detail.tagId!==undefined ? ev.detail.tagId : ev.detail) || '';
      activeTag = String(tagId||'');
      setURLTagParam(activeTag, 'replace');
      highlightActiveTag();
      if (Array.isArray(window.allEventiveEvents)) render(window.allEventiveEvents, activeTag);
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();

    window.addEventListener('popstate', function(){
      try {
        activeTag = new URL(window.location.href).searchParams.get('tag-id') || '';
        highlightActiveTag();
        if (Array.isArray(window.allEventiveEvents)) render(window.allEventiveEvents, activeTag);
      } catch(_){}
    });
  }

  // Init all instances on the page
  function initAll() {
    document.querySelectorAll('.eventive-events-list').forEach(initContainer);
  }

  // DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once: true });
  else initAll();

  // Elementor re-renders
  if (window.jQuery && window.elementorFrontend) {
    jQuery(window).on('elementor/frontend/init', function () {
      try {
        elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function (scope) {
          if (scope && scope[0]) {
            scope[0].querySelectorAll && scope[0].querySelectorAll('.eventive-events-list').forEach(initContainer);
          } else {
            initAll();
          }
        });
      } catch (e) {}
    });
  }
})();