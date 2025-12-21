(function(){
  // ------------------------
  // Helpers (shared style)
  // ------------------------
  function inParentAccountContainer(el){
    try { return !!(el && el.closest && el.closest('.eventive-account-container')); } catch(_) { return false; }
  }
  function show(el){ if(el) el.style.display = 'block'; }
  function hide(el){ if(el) el.style.display = 'none'; }
  function showMessage(el, msg){ if(!el) return; el.innerHTML = '<div class="eventive-notice" style="text-align:center;">'+ (msg||'No data available.') +'</div>'; }
  function pickFirst(){ for(var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!==undefined && v!==null && v!=='') return v; } }
  function ensureAbsolute(url){ if(!url) return url; if(/^https?:\/\//i.test(url)) return url; return 'https://api.eventive.org' + (url.charAt(0)==='/'?'' : '/') + url; }
  function currency(n){ try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n); }catch(_){ return '$'+(n||0); } }
  function fmtDT(iso){ try{ var d=new Date(iso); if(!iso||isNaN(d)) return ''; return d.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }); }catch(_){ return iso||''; } }

  // Simple filter state per instance
  function getFilter(cfg){ return (cfg && cfg.__filter) || 'all'; }
  function setFilter(cfg, val){ if(cfg) cfg.__filter = val || 'all'; }

  // Modal helpers (centered, closable)
  function isModal(el){ return !!(el && (el.classList.contains('eventive-ticket-barcode-modal'))); }
  function openModal(el){ if(!el) return; if(isModal(el)){ el.style.display = 'flex'; el.classList.add('is-open'); try{ document.body.style.overflow='hidden'; }catch(_){} } else { el.style.display='block'; } }
  function closeModal(el){ if(!el) return; el.style.display='none'; el.classList.remove('is-open'); try{ document.body.style.overflow=''; }catch(_){} if(el.__escBound&&el.__escHandler){ document.removeEventListener('keydown', el.__escHandler); el.__escBound=false; el.__escHandler=null; } }
  function bindOverlayToClose(modal){ if(!modal||modal.__overlayBound) return; modal.__overlayBound=true; modal.addEventListener('click', function(e){ if(e.target===modal){ closeModal(modal); } }); }
  function bindEscToClose(modal){ if(!modal||modal.__escBound) return; modal.__escHandler=function(ev){ if(ev.key==='Escape'){ closeModal(modal); } }; document.addEventListener('keydown', modal.__escHandler); modal.__escBound=true; }

  // ------------------------
  // Filter UI (dropdown toggler)
  // ------------------------
  function buildFilterBar(cfg){
    var fid = (cfg.list + '_filter');
    return (
      '<div class="eventive-ticket-filters" style="display:flex;align-items:center;gap:8px;margin:6px 0 12px;">'
      +  '<label for="'+fid+'" style="font-weight:600;">Show:</label>'
      +  '<select id="'+fid+'" class="eventive-ticket-filter-select">'
      +    '<option value="all">All</option>'
      +    '<option value="upcoming">Upcoming</option>'
      +    '<option value="virtual">Virtual</option>'
      +    '<option value="past">Past</option>'
      +  '</select>'
      + '</div>'
    );
  }
  function bindFilterBar(cfg){
    var fid = (cfg.list + '_filter');
    var sel = document.getElementById(fid);
    if(!sel || sel.__bound) return;
    sel.__bound = true;
    // Initialize from current cfg
    var cur = getFilter(cfg);
    try { sel.value = cur; } catch(_) {}
    sel.addEventListener('change', function(){ setFilter(cfg, sel.value); /* re-render below by calling renderer again */ var _tickets = (cfg && cfg.__lastTickets) || []; renderTicketsInto(cfg, _tickets, true); });
  }

  // --------------------------------------
  // Data fetching with bucket scoping
  // --------------------------------------
  var TICKET_CACHE = {};
  function fetchTickets(bucket){
    var key = bucket || 'ALL';
    if(TICKET_CACHE[key]) return Promise.resolve(TICKET_CACHE[key]);
    if(!window.Eventive) return Promise.reject(new Error('Eventive not ready'));

    var qs = {};
    if(bucket){ try{ qs.conditions = JSON.stringify({ event_bucket: bucket }); }catch(_){} }

    return Eventive.request({ method:'GET', path:'people/self/tickets', qs: qs, authenticatePerson:true })
      .then(function(res){ var list=(res && (res.tickets||res))||[]; TICKET_CACHE[key]=list; return list; })
      .catch(function(){
        // Fallback to including_global endpoint if available in your tenant
        return Eventive.request({ method:'GET', path:'people/self/tickets_including_global', qs: qs, authenticatePerson:true })
          .then(function(res){ var list=(res && (res.tickets||res))||[]; TICKET_CACHE[key]=list; return list; });
      });
  }

  // --------------------------------------
  // Rendering
  // --------------------------------------
  function ticketTitle(t){
    var ev = t.event || t.screening || t.showing || {};
    return pickFirst(t.name, ev.name, ev.title, 'Ticket');
  }
  function ticketWhenWhere(t){
    var ev = t.event || t.screening || t.showing || {};
    var dt = pickFirst(ev.start_time, ev.begins_at, ev.starts_at, t.starts_at);
    var venue = pickFirst(ev.venue && ev.venue.name, ev.venue_name, t.venue_name);
    var bits = [];
    if(dt) bits.push(fmtDT(dt));
    if(venue) bits.push(venue);
    return bits.join(' • ');
  }
  function ticketSeatInfo(t){
    var seat = pickFirst(t.seat_label, t.seat, (t.seat && t.seat.name));
    var row  = pickFirst(t.row_label, t.row);
    var sec  = pickFirst(t.section_label, t.section);
    var parts=[]; if(sec) parts.push('Sec '+sec); if(row) parts.push('Row '+row); if(seat) parts.push('Seat '+seat); return parts.join(' · ');
  }
  function isVirtual(t){
    var ev = t.event || t.screening || t.showing || {};
    return !!pickFirst(t.is_virtual, ev.is_virtual, ev.virtual);
  }
  function virtualUrl(t){
    return pickFirst(t.virtual_url, t.watch_url, t.player_url, (t.event && t.event.virtual_url));
  }
  function ticketQR(t){
    return ensureAbsolute(pickFirst(t.qr_code_path, t.barcode_path, (t.barcode && t.barcode.path)));
  }

  function toStartMs(t){
    var ev = t.event||t.screening||t.showing||{};
    var dt = pickFirst(ev.start_time, ev.begins_at, ev.starts_at, t.starts_at);
    var ms = Date.parse(dt||'');
    return isNaN(ms) ? null : ms;
  }
  function isPastEvent(t){
    var ms = toStartMs(t); if(ms===null) return false; return ms < Date.now();
  }
  function getUnlockedUntilMs(t){
    var ev = t.event||t.screening||t.showing||{};
    var u = pickFirst(t.unlocked_until, t.virtual_unlocked_until, ev.unlocked_until, ev.virtual_unlocked_until);
    var ms = Date.parse(u||'');
    return isNaN(ms) ? null : ms;
  }
  function isVirtualExpired(t){
    if(!isVirtual(t)) return false;
    var ms = getUnlockedUntilMs(t); if(ms===null) return false; // treat null as unknown -> not expired UI
    return ms < Date.now();
  }
  function scannedAtText(t){
    var s = pickFirst(t.scanned_at, (t.scan && t.scan.scanned_at));
    if(!s) return '';
    try{ var d=new Date(s); return d.toLocaleString([], { dateStyle:'medium', timeStyle:'short' }); }catch(_){ return String(s); }
  }

  function renderTicketCard(t, idx){
    var title = ticketTitle(t);
    var meta  = ticketWhenWhere(t);
    var seat  = ticketSeatInfo(t);
    var virt  = isVirtual(t);
    var actions = '<button class="evt-btn evt-btn-secondary" data-act="barcode">Show Code</button>';
    if(virt && virtualUrl(t)) actions += ' <a class="evt-btn evt-btn-primary" data-act="watch" href="'+ virtualUrl(t) +'" target="_blank" rel="noopener">Watch</a>';

    return (
      '<div class="eventive-ticket-card" data-idx="'+ idx +'">\n'
      + '  <div class="eventive-ticket-card__body">\n'
      + '    <div class="eventive-ticket-card__title">'+ (title||'Ticket') +'</div>\n'
      + '    <div class="eventive-ticket-card__meta">'+ (meta||'') +'</div>\n'
      + (seat ? ('    <div class="eventive-ticket-card__seat">'+ seat +'</div>\n') : '')
      + '  </div>\n'
      + '  <div class="eventive-ticket-card__actions">'+ actions +'</div>\n'
      + '</div>'
    );
  }

  function openBarcodeModal(cfg, t){
    var modal = document.getElementById(cfg.modal);
    var body  = document.getElementById(cfg.modalBody);
    var close = document.getElementById(cfg.modalClose);
    if(!modal||!body) return;

    var title = ticketTitle(t);
    var meta  = ticketWhenWhere(t);
    var code  = ticketQR(t);

    var past  = isPastEvent(t);
    var scannedTxt = scannedAtText(t);

    var overlay = past ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:8px;">\
        <div style="font-weight:800;letter-spacing:.3px;">\
          <div style="font-size:18px;">This event has passed</div>\
          <div style="font-size:12px;opacity:.9;">Barcode disabled</div>\
        </div>\
      </div>' : '';

    var scannedBadge = scannedTxt ? '<div style="text-align:center;margin:6px 0 4px 0;"><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#dcfce7;color:#14532d;font-weight:700;">Scanned '+ scannedTxt +'</span></div>' : '';

    var html = ''
      + '<h3 style="margin:0 0 10px 0; text-align:center;">'+ (title||'Ticket') +'</h3>'
      + (meta ? ('<div style="text-align:center;opacity:.8;margin-bottom:6px;">'+ meta +'</div>') : '')
      + scannedBadge
      + (code ? ('<div style="position:relative;display:flex;justify-content:center;margin-top:6px;">'
          + '<img src="'+ code +'" alt="Ticket QR" style="max-width:320px;width:100%;height:auto;border:1px solid #eee;border-radius:8px;padding:12px;"/>'
          + overlay
        + '</div>') : '<p>No barcode available.</p>');

    body.innerHTML = html;

    if(close && !close.__bound){ close.__bound=true; close.addEventListener('click', function(){ closeModal(modal); }); }
    bindOverlayToClose(modal);
    bindEscToClose(modal);
    openModal(modal);
  }

  function renderTicketsInto(cfg, tickets, skipCache){
    var list = document.getElementById(cfg.list);
    if(!list) return;

    if (!skipCache) cfg.__lastTickets = tickets;

    if(!tickets || !tickets.length){
      list.innerHTML = '<h2>Tickets</h2><p>No tickets found for this account.</p>';
      return;
    }

    // Simple grouping: Upcoming (has future start), Virtual (is virtual), Past
    var now = Date.now();
    function toStartMs(t){ var ev = t.event||t.screening||t.showing||{}; var dt=pickFirst(ev.start_time, ev.begins_at, ev.starts_at, t.starts_at); var ms=Date.parse(dt||''); return isNaN(ms)?null:ms; }

    var upcoming = [], virtuals = [], past = [];
    tickets.forEach(function(t){
      var ms = toStartMs(t);
      if(isVirtual(t)) { virtuals.push(t); return; }
      if(ms===null){ past.push(t); return; }
      if(ms >= now) upcoming.push(t); else past.push(t);
    });

    // Deleted initial list.innerHTML and bind-actions loop here as per instructions

    // Attach ticket objects directly for reliability
    // Re-render to attach references in DOM (cheap for typical list sizes)
    var cards = [];
    function renderWithRefs(arr){
      function getEventId(t) {
        return t.event && t.event.id ? t.event.id : '';
      }
      return arr.map(function(t){
        var idx = cards.push(t) - 1;
        return '<div class="eventive-ticket-card" data-idx="'+idx+'">'+
          '<div class="eventive-ticket-card__body">'+
            '<div class="eventive-ticket-card__title">'+(ticketTitle(t)||'Ticket')+'</div>'+
            (function(){
              var bits=[];
              var sTxt = scannedAtText(t);
              if(sTxt){ bits.push('<span class="evt-badge" style="display:inline-block;margin-right:6px;padding:2px 8px;border-radius:999px;background:#dcfce7;color:#14532d;font-weight:700;">Scanned '+sTxt+'</span>'); }
              if(!isVirtual(t) && isPastEvent(t)){
                bits.push('<span class="evt-badge" style="display:inline-block;margin-right:6px;padding:2px 8px;border-radius:999px;background:#e5e7eb;color:#111827;font-weight:700;">Event passed</span>');
              }
              if(isVirtual(t) && isVirtualExpired(t)){
                bits.push('<span class="evt-badge" style="display:inline-block;margin-right:6px;padding:2px 8px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:700;">Virtual window closed</span>');
              }
              return bits.join('');
            })()+
            '<div class="eventive-ticket-card__meta">'+(ticketWhenWhere(t)||'')+'</div>'+
            (ticketSeatInfo(t)?('<div class="eventive-ticket-card__seat">'+ticketSeatInfo(t)+'</div>'):'')+
          '</div>'+
          '<div class="eventive-ticket-card__actions">'+
            (isVirtual(t)
              ? (isVirtualExpired(t)
                  ? '<span class="evt-badge evt-badge-expired" style="display:inline-block;padding:6px 10px;border-radius:6px;background:#fee2e2;color:#991b1b;font-weight:700;">Virtual window closed</span>'
                  : '<div class="eventive-button" data-event="'+ (getEventId(t) || '') +'"></div>'
                )
              : (
                  '<button class="evt-btn evt-btn-secondary" data-act="barcode">Show Code</button>'
                  + (getEventId(t)
                      ? ' <div class="eventive-button" data-vote-event="'+ getEventId(t) +'" data-vote="true"></div>'
                      : ''
                    )
                )
            )+
          '</div>'+
        '</div>';
      }).join('');
    }

    var filterVal = getFilter(cfg);
    var U = upcoming.slice(), V = virtuals.slice(), P = past.slice();
    if (filterVal === 'upcoming') { V = []; P = []; }
    else if (filterVal === 'virtual') { U = []; P = []; }
    else if (filterVal === 'past') { U = []; V = []; }

    list.innerHTML = '<h2>Tickets</h2>'
      + buildFilterBar(cfg)
      + (U.length?('<h3 class="eventive-ticket-section">Upcoming</h3>'+renderWithRefs(U)):'')
      + (V.length?('<h3 class="eventive-ticket-section">Virtual</h3>'+renderWithRefs(V)):'')
      + (P.length?('<h3 class="eventive-ticket-section">Past</h3>'+renderWithRefs(P)):'');

    bindFilterBar(cfg);

    list.querySelectorAll('.eventive-ticket-card [data-act="barcode"]').forEach(function(btn){
      if(btn.__bound) return; btn.__bound=true;
      btn.addEventListener('click', function(){
        var card = btn.closest('.eventive-ticket-card');
        var idx = card ? parseInt(card.getAttribute('data-idx'),10) : -1;
        var t = cards[idx]; if(!t) return;
        openBarcodeModal(cfg, t);
      });
    });

    // Initialize dynamically injected Eventive buttons
    setTimeout(function(){
      if (window.Eventive && Eventive.rebuild) {
        try { Eventive.rebuild(); } catch(e){}
      }
    }, 100);
  }

  // ------------------------
  // Initializer
  // ------------------------
  function initOne(cfg){
    if(!cfg) return;
    var wrap  = document.getElementById(cfg.wrap);
    var login = document.getElementById(cfg.login);
    var list  = document.getElementById(cfg.list);
    if(!wrap || wrap.__inited) return; wrap.__inited = true;

    // Fallback if Eventive never loads (standalone only)
    var fallback = setTimeout(function(){
      if(!window.Eventive || !Eventive.on){
        if(!inParentAccountContainer(wrap)){
          showMessage(list, 'Eventive is not available. Please check your connection and try again.');
          hide(login); show(list);
        }
      }
    }, 2500);

    function boot(){
      if(!window.Eventive || !Eventive.on) return; // fallback covers this case
      Eventive.on('ready', function(){
        clearTimeout(fallback);
        try {
          if (Eventive.isLoggedIn()) {
            hide(login); show(list);
            fetchTickets(cfg.bucket).then(function(tickets){ renderTicketsInto(cfg, tickets); })
              .catch(function(err){ console.error('Failed to fetch tickets:', err); showMessage(list, 'Could not load your tickets.'); });
          } else {
            if(!inParentAccountContainer(wrap)){
              showMessage(list, 'You are not logged in. Please log in to view your tickets.');
              hide(login); show(list);
            } else {
              hide(list); // parent handles login UI
            }
          }
        } catch(e){
          console.error('[tickets] ready error', e);
          showMessage(list, 'There was a problem loading your tickets.');
          hide(login); show(list);
        }
      });
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  }

  function initAll(){
    var cfgs = (window.__EVT_ACCOUNT_TICKETS||[]); if(!cfgs.length) return;
    cfgs.forEach(initOne);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll, {once:true});
  else initAll();

  if(window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try{ elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(){ initAll(); }); }catch(_){}
    });
  }
})();
