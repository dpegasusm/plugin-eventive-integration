(function(){
  // ---------- Helpers ----------
  function inParentAccountContainer(el){
    try { return !!(el && el.closest && el.closest('.eventive-account-container')); } catch(_) { return false; }
  }
  function show(el){ if(el) el.style.display = 'block'; }
  function hide(el){ if(el) el.style.display = 'none'; }
  function showMessage(container, msg){ if(!container) return; container.innerHTML = '<div class="eventive-notice" style="text-align:center;">'+ (msg||'No data available.') +'</div>'; }
  function pickFirst(){ for(var i=0;i<arguments.length;i++){ var v=arguments[i]; if(v!==undefined && v!==null && v!=='') return v; } }
  function ensureAbsolute(url){ if(!url) return url; if(/^https?:\/\//i.test(url)) return url; return 'https://api.eventive.org' + (url.charAt(0)==='/'?'' : '/') + url; }
  function currency(n){ try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n); }catch(_){ return '$'+(n||0); } }

  function isModal(el){
    return !!(el && (el.classList.contains('eventive-edit-pass-modal') || el.classList.contains('eventive-show-pass-barcode-modal')));
  }
  function openModal(el){
    if(!el) return;
    if(isModal(el)){
      el.style.display = 'flex';
      el.classList.add('is-open');
      try { document.body.style.overflow = 'hidden'; } catch(_) {}
    } else {
      el.style.display = 'block';
    }
  }
  function closeModal(el){
    if(!el) return;
    el.style.display = 'none';
    el.classList.remove('is-open');
    try { document.body.style.overflow = ''; } catch(_) {}
    // Unbind ESC handler if we added one
    if (el.__escBound && el.__escHandler){
      document.removeEventListener('keydown', el.__escHandler);
      el.__escBound = false;
      el.__escHandler = null;
    }
  }
  function bindOverlayToClose(modal){
    if(!modal || modal.__overlayBound) return;
    modal.__overlayBound = true;
    modal.addEventListener('click', function(e){
      if(e.target === modal){ closeModal(modal); }
    });
  }
  function bindEscToClose(modal){
    if(!modal || modal.__escBound) return;
    modal.__escHandler = function(ev){ if(ev.key === 'Escape'){ closeModal(modal); } };
    document.addEventListener('keydown', modal.__escHandler);
    modal.__escBound = true;
  }

  // Cache per-bucket to avoid duplicate fetches across instances
  var PASS_CACHE = {};

  // Fetch person's passes; prefer scoped to bucket, fallback to including_global if needed
  function fetchPasses(bucket){
    var key = bucket || 'ALL';
    if (PASS_CACHE[key]) return Promise.resolve(PASS_CACHE[key]);
    if (!window.Eventive) return Promise.reject(new Error('Eventive not ready'));

    var qs = {};
    if (bucket) {
      try { qs.conditions = JSON.stringify({ event_bucket: bucket }); } catch(_) {}
    }

    // primary attempt
    return Eventive.request({ method:'GET', path:'people/self/passes', qs: qs, authenticatePerson:true })
      .then(function(res){ var list = (res && (res.passes || res)) || []; PASS_CACHE[key]=list; return list; })
      .catch(function(err){
        // fallback to including_global variant if primary fails
        return Eventive.request({ method:'GET', path:'people/self/passes_including_global', qs: qs, authenticatePerson:true })
          .then(function(res){ var list = (res && (res.passes || res)) || []; PASS_CACHE[key]=list; return list; });
      });
  }

  function renderPassCard(pass, idx){
    var name = pickFirst(pass.name, pass.pass_name, pass.title, 'Pass');
    var type = pickFirst(pass.type, (pass.pass && pass.pass.type));
    var status = pass.status || (pass.checked_in ? 'Checked in' : 'Active');
    var benefits = (pass.benefits && Array.isArray(pass.benefits)) ? pass.benefits.join(', ') : '';
    var events = pass.events_remaining != null ? (pass.events_remaining + ' left') : '';
    var sale = pass.gross_cents != null ? currency(pass.gross_cents/100) : '';

    var metaBits = [type, events, sale].filter(Boolean).join(' • ');

    return (
      '<div class="eventive-pass-card" data-pass-idx="'+ idx +'">\n'
      +  '  <div class="eventive-pass-card__body">\n'
      +  '    <div class="eventive-pass-card__title">'+ (name||'Pass') +'</div>\n'
      +  '    <div class="eventive-pass-card__meta">'+ (metaBits||'') +'</div>\n'
      +  (benefits ? ('    <div class="eventive-pass-card__benefits">'+ benefits +'</div>\n') : '')
      +  '  </div>\n'
      +  '  <div class="eventive-pass-card__actions">\n'
      +  '    <button class="evt-btn evt-btn-secondary" data-act="edit">Edit</button>\n'
      +  '    <button class="evt-btn evt-btn-primary" data-act="barcode">Show Barcode</button>\n'
      +  '  </div>\n'
      +  '</div>'
    );
  }

  function openEditModal(cfg, pass, idx){
    var modal = document.getElementById(cfg.edit_modal);
    var form  = document.getElementById(cfg.edit_form);
    var nameI = document.getElementById(cfg.edit_name);
    var idxI  = document.getElementById(cfg.edit_idx);
    var fieldsWrap = document.getElementById(cfg.edit_fields);
    var closeBtn = document.getElementById(cfg.edit_close);

    if(!modal||!form) return;

    // Prefill
    nameI && (nameI.value = pickFirst(pass.name, pass.pass_name, ''));
    idxI && (idxI.value = String(idx));

    // Render supplementary fields if present
    fieldsWrap && (fieldsWrap.innerHTML = '');
    var supp = pass.supplementary_data || pass.supplementary_fields || {};
    try {
      if (Array.isArray(supp)) {
        // array of { key, value, label }
        supp.forEach(function(f){
          var key = f.key || f.name || f.id;
          var label = f.label || f.name || key;
          var val = f.value != null ? f.value : '';
          fieldsWrap.insertAdjacentHTML('beforeend',
            '<div class="form-group">\n'
            + '  <label>'+ (label||key) +'</label>\n'
            + '  <input type="text" name="supp['+ key +']" value="'+ String(val).replace(/"/g,'&quot;') +'" />\n'
            + '</div>'
          );
        });
      } else if (supp && typeof supp === 'object') {
        Object.keys(supp).forEach(function(key){
          var val = supp[key];
          fieldsWrap.insertAdjacentHTML('beforeend',
            '<div class="form-group">\n'
            + '  <label>'+ key +'</label>\n'
            + '  <input type="text" name="supp['+ key +']" value="'+ String(val==null?'':val).replace(/"/g,'&quot;') +'" />\n'
            + '</div>'
          );
        });
      }
    } catch(_) {}

    // Submit handler
    form.onsubmit = function(e){
      e.preventDefault();
      var payload = {};
      if (nameI && nameI.value.trim()!=='' ) payload.name = nameI.value.trim();

      // Collect supplementary fields
      var inputs = form.querySelectorAll('input[name^="supp["]');
      if (inputs && inputs.length){
        var suppObj = {};
        inputs.forEach(function(inp){ var m = inp.name.match(/^supp\[(.+)\]$/); if(m){ suppObj[m[1]] = inp.value; } });
        payload.supplementary_data = suppObj;
      }

      // Send update
      var passId = pass.id || (pass.pass && pass.pass.id);
      if(!passId){ console.warn('[passes] missing pass id'); return; }

      // Note: We only update provided fields; do NOT send checked_in=false here (see earlier constraint)
      Eventive.request({ method:'POST', path:'passes/' + encodeURIComponent(passId), body: payload, authenticatePerson:true })
        .then(function(){ closeModal(modal); })
        .catch(function(err){ console.error('Failed to update pass:', err); alert('Failed to update pass.'); });
    };

    // Close binding
    if (closeBtn && !closeBtn.__bound){ closeBtn.__bound = true; closeBtn.addEventListener('click', function(){ closeModal(modal); }); }

    bindOverlayToClose(modal);
    bindEscToClose(modal);
    openModal(modal);
  }

  function openBarcodeModal(cfg, pass){
    var modal = document.getElementById(cfg.barcode_modal);
    var img   = document.getElementById(cfg.barcode_img);
    var meta  = document.getElementById(cfg.barcode_meta);
    var legend= document.getElementById(cfg.barcode_legend);
    var close = document.getElementById(cfg.barcode_close);

    if(!modal||!img) return;

    var label = pickFirst(pass.name, pass.pass_name, 'Pass');
    var codePath = pickFirst(pass.qr_code_path, pass.barcode_path, (pass.barcode && pass.barcode.path));
    var imgUrl = ensureAbsolute(codePath);

    img.src = imgUrl || '';
    img.alt = label + ' QR Code';

    if (meta) meta.textContent = label;
    if (legend) legend.textContent = 'Present this code at entry. Tip: increase screen brightness for easier scanning.';

    if (close && !close.__bound){ close.__bound = true; close.addEventListener('click', function(){ closeModal(modal); }); }

    bindOverlayToClose(modal);
    bindEscToClose(modal);
    openModal(modal);
  }

  function renderPassesInto(cfg, passes){
    var list = document.getElementById(cfg.list);
    if(!list) return;

    if (!passes || !passes.length){
      list.innerHTML = '<h2>My Passes</h2><p>No passes found for this account.</p>';
      return;
    }

    var html = '<h2>My Passes</h2>' + passes.map(function(p, i){ return renderPassCard(p, i); }).join('');
    list.innerHTML = html;

    // Bind actions
    list.querySelectorAll('.eventive-pass-card .evt-btn').forEach(function(btn){
      var holder = btn.closest('.eventive-pass-card');
      var idx = holder ? parseInt(holder.getAttribute('data-pass-idx'), 10) : -1;
      if (idx < 0) return;
      btn.addEventListener('click', function(){
        var act = btn.getAttribute('data-act');
        var pass = passes[idx];
        if (act === 'barcode') return openBarcodeModal(cfg, pass);
        if (act === 'edit') return openEditModal(cfg, pass, idx);
      });
    });
  }

  function initOne(cfg){
    if(!cfg) return;
    var wrap  = document.getElementById(cfg.wrap);
    var login = document.getElementById(cfg.login);
    var list  = document.getElementById(cfg.list);
    if(!wrap || wrap.__inited) return; wrap.__inited = true;

    // Fallback notice if Eventive never arrives (standalone only)
    var fallback = setTimeout(function(){
      if(!window.Eventive || !Eventive.on){
        if (!inParentAccountContainer(wrap)) {
          showMessage(list, 'Eventive is not available. Please check your connection and try again.');
          hide(login);
          show(list);
        }
      }
    }, 2500);

    function boot(){
      if (!window.Eventive || !Eventive.on) return; // fallback timer will show message if standalone
      Eventive.on('ready', function(){
        clearTimeout(fallback);
        try {
          if (Eventive.isLoggedIn()) {
            hide(login);
            show(list);
            fetchPasses(cfg.bucket).then(function(passes){ renderPassesInto(cfg, passes); })
              .catch(function(err){ console.error('Failed to fetch passes:', err); showMessage(list, 'Could not load your passes.'); });
          } else {
            // Logged out
            if (!inParentAccountContainer(wrap)) {
              showMessage(list, 'You are not logged in. Please log in to view your passes.');
              hide(login);
              show(list);
            } else {
              hide(list); // parent [eventive-account] will show its own login UI
            }
          }
        } catch (e) {
          console.error('[passes] ready error', e);
          showMessage(list, 'There was a problem loading your passes.');
          hide(login);
          show(list);
        }
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
    else boot();
  }

  function initAll(){
    var cfgs = (window.__EVT_ACCOUNT_PASSES||[]);
    if (!cfgs.length) return;
    cfgs.forEach(initOne);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once:true });
  else initAll();

  if (window.jQuery && window.elementorFrontend) {
    jQuery(window).on('elementor/frontend/init', function(){
      try {
        elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(){ initAll(); });
      } catch (_) {}
    });
  }
})();
