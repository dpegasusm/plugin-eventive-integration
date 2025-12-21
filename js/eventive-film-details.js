(function(){
  // Eventive Film Details (Elementor-safe)
  function $(id){ return document.getElementById(id); }
  function bySel(root, sel){ return (root||document).querySelector(sel); }
  function htmlEscape(str){ return (str||'').replace(/[&<>\"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function getContrastYIQ(hex){
    if (!hex) return '#000';
    hex = String(hex).replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    const r=parseInt(hex.substr(0,2),16)||0, g=parseInt(hex.substr(2,2),16)||0, b=parseInt(hex.substr(4,2),16)||0;
    return ((r*299+g*587+b*114)/1000 >= 128) ? '#000' : '#fff';
  }
  function toEmbed(raw){
    try{
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./,'').toLowerCase();
      if (host === 'youtu.be') {
        const id = (u.pathname.split('/')[1]||'').trim();
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : null;
      }
      if (host.endsWith('youtube.com')) {
        const id = u.searchParams.get('v') || (u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : '');
        return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` : null;
      }
      if (host.endsWith('vimeo.com')) {
        const parts = u.pathname.split('/').filter(Boolean);
        const id = (host==='player.vimeo.com') ? (parts[1]==='video'?parts[2]:parts[1]) : parts[0];
        return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
      }
      return null;
    }catch(e){ return null; }
  }

  function render(container, film, opts){
    const tagsHTML = (film.tags||[]).map(tag=>{
      const text = getContrastYIQ(tag.color||'#ccc');
      return `<span class="film-tag-pill" style="background-color:${tag.color||'#ccc'};color:${text};">${htmlEscape(tag.name)}</span>`;
    }).join('');

    const credits = film.credits || {};
    const creditsHTML = Object.keys(credits).map(k=>{
      const v = credits[k];
      return v ? `<div><strong>${htmlEscape(k.replace(/_/g,' ').toUpperCase())}:</strong> ${htmlEscape(String(v))}</div>` : '';
    }).join('');

    const trailerBtn = film.trailer_url
      ? `<button class="film-watch-button" data-trailer-url="${htmlEscape(film.trailer_url)}" style="width:100%;max-width:400px;margin-top:8px;padding:10px 0;background:#ff3b3b;color:#fff;font-weight:600;border:none;border-radius:4px;cursor:pointer;">▶ Watch Trailer</button>`
      : '';

    container.innerHTML =
      `<div class="hero-section" ${film.cover_image?`style="background-image:url('${htmlEscape(film.cover_image)}');"`:''}>
        <div class="film-images" style="display:flex;flex-direction:column;align-items:center;">
          <img class="film-poster" src="${htmlEscape(film.poster_image||'')}" alt="${htmlEscape(film.name||'Film')}">
          ${trailerBtn}
        </div>
      </div>
      <div class="film-details">
        <h2 class="film-title">${htmlEscape(film.name||'')}</h2>
        ${opts.showDetails ? `
        <div class="film-info">
          <div><strong>Director:</strong> ${htmlEscape((film.credits&&film.credits.director)||'Unknown')}</div>
          <div><strong>Runtime:</strong> ${htmlEscape(String((film.details&&film.details.runtime)||'N/A'))} minutes</div>
          <div><strong>Year:</strong> ${htmlEscape(String((film.details&&film.details.year)||'N/A'))}</div>
          <div><strong>Language:</strong> ${htmlEscape(String((film.details&&film.details.language)||'N/A'))}</div>
        </div>` : ''}
        <div class="film-description">${film.description||'No description available.'}</div>
        ${opts.showTags ? `<div class="film-tags">${tagsHTML}</div>` : ''}
        ${opts.showDetails ? `<div class="film-credits"><h3>Credits</h3>${creditsHTML}</div>` : ''}
        ${opts.showEvents ? `<div class="film-events"></div>` : ''}
      </div>`;
  }

  function setupTrailer(container){
    const btn = bySel(container, '.film-watch-button');
    if(!btn) return;

    let modal = document.querySelector('.eventive-trailer-modal');
    let iframe;
    if(!modal){
      modal = document.createElement('div');
      modal.className = 'eventive-trailer-modal';
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-modal','true');
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="eventive-trailer-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);"></div>
        <div class="eventive-trailer-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;border-radius:8px;display:block;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);width:min(90vw,960px);">
          <button class="eventive-trailer-close" aria-label="Close trailer" title="Close" style="position:absolute;top:6px;right:8px;border:0;background:rgba(0,0,0,0.4);color:#fff;font-size:26px;line-height:1;padding:8px 12px;border-radius:6px;cursor:pointer;z-index:2">×</button>
          <div class="eventive-trailer-embed" style="position:relative;padding-top:56.25%;width:100%;">
            <iframe class="eventive-trailer-iframe" src="" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.style.zIndex = '10000';
      iframe = bySel(modal, '.eventive-trailer-iframe');
      const close = ()=>{ iframe.src=''; modal.style.display='none'; document.documentElement.style.overflow=''; };
      bySel(modal, '.eventive-trailer-close').addEventListener('click', close);
      bySel(modal, '.eventive-trailer-backdrop').addEventListener('click', close);
      modal.addEventListener('click', (e)=>{ const dialog = bySel(modal, '.eventive-trailer-dialog'); if(dialog && !dialog.contains(e.target)) close(); });
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal.style.display==='block') close(); });
    } else {
      iframe = bySel(modal, '.eventive-trailer-iframe');
    }

    btn.addEventListener('click', (ev)=>{
      ev.preventDefault();
      const embed = toEmbed(btn.getAttribute('data-trailer-url')||'');
      if(!embed){ console.warn('[eventive-film-details] Unsupported trailer URL'); return; }
      iframe.src = embed;
      modal.style.display = 'block';
      document.documentElement.style.overflow = 'hidden';
    });
  }

  function fetchEventsAndRenderButtons(container, cfg, opts){
    if (!opts.showEvents) return;
    const url = `event_buckets/${encodeURIComponent(cfg.eventBucket)}/films/${encodeURIComponent(cfg.filmId)}/events`;
    window.Eventive.request({ method:'GET', path:url, authenticatePerson:true })
      .then((resp)=>{
        let events = [];
        if (Array.isArray(resp && resp.events)) events = resp.events;
        else if (Array.isArray(resp)) events = resp;
        else if (resp && resp.data && Array.isArray(resp.data.events)) events = resp.data.events;

        const now = new Date();
        // Dated events that are still upcoming
        const upcomingDated = events
          .filter(e => e && e.start_time && !isNaN(new Date(e.start_time)) && new Date(e.start_time) > now)
          .filter(e => !opts.excludeVirtual || !e.is_virtual);

        // Undated virtual events (on-demand / unrestricted) should still render when virtual
        // screenings are allowed (excludeVirtual === false)
        let undatedVirtual = [];
        if (!opts.excludeVirtual) {
          undatedVirtual = events.filter(e =>
            e &&
            e.is_virtual === true &&
            e.is_dated === false &&
            (!e.start_time || isNaN(new Date(e.start_time)))
          );
        }

        // Combine and sort; undated virtual events will be pushed to the end of the list
        const upcoming = upcomingDated
          .concat(undatedVirtual)
          .sort((a, b) => {
            const aHasDate = a && a.start_time && !isNaN(new Date(a.start_time));
            const bHasDate = b && b.start_time && !isNaN(new Date(b.start_time));
            if (aHasDate && bHasDate) {
              return new Date(a.start_time) - new Date(b.start_time);
            }
            if (aHasDate && !bHasDate) return -1; // dated first
            if (!aHasDate && bHasDate) return 1;
            return 0;
          });

        const listEl = bySel(container, '.film-events');
        if (!listEl) return;
        if (!upcoming.length) {
          if (opts.showEvents) {
            listEl.innerHTML = '<div>Scheduled showtime coming soon!</div>';
            if (window.Eventive && Eventive.rebuild) Eventive.rebuild();
          } else {
            listEl.innerHTML = '';
          }
          return;
        }

        // Group by same calendar date and same venue; handle undated virtual "on-demand" events
        const groups = {};
        upcoming.forEach((ev) => {
          if (!ev) return;
          const hasValidStart = ev.start_time && !isNaN(new Date(ev.start_time));
          const isUndatedVirtual = ev.is_virtual === true && ev.is_dated === false && !hasValidStart;

          const venueName = (ev.venue && (ev.venue.name || ev.venue.display_name || ev.venue.slug)) || (ev.is_virtual ? 'Virtual' : 'TBA');
          let dt = hasValidStart ? new Date(ev.start_time) : null;
          let key;
          let dateForGroup;
          let dateStr;

          if (isUndatedVirtual) {
            // Group all undated virtual screenings into a single "On-demand" block
            key = 'virtual_anytime::virtual';
            // Use a max-date sentinel so this group sorts after dated screenings
            dateForGroup = new Date(8640000000000000);
            dateStr = 'ON-DEMAND';
          } else if (dt) {
            const dateKey = dt.toLocaleDateString(undefined, { year:'numeric', month:'2-digit', day:'2-digit' });
            const venueId = (ev.venue && ev.venue.id) || (ev.is_virtual ? 'virtual' : 'tba');
            key = dateKey + '::' + venueId;
            dateForGroup = dt;
            dateStr = dt.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' }).toUpperCase();
          } else {
            // Fallback: if somehow we get here without a date, skip
            return;
          }

          if (!groups[key]) {
            groups[key] = {
              date: dateForGroup,
              dateStr: dateStr,
              venueName: venueName,
              isUndatedVirtual: isUndatedVirtual,
              items: []
            };
          }

          groups[key].items.push({
            id: ev.id || '',
            dt: dt,
            tz: ev.timezone || (ev.venue && ev.venue.timezone) || undefined,
            venueName: venueName,
            isUndatedVirtual: isUndatedVirtual
          });
        });

        const groupList = Object.values(groups)
          .sort((a,b)=> a.date - b.date)
          .map(g=>{ g.items.sort((a,b)=> a.dt - b.dt); return g; });

        const rows = groupList.map((g)=>{
          const itemsHTML = g.items.map((it) => {
            const timeStr = it.dt
              ? it.dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: it.tz }).toLowerCase()
              : 'on demand';
            return `
              <div class="eventive-showtime-row" style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:6px 0;">
                <span class="eventive-showtime-time" style="font-weight:600;white-space:nowrap;">${timeStr}</span>
                <span class="eventive-showtime-venue" style="opacity:.85;">${htmlEscape(it.venueName)}</span>
                <div class="eventive-showtime-btn"><div class="eventive-button" data-event="${it.id}" data-label="${timeStr}"></div></div>
              </div>`;
          }).join('');

          return `
            <div class="eventive-screening" style="padding:12px 0;border-top:1px solid rgba(0,0,0,0.08);">
              <div class="eventive-screening__header" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;">
                <div class="eventive-screening__datetime" style="font-weight:700;">${g.dateStr}</div>
                <div class="eventive-screening__venue" style="opacity:0.85;">${htmlEscape(g.venueName)}</div>
              </div>
              <div class="eventive-screening__items">${itemsHTML}</div>
            </div>`;
        }).join('');
        listEl.innerHTML = `<h3 class="eventive-events-title">Upcoming Events</h3><div class="eventive-events-list">${rows}</div>`;
        if(window.Eventive && typeof window.Eventive.rebuild === 'function') window.Eventive.rebuild();
      })
      .catch((err)=>{
        console.error('[eventive-film-details] Error fetching events:', err && (err.message || err.status || err));
        const listEl = bySel(container, '.film-events');
        if(listEl) listEl.innerHTML = '<div>Error loading events for this film.</div>';
      });
  }

  function initOne(cfg){
    const container = $(cfg.containerId);
    if(!container || container.__inited) return; container.__inited = true;

    const dataAttrExcludeVirtual = container.dataset.excludeVirtual; // "true" | "false" | undefined

    let excludeVirtual;

    // Prefer an explicit boolean from the JS config if provided
    if (typeof cfg.excludeVirtual === 'boolean') {
      excludeVirtual = cfg.excludeVirtual;
    } else if (cfg.excludeVirtual === 'true' || cfg.excludeVirtual === '1') {
      // Handle string-y truthy values
      excludeVirtual = true;
    } else if (cfg.excludeVirtual === 'false' || cfg.excludeVirtual === '0') {
      // Handle string-y falsy values
      excludeVirtual = false;
    } else if (dataAttrExcludeVirtual === 'true') {
      // Fallback to data attribute if present
      excludeVirtual = true;
    } else if (dataAttrExcludeVirtual === 'false') {
      excludeVirtual = false;
    } else {
      // Default behavior: exclude virtual events unless explicitly disabled
      excludeVirtual = true;
    }

    const opts = {
      // Default to showing events unless explicitly disabled (show-events="false")
      showEvents: (cfg.showEvents === false) ? false : true,
      showDetails: !!cfg.showDetails,
      showTags: !!cfg.showTags,
      excludeVirtual: excludeVirtual
    };

    function start(){
      const filmUrl = `films/${encodeURIComponent(cfg.filmId)}`;
      window.Eventive.request({ method:'GET', path: filmUrl, authenticatePerson:true })
        .then((film)=>{ film = film||{}; render(container, film, opts); setupTrailer(container); if(opts.showEvents){ fetchEventsAndRenderButtons(container, cfg, opts); } })
        .catch((err)=>{ console.error('[eventive-film-details] Error fetching film:', err && (err.message||err.status||err)); container.innerHTML = '<div>Error loading film details.</div>'; });
    }

    if(window.Eventive && typeof window.Eventive.on === 'function'){
      if(window.Eventive._ready) start(); else window.Eventive.on('ready', start);
    } else {
      container.innerHTML = '<div>Eventive API is not available.</div>';
    }
  }

  function initAll(){ (window.__EVT_FILM_DETAILS||[]).forEach(initOne); }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll, { once:true }); else initAll();

  if(window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try{ elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(){ initAll(); }); }catch(_){}
    });
  }
})();