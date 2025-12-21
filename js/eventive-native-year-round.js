(function(){
  // ==========================================
  // Eventive Native Year-Round Calendar (Elementor‑safe)
  // Consumes window.__EVT_NATIVE_YR (array of per‑instance configs)
  // ==========================================

  // ---- Small utilities ----
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s==null?'':s); }
  function pad(n){ return (n<10?'0':'')+n; }
  function toISODate(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function weekKeyForRange(start){ return toISODate(start); }
  function startOfWeek(d){ var x=new Date(d); var day=x.getDay(); // 0=Sun
    var diff = (day===0? -6 : 1) - day; // make Monday the first day
    x.setDate(x.getDate()+diff); x.setHours(0,0,0,0); return x; }
  function endOfWeek(d){ var s=startOfWeek(d); var e=new Date(s); e.setDate(e.getDate()+6); e.setHours(23,59,59,999); return e; }
  function addDays(d, n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function fmtDayLabel(d){ return d.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'}); }
  function fmtTime(d){ return d.toLocaleTimeString(undefined,{hour:'numeric', minute:'2-digit'}); }
  function atStartOfDay(d){ var x=new Date(d); x.setHours(0,0,0,0); return x; }
  function isBefore(a,b){ return +a < +b; }

  // ---- Scheduling helpers ----
  var rAF = window.requestAnimationFrame || function(cb){ return setTimeout(cb,16); };
  var rIC = window.requestIdleCallback || function(cb){ return setTimeout(function(){ cb({didTimeout:true,timeRemaining:function(){return 0;}}); }, 50); };

  function ensureEventiveReady(cb){
    if (window.Eventive && typeof Eventive.on==='function') {
      if (Eventive._ready) cb(); else Eventive.on('ready', cb);
    } else {
      // show a gentle retry for cases where loader is deferred
      var tries=0; (function wait(){ if(++tries>40) return; if(window.Eventive && Eventive.on){ if(Eventive._ready) cb(); else Eventive.on('ready', cb);} else setTimeout(wait,125); })();
    }
  }

  // ---- Loading indicator ----
  function setLoading(cfg, on){
    var box = $(cfg.ids.events); if(!box) return;
    if (on){
      if (!box.__spinner){
        var sp = document.createElement('div');
        sp.className = 'yr-loading';
        sp.setAttribute('role','status');
        sp.setAttribute('aria-live','polite');
        sp.style.display = 'flex';
        sp.style.alignItems = 'center';
        sp.style.justifyContent = 'center';
        sp.style.padding = '24px';
        sp.style.gap = '10px';
        sp.innerHTML = (
          '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
          + '<g fill="none" stroke="currentColor" stroke-width="2">'
          +   '<circle cx="12" cy="12" r="9" opacity="0.2"/>'
          +   '<path d="M21 12a9 9 0 0 0-9-9">'
          +     '<animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite"/>'
          +   '</path>'
          + '</g>'
          + '</svg>'
          + '<span style="font:500 0.95rem/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: var(--text-muted, #6b7280);">Loading…</span>'
        );
        box.__spinner = sp;
      }
      if (!box.contains(box.__spinner)) box.appendChild(box.__spinner);
      box.setAttribute('aria-busy','true');
    } else {
      if (box.__spinner && box.contains(box.__spinner)) box.removeChild(box.__spinner);
      box.removeAttribute('aria-busy');
    }
  }

  // ---- Rendering ----
  function renderWeekButtons(cfg){
    var wrap = $(cfg.ids.buttons); if(!wrap) return;
    var html='';
    for(var i=0;i<7;i++){
      var d = addDays(cfg._weekStart, i);
      var iso = toISODate(d);
      var isActive = (iso===toISODate(cfg._activeDay));
      var isPastDay = isBefore(atStartOfDay(d), cfg._todayStart);
      html += '<button class="yr-day-btn'+(isActive?' is-active':'')+(isPastDay?' is-disabled':'')+'" data-day="'+ iso +'" type="button"'+(isPastDay?' disabled aria-disabled="true"':'')+'>'+ fmtDayLabel(d) +'</button>';
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('.yr-day-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        if (this.hasAttribute('disabled')) return;
        var ds = this.getAttribute('data-day');
        cfg._activeDay = new Date(ds+'T12:00:00');
        renderWeekButtons(cfg);
        cfg.scheduleRender && cfg.scheduleRender();
      });
    });
  }

  function filmLink(cfg, ev){
    // Prefer film details page linking if available
    var film = ev && ev.film;
    if(!film) return '#';
    if (cfg.filmSyncEnabled) {
      // slugify title for pretty link
      var slug = (film.slug) ? film.slug : String(film.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
      return esc((cfg.filmDetailBaseURL||'').replace(/\/$/,'') + '/' + slug);
    } else {
      if (cfg.usePrettyPermalinks) return esc(cfg.filmDetailBaseURL) + '?film-id=' + encodeURIComponent(film.id||'');
      return esc(cfg.filmDetailBaseURL) + '&film-id=' + encodeURIComponent(film.id||'');
    }
  }

  function imageForFilm(film, type){
    if(!film) return '';
    if (type==='cover') return film.cover_image || film.still_image || film.poster_image || '';
    if (type==='still') return film.still_image || film.poster_image || film.cover_image || '';
    if (type==='none') return '';
    // default = poster mode
    return film.poster_image || film.cover_image || film.still_image || '';
  }
  function imageForEvent(ev){
    if (!ev) return '';
    return (
      ev.image || ev.poster_image || ev.cover_image || ev.still_image ||
      ev.film_poster_image || ev.film_cover_image || ev.film_still_image ||
      (ev.program_item && (ev.program_item.image || ev.program_item.poster_image || ev.program_item.cover_image || ev.program_item.still_image)) ||
      ev.tile_image || ev.hero_image || ev.card_image || ''
    );
  }

  // Film fetch with in-memory cache (per instance)
  function fetchFilmById(cfg, filmId){
    if (!filmId) return Promise.resolve(null);
    cfg._filmCache = cfg._filmCache || {};
    if (cfg._filmCache[filmId] === null) return Promise.resolve(null);
    if (cfg._filmCache[filmId] && cfg._filmCache[filmId].__loaded) return Promise.resolve(cfg._filmCache[filmId]);
    if (cfg._filmCache[filmId] && cfg._filmCache[filmId].__pending) return Promise.resolve(null);

    cfg._filmCache[filmId] = { __pending: true };

    function mark(result){
      if (result) { result.__loaded = true; cfg._filmCache[filmId] = result; }
      else { cfg._filmCache[filmId] = null; }
      return cfg._filmCache[filmId];
    }

    // Try global films/{id} first
    return Eventive.request({ method:'GET', path: 'films/'+ encodeURIComponent(filmId), authenticatePerson: true })
      .then(function(f){ if (f && (f.poster_image || f.cover_image || f.still_image)) return mark(f); return null; })
      .catch(function(){ return null; })
      .then(function(found){
        if (found !== null) return found; // either imageful object or null forcing fallback
        // Fallback: bucket‑scoped film path
        var bpath = 'event_buckets/'+ encodeURIComponent(cfg.eventBucket) +'/films/'+ encodeURIComponent(filmId);
        return Eventive.request({ method:'GET', path: bpath, authenticatePerson: true })
          .then(function(f){ return mark(f || null); })
          .catch(function(){ return mark(null); });
      });
  }

  function renderDayEvents(cfg){
    var box = $(cfg.ids.events); if(!box) return;
    var dayKey = toISODate(cfg._activeDay);
    var events = (cfg._eventsByDay && cfg._eventsByDay[dayKey]) || [];
    // Ensure any pending loader is removed before painting
    setLoading(cfg, false);

    // Utility to override ticket button labels with the row's time and hide separate time pill
    function overrideTicketLabels(root){
      var scope = root || box;
      var wrappers = scope.querySelectorAll('.eventive-button[data-event][data-label]');
      wrappers.forEach(function(wrap){
        var label = wrap.getAttribute('data-label') || '';
        if (!label) return;
        var span = wrap.querySelector('.eventive__ticket-button__button button span');
        if (!span) return;
        if (span.__evtLabelApplied && span.textContent === label) return; // idempotent
        span.textContent = label;
        span.classList.add('evt-ticket-btn');
        span.__evtLabelApplied = true;
      });
    }

    if (!events.length) { box.innerHTML = '<div class="yr-no-events">No events this day.</div>'; return; }

    // 1) Group events by same-day & same venue (and same primary film/name) so we can show all showtimes in one card
    var groups = {};
    var pendingFetches = [];
    events.forEach(function(ev){
      var venueId = (ev.venue && ev.venue.id) || (ev.is_virtual ? 'virtual' : 'unknown');
      var primaryFilm = (ev.films && ev.films[0]) || ev.film || null;
      var filmId = (primaryFilm && primaryFilm.id) || '';
      var baseTitle = (ev.name || ev.title || (primaryFilm && (primaryFilm.name||primaryFilm.title)) || ev.display_title || 'Untitled');
      var key = venueId + '::' + (filmId || baseTitle);
      if (!groups[key]) {
        groups[key] = {
          evRef: ev,
          film: primaryFilm || {},
          title: baseTitle,
          venueName: (ev.venue && (ev.venue.name||ev.venue.display_name||ev.venue.slug)) || (ev.is_virtual?'Virtual':'TBA'),
          items: []
        };
      }
      groups[key].items.push({ id: ev.id, dt: new Date(ev.start_time), ev: ev });
    });

    // 2) Sort groups and group items
    var groupList = Object.keys(groups).map(function(k){ return groups[k]; });
    groupList.forEach(function(g){ g.items.sort(function(a,b){ return +a.dt - +b.dt; }); });
    groupList.sort(function(a,b){ return +a.items[0].dt - +b.items[0].dt; });

    // 3) Progressive render in chunks to avoid long tasks/jank
    box.innerHTML = '';
    var index = 0;
    var batch = 8; // groups per frame
    var needRebuild = false;

    function renderChunk(){
      var frag = document.createDocumentFragment();
      var end = Math.min(index + batch, groupList.length);
      // Collect event IDs in this chunk for conditional rebuild
      var chunkEventIds = [];
      for(; index < end; index++){
        var group = groupList[index];
        var firstEv = group.evRef;
        var film = (cfg.imageType === 'still' && firstEv.films && firstEv.films[0]) ? firstEv.films[0] : (firstEv.film || (firstEv.films && firstEv.films[0]) || {});
        var title = group.title;

        var img = '';
        if (cfg.imageType !== 'none') {
          img = imageForFilm(film, cfg.imageType) || imageForEvent(firstEv) || '';
        }
        if (!img) {
          var fid = firstEv.film_id || (film && film.id) || (firstEv.program_item && firstEv.program_item.film_id) || null;
          if (fid) pendingFetches.push(fetchFilmById(cfg, fid));
        }

        var desc = cfg.showDescription ? (firstEv.short_description || firstEv.description || film.short_description || film.description || '') : '';
        var filmHref = cfg.showDetails ? filmLink(cfg, firstEv) : '#';

        var card = document.createElement('article');
        card.className = 'yr-card yr-card--stack' + (img ? ' has-media' : '');

        if (img) {
          var media = document.createElement('div');
          media.className = 'yr-card__media';
          var imgel = document.createElement('img');
          imgel.setAttribute('loading','lazy');
          imgel.setAttribute('decoding','async');
          imgel.alt = esc(title);
          imgel.src = esc(img);
          media.appendChild(imgel);
          card.appendChild(media);
        }

        var body = document.createElement('div');
        body.className = 'yr-card__body';
        var h = document.createElement('h3'); h.className = 'yr-card__title'; h.textContent = title; body.appendChild(h);
        if (cfg.showVenue){ var meta = document.createElement('div'); meta.className='yr-card__meta'; meta.textContent = group.venueName; body.appendChild(meta); }
        if (desc){
          var descEl = document.createElement('div');
          descEl.className = 'yr-card__desc';
          // render HTML descriptions (Eventive content often includes markup)
          descEl.innerHTML = String(desc);
          body.appendChild(descEl);
        }
        if (cfg.showDetails){ var links=document.createElement('div'); links.className='yr-card__links'; var a=document.createElement('a'); a.className='yr-more'; a.href=filmHref; a.textContent='Details'; links.appendChild(a); body.appendChild(links); }
        card.appendChild(body);

        var cta = document.createElement('div');
        cta.className = 'yr-card__cta';
        var grid = document.createElement('div');
        grid.className = 'yr-card__showtimes yr-showtimes-flex';
        grid.style.display = 'flex';
        grid.style.flexWrap = 'wrap';
        grid.style.gap = '8px 12px';
        grid.style.alignItems = 'stretch';

        group.items.forEach(function(it){
          var btnWrap = document.createElement('div');
          btnWrap.className='yr-showtime__btn';
          btnWrap.style.flex='0 1 240px';
          var btn = document.createElement('div');
          btn.className='eventive-button';
          btn.setAttribute('data-event', esc(it.id||''));
          btn.setAttribute('data-label', fmtTime(it.dt));
          btn.setAttribute('data-universal','true');
          btnWrap.appendChild(btn);
          grid.appendChild(btnWrap);
        });

        cta.appendChild(grid);
        card.appendChild(cta);
        frag.appendChild(card);
      }

      box.appendChild(frag);
      needRebuild = true;

      if (index < groupList.length) {
        rAF(renderChunk);
      } else {
        // Always rebuild once after finishing a day's render so EE tickets are guaranteed to initialize
        if (window.Eventive && typeof Eventive.rebuild==='function') {
          // Debounce within the same paint cycle to avoid multiple rebuilds from chunked rendering
          if (cfg._rebuildTimer) { try{ clearTimeout(cfg._rebuildTimer); }catch(_){} }
          cfg._rebuildTimer = setTimeout(function(){
            try { Eventive.rebuild(); } catch(_) {}
            // After rebuild, swap labels to time
            try { overrideTicketLabels(box); } catch(_) {}
          }, 60);
        }

        // Additionally, keep viewport-scoped progressive init so buttons that enter later still get initialized
        if (window.IntersectionObserver && window.Eventive && typeof Eventive.rebuild==='function'){
          var io = new IntersectionObserver(function(entries){
            var need = false;
            entries.forEach(function(ent){
              if (!ent.isIntersecting) return;
              // touching any observed button is enough to warrant a lightweight rebuild
              need = true;
            });
            if (need) rIC(function(){ try{ Eventive.rebuild(); }catch(_){}; try{ overrideTicketLabels(box); }catch(_){} });
          }, { root: null, rootMargin: '200px 0px', threshold: 0 });
          box.querySelectorAll('.eventive-button[data-event]').forEach(function(el){ io.observe(el); });
        }

        // If we had to fetch film images, refresh once they arrive (single rerender per dayKey)
        if (pendingFetches.length && !cfg._imgFetchRefresh || !cfg._imgFetchRefresh[dayKey]){
          cfg._imgFetchRefresh = cfg._imgFetchRefresh || {};
          Promise.all(pendingFetches).then(function(){ cfg._imgFetchRefresh[dayKey]=true; cfg.scheduleRender && cfg.scheduleRender(); }).catch(function(){});
        }
      }
    }

    rAF(renderChunk);
    // Initial pass (in case widgets already present)
    rIC(function(){ try{ overrideTicketLabels(box); }catch(_){} });
  }

  // ---- Data fetching ----
  function fetchWeek(cfg){
    var s = cfg._weekStart, e = cfg._weekEnd;
    // If we have this week cached, use it and return a resolved promise
    var wkKey = weekKeyForRange(s);
    if (cfg._weekCache && cfg._weekCache[wkKey]) {
      cfg._eventsByDay = cfg._weekCache[wkKey];
      return Promise.resolve();
    }
    setLoading(cfg, true);
    // Try querystring‑filtered fetch; if backend ignores qs, we filter client‑side
    var path = 'event_buckets/'+ encodeURIComponent(cfg.eventBucket) +'/events';
    var qs = {
      // In various Eventive builds the names differ; we try a few common ones:
      start_time_gte: new Date(s).toISOString(),
      start_time_lte: new Date(e).toISOString(),
      include_past_events: true,
      include: 'film,films,program_item'
    };

    function applyFilter(list){
      if(!Array.isArray(list)) return [];
      var out = [];
      for (var i=0;i<list.length;i++){
        var ev=list[i]; if(!ev||!ev.start_time) continue;
        var t=new Date(ev.start_time); if(isNaN(t)) continue;
        if (t>=s && t<=e) out.push(ev);
      }
      // group by day
      var byDay = {};
      out.sort(function(a,b){ return new Date(a.start_time)-new Date(b.start_time); });
      var cutoff = cfg._todayStart;
      var sameWeekAsToday = (toISODate(cfg._weekStart) === toISODate(cfg._minWeekStart));
      if (sameWeekAsToday) {
        out = out.filter(function(ev){ var t=new Date(ev.start_time); return +atStartOfDay(t) >= +cutoff; });
      }
      out.forEach(function(ev){
        // Normalize film_id for later image fetches
        if (!ev.film_id && ev.film && ev.film.id) ev.film_id = ev.film.id;
        if (!ev.film_id && ev.films && ev.films[0] && ev.films[0].id) ev.film_id = ev.films[0].id;
        if (!ev.film_id && ev.program_item && ev.program_item.film_id) ev.film_id = ev.program_item.film_id;

        // Ensure ev.film points at the primary film if only `films` array is present
        if (!ev.film && ev.films && ev.films[0]) ev.film = ev.films[0];

        // Title assist for edge payloads
        if (ev.film && !ev.film.name && ev.title) ev.film.name = ev.title;
        var key=toISODate(new Date(ev.start_time)); (byDay[key]||(byDay[key]=[])).push(ev);
      });
      cfg._eventsByDay = byDay;
      // Persist this week into cache
      if (cfg._weekCache) cfg._weekCache[wkKey] = byDay;
    }

    return Eventive.request({ method:'GET', path: path, qs: qs, authenticatePerson:true })
      .then(function(resp){ var list = (resp && (resp.events||resp)) || []; applyFilter(list); setLoading(cfg, false); })
      .catch(function(){
        // Fallback: fetch all upcoming 60d, then filter
        var now = new Date(); var later = addDays(now, 60);
        var fallbackQs = { start_time_gte: now.toISOString(), start_time_lte: later.toISOString() };
        return Eventive.request({ method:'GET', path: path, qs: fallbackQs, authenticatePerson:true })
          .then(function(resp){ var list=(resp && (resp.events||resp))||[]; applyFilter(list); setLoading(cfg, false); });
      });
  }

  // ---- Init per instance ----
  function initOne(cfg){
    var root = $(cfg.ids.root); if(!root||root.__inited) return; root.__inited = true;

    cfg._today = new Date();
    cfg._todayStart = atStartOfDay(cfg._today);
    cfg._minWeekStart = startOfWeek(cfg._today);
    cfg._weekStart = startOfWeek(cfg._today);
    cfg._weekEnd = endOfWeek(cfg._today);
    cfg._activeDay = new Date(Math.max(+cfg._weekStart, +cfg._todayStart));

    // Per-instance caches
    cfg._weekCache = cfg._weekCache || {};   // key: weekStartISO -> byDay map
    cfg._rebuiltEventIds = cfg._rebuiltEventIds || new Set();

    // Schedule renders to coalesce updates and keep frames smooth
    cfg._renderScheduled = false;
    cfg.scheduleRender = function(){ if (cfg._renderScheduled) return; cfg._renderScheduled = true; rAF(function(){ cfg._renderScheduled = false; renderDayEvents(cfg); }); };

    var prevBtn = $(cfg.ids.prev), nextBtn = $(cfg.ids.next);

    function nav(deltaWeeks){
      var candidateStart = addDays(cfg._weekStart, 7*deltaWeeks);
      if (isBefore(candidateStart, cfg._minWeekStart)) candidateStart = cfg._minWeekStart;
      cfg._weekStart = candidateStart;
      cfg._weekEnd   = endOfWeek(cfg._weekStart);
      // keep activeDay within new week; if current week, do not allow past days
      cfg._activeDay = new Date(Math.max(+cfg._weekStart, +cfg._todayStart));
      renderWeekButtons(cfg);
      // Use cache if present; otherwise fetch and then render
      var wkKey = weekKeyForRange(cfg._weekStart);
      if (cfg._weekCache && cfg._weekCache[wkKey]) {
        cfg._eventsByDay = cfg._weekCache[wkKey];
        setLoading(cfg, false);
        cfg.scheduleRender();
      } else {
        fetchWeek(cfg).then(function(){ cfg.scheduleRender(); });
      }
      updatePrevDisabled();
    }

    if (prevBtn && !prevBtn.__bound){ prevBtn.__bound=true; prevBtn.addEventListener('click', function(){ nav(-1); }); }
    if (nextBtn && !nextBtn.__bound){ nextBtn.__bound=true; nextBtn.addEventListener('click', function(){ nav(1); }); }

    function updatePrevDisabled(){
      if (!prevBtn) return;
      var disable = !isBefore(cfg._minWeekStart, cfg._weekStart); // true when at min
      prevBtn.disabled = disable;
      if (disable) prevBtn.classList.add('is-disabled'); else prevBtn.classList.remove('is-disabled');
    }

    renderWeekButtons(cfg);
    updatePrevDisabled();
    ensureEventiveReady(function(){ fetchWeek(cfg).then(function(){ cfg.scheduleRender(); }); });
  }

  function initAll(){ var list=(window.__EVT_NATIVE_YR||[]); if(!list.length) return; list.forEach(initOne); }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll, { once:true }); else initAll();

  // Elementor: re‑init when widgets mount
  if (window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try{ elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(){ initAll(); }); }catch(_){ }
    });
  }
})();