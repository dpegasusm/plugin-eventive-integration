(function(){
  // ============================
  // Eventive Login (Elementor‑safe)
  // Consumes window.__EVT_LOGIN_INSTANCES injected by PHP shortcode
  // ============================

  // Helpers
  function $(id){ return document.getElementById(id); }
  function show(el){
    if(!el) return;
    el.classList.remove('hidden');
    try{ el.setAttribute('aria-hidden','false'); }catch(_){}
  }
  function hide(el){
    if(!el) return;
    el.classList.add('hidden');
    try{ el.setAttribute('aria-hidden','true'); }catch(_){}
  }
  function rmInitialHide(container){ if(container) container.classList.remove('eventive-initial-hide'); }

  function bindEscToClose(modal, onClose){
    if(!modal || modal.__escBound) return;
    modal.__escHandler = function(ev){ if(ev.key === 'Escape'){ onClose(); } };
    document.addEventListener('keydown', modal.__escHandler);
    modal.__escBound = true;
  }
  function unbindEsc(modal){
    if(modal && modal.__escBound && modal.__escHandler){
      document.removeEventListener('keydown', modal.__escHandler);
      modal.__escBound = false; modal.__escHandler = null;
    }
  }

  function openModal(modal){ if(!modal) return; modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeModal(modal){ if(!modal) return; modal.classList.add('hidden'); document.body.style.overflow = ''; unbindEsc(modal); }

  function dbg(msg){ try{ if(window.localStorage && localStorage.getItem('EVT_LOGIN_DEBUG')==='1'){ console.log('[eventive-login]', msg); } }catch(_){}}  
  function findCfgByTriggerId(id){
    var list = (window.__EVT_LOGIN_INSTANCES||[]);
    for(var i=0;i<list.length;i++){ if(list[i] && list[i].trigger === id) return list[i]; }
    return null;
  }

  function setMessage(el, html){ if(!el) return; el.innerHTML = html; }

  // Safari/ITP: request first-party storage access so Eventive cookies are usable cross-site
  async function requestStorageAccessIfNeeded(){
    try{
      if (!document.requestStorageAccess) return; // non-Safari
      const has = (typeof document.hasStorageAccess === 'function') ? await document.hasStorageAccess() : false;
      if (!has) { try { await document.requestStorageAccess(); } catch(_){} }
    }catch(_){ }
  }

  // Attempt to read any persisted Eventive person token from localStorage
  function getStoredEventiveToken(){
    try{
      var keys = ['eventivePersonToken','eventiveAppPersonToken','eventive_token','eventive_person_token'];
      for(var i=0;i<keys.length;i++){
        var v = localStorage.getItem(keys[i]);
        if (v && typeof v === 'string' && v.trim()) return v.trim();
      }
    }catch(_){ }
    return null;
  }

  // Version‑safe wrapper to hydrate login state with a token
  function loginWithEventiveTokenCompat(token){
    var EVT = (typeof getEVT === 'function') ? getEVT() : (window.__eventiveGetEVT && window.__eventiveGetEVT());
    try {
      if (EVT && typeof EVT.loginWithToken === 'function') {
        var p = EVT.loginWithToken({ eventiveToken: token });
        if (p && typeof p.then === 'function') return p.catch(function(){ return EVT.loginWithToken(token); });
        return EVT.loginWithToken(token);
      }
    } catch(_){}
    return Promise.reject(new Error('Eventive.loginWithToken is unavailable.'));
  }

  // Safely get the Eventive object (works in Elementor if the loader is on parent/top)
  function getEVT(){
    try {
      if (window.Eventive) return window.Eventive;
      if (window.parent && window.parent !== window && window.parent.Eventive) return window.parent.Eventive;
      if (window.top && window.top !== window && window.top.Eventive) return window.top.Eventive;
    } catch(_) {}
    return null;
  }

  // Expose cross-frame getter globally for other scripts/IIFEs
  try {
    if (typeof window.getEVT !== 'function') { window.getEVT = getEVT; }
    if (typeof window.__eventiveGetEVT !== 'function') { window.__eventiveGetEVT = getEVT; }
  } catch(_){}

  // Consider Eventive "ready" when request API is present or isLoggedIn is callable
  function isEVTReady(EVT){
    try { return !!(EVT && (EVT.request || (EVT.isLoggedIn && typeof EVT.isLoggedIn === 'function'))); }
    catch(_){ return false; }
  }

  function renderLoggedOutUI(cfg){
    var c = $(cfg.container), msg = $(cfg.message), trig = $(cfg.trigger), welcome = $(cfg.welcome), logout = $(cfg.logout);
    if(!c) return;
    show(trig); hide(welcome); hide(logout);
    try{
      trig.setAttribute('aria-hidden','false');
      welcome.setAttribute('aria-hidden','true');
      logout.setAttribute('aria-hidden','true');
    }catch(_){}

    // If a custom login link text was provided by PHP, prefer that for the trigger's label
    try {
      if (trig && cfg && typeof cfg.loginLinkText === 'string' && cfg.loginLinkText.trim()) {
        trig.textContent = cfg.loginLinkText;
      }
    } catch(_){}

    // Keep any existing message HTML intact (e.g., explanatory copy or links)
    setMessage(msg, msg.innerHTML);
  }

function renderLoggedInUI(cfg, person){
  var c = $(cfg.container), msg = $(cfg.message), trig = $(cfg.trigger), welcome = $(cfg.welcome), logout = $(cfg.logout);
  if(!c) return;
  hide(trig); show(welcome); show(logout);
  try{
    trig.setAttribute('aria-hidden','true');
    welcome.setAttribute('aria-hidden','false');
    logout.setAttribute('aria-hidden','false');
  }catch(_){}

  var name = 'there';

  // Prefer first_name if present on the person object we were given
  if (person) {
    name = person.first_name
        || person.name
        || person.full_name
        || person.email
        || name;
  }

  // If we still don't have a meaningful name, try Eventive.getPersonDetails()
  if (!person || (!person.first_name && !person.name && !person.full_name)) {
    try {
      var EVT = getEVT();
      if (EVT && typeof EVT.getPersonDetails === 'function') {
        var details = EVT.getPersonDetails();
        if (details) {
          name = details.first_name
              || details.name
              || details.full_name
              || details.email
              || name;
        }
      }
    } catch(_){}
  }

  // Final fallback if name is still empty-ish
  if (!name || !String(name).trim()) {
    name = 'Friend';
  }

  welcome.textContent = 'Welcome, ' + name + '!';
}

  async function performLogin(cfg){
    var emailEl = $(cfg.email), passEl = $(cfg.password), errEl = $(cfg.error), modal = $(cfg.modal), loginBtn = $(cfg.loginBtn);
    if(!emailEl || !passEl) return;
    var email = (emailEl.value || '').trim();
    var password = (passEl.value || '').trim();
    if(!email || !password){ if(errEl){ errEl.textContent = 'Please enter your email and password.'; errEl.classList.remove('hidden'); } return; }

    var EVT = getEVT();

    if(loginBtn){ loginBtn.disabled = true; loginBtn.textContent = 'Logging in…'; }
    if(errEl){ errEl.classList.add('hidden'); errEl.textContent = ''; }

    // Determine effective event bucket
    var effectiveBucket = cfg.bucket;
    try {
      if ((!effectiveBucket || effectiveBucket === '') && EVT) {
        effectiveBucket = (EVT && (EVT.event_bucket || (EVT.config && EVT.config.event_bucket))) || '';
      }
    } catch(_) {}

    var body = { email: email, password: password };
    if (effectiveBucket) body.event_bucket = effectiveBucket;

    if (!effectiveBucket) {
      if(errEl){ errEl.textContent = 'Missing event bucket. Please set a default in settings or on this page.'; errEl.classList.remove('hidden'); }
      if(loginBtn){ loginBtn.disabled = false; loginBtn.textContent = 'LOGIN'; }
      return;
    }

    dbg({ action:'login_attempt', bucket: effectiveBucket, email: email });

    // Safari: explicitly request storage access before making auth requests
    await requestStorageAccessIfNeeded();

    async function httpLoginViaFetch(){
      const res = await fetch('https://api.eventive.org/people/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8' }, body: JSON.stringify(body)
      });
      if(!res.ok){
        const txt = await res.text();
        var e = new Error('Login failed. ('+ res.status +') ' + (txt||'').slice(0,200));
        e.status = res.status; e.body = (txt||'').slice(0,200); throw e;
      }
      return res.json();
    }

    async function httpLoginViaEventiveRequest(){
      var EVT = getEVT(); if(!EVT || !EVT.request){ throw new Error('Eventive.request unavailable'); }
      var json = await EVT.request({ method:'POST', path:'people/login', body: body, authenticatePerson:false });
      return json;
    }

    try{
      let json;
      try { json = await httpLoginViaFetch(); }
      catch(fetchErr){ dbg({ action:'login_fetch_error', err: String(fetchErr && fetchErr.message || fetchErr) }); json = await httpLoginViaEventiveRequest(); }

      var token = (json && (json.token || json.person_token));
      if(!token) throw new Error('No token in response');

      await loginWithEventiveTokenCompat(token);
      try{ localStorage.setItem('evt_last_bucket', String(effectiveBucket||'')); }catch(_){}

      // No hard reload: hydrate UI inline for Safari/ITP compatibility
      try{
        var personRes = await EVT.request({ method:'GET', path:'people/self', authenticatePerson:true });
        var person = personRes && (personRes.person || personRes);
        renderLoggedInUI(cfg, person);
      }catch(_){ renderLoggedInUI(cfg, { name:'Friend', id:true }); }

      closeModal(modal);
      // Force a page reload so other shortcodes pick up authenticated state
      try { await requestStorageAccessIfNeeded(); } catch(_) {}
      setTimeout(function(){
        try { window.location.reload(); }
        catch(_) { window.location.href = window.location.href; }
      }, 120);

    }catch(err){
      var msg = 'Login failed.';
      if (err && err.status) msg += ' ('+ err.status +')';
      if (err && (err.message)) msg += ' ' + err.message;
      dbg({ action:'login_error', error: err });
      if(errEl){ errEl.textContent = msg; errEl.classList.remove('hidden'); }
    } finally {
      if(loginBtn){ loginBtn.disabled = false; loginBtn.textContent = 'LOGIN'; }
    }
  }

  function attachHandlers(cfg){
    var container = $(cfg.container);
    var trig = $(cfg.trigger), modal = $(cfg.modal), cancel = $(cfg.cancelBtn), loginBtn = $(cfg.loginBtn);
    var logout = $(cfg.logout), errEl = $(cfg.error);

    // Bind the inline close (×) button inside the modal
    if (modal && !modal.__closeBtnBound) {
      modal.__closeBtnBound = true;
      modal.addEventListener('click', function(ev){
        var el = ev.target;
        if (el && el.classList && el.classList.contains('eventive-modal-close')) {
          ev.preventDefault();
          closeModal(modal);
        }
      });
    }

    if(trig && !trig.__bound){
      trig.__bound = true;
      trig.addEventListener('click', async function(e){
        e.preventDefault();
        dbg('trigger click → '+cfg.trigger);
        if(container) rmInitialHide(container);
        await requestStorageAccessIfNeeded();
        var EVT = getEVT(); if (!EVT || !EVT.request) {
          dbg('Eventive not ready; continuing to open modal for credentials input');
        }
        if(modal && modal.classList.contains('hidden')) modal.classList.remove('hidden');
        if(errEl){ errEl.classList.add('hidden'); errEl.textContent=''; }
        openModal(modal); bindEscToClose(modal, function(){ closeModal(modal); });
        if (!getEVT()) {
          if (errEl) { errEl.textContent = 'Eventive is still loading in the editor. Try previewing the page or viewing on the front end.'; errEl.classList.remove('hidden'); }
        }
      });
    }

    if(cancel && !cancel.__bound){
      cancel.__bound = true;
      cancel.addEventListener('click', function(e){ e.preventDefault(); closeModal(modal); });
    }

    if(loginBtn && !loginBtn.__bound){
      loginBtn.__bound = true;
      loginBtn.addEventListener('click', async function(e){ e.preventDefault(); await requestStorageAccessIfNeeded(); performLogin(cfg); });
    }

    // Enhanced logout handler with robust fallbacks and debugging
    if(logout && !logout.__bound){
      logout.__bound = true;
      logout.addEventListener('click', function(e){
        e.preventDefault();
        var EVT = getEVT();
        function clearTokens(){
          try{
            var keys = ['eventivePersonToken','eventiveAppPersonToken','eventive_token','eventive_person_token'];
            keys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(_){ } });
          }catch(_){}
        }
        function logoutViaRequest(){
          if(!EVT || !EVT.request){ return Promise.reject(new Error('Eventive.request unavailable')); }
          return EVT.request({ method:'POST', path:'people/logout', authenticatePerson:true }).catch(function(){});
        }
        try{
          if(EVT && typeof EVT.logout === 'function'){
            var p = EVT.logout();
            if(p && typeof p.then === 'function'){
              p.then(function(){ clearTokens(); renderLoggedOutUI(cfg); }).catch(function(){ clearTokens(); logoutViaRequest().finally(function(){ renderLoggedOutUI(cfg); }); });
              return;
            }
          }
        }catch(_){}
        logoutViaRequest().finally(function(){ clearTokens(); renderLoggedOutUI(cfg); });
      });
    }

    // Close the modal when clicking backdrop (outside the form)
    if (modal && !modal.__backdropBound) {
      modal.__backdropBound = true;
      modal.addEventListener('click', function(ev){
        if (ev.target === modal) { closeModal(modal); }
      });
    }
  }

  function initOne(cfg){
    var container = $(cfg.container);
    var EVT = getEVT();
    if(!container || container.__inited) return; container.__inited = true;

    // If Eventive isn't present, show logged-out UI (link) and unhide to avoid FOUC
    var readyFired = false;

    cfg.__lastAuth = null;

    function onState(person){
      try{
        if(person && person.id){ renderLoggedInUI(cfg, person); }
        else { renderLoggedOutUI(cfg); }
        // Optional: clear aria-busy on message container after UI update
        try{ var msg = $(cfg.message); if(msg){ msg.removeAttribute('aria-busy'); } }catch(_){}
      } finally { rmInitialHide(container); }
    }

    attachHandlers(cfg);
    dbg('initOne '+cfg.uid+' trigger='+cfg.trigger+' modal='+cfg.modal);

    // Safety: remove initial-hide quickly to allow modal visibility on user click
    setTimeout(function(){ rmInitialHide(container); }, 250);

    if(!EVT || !EVT.on){
      renderLoggedOutUI(cfg);
      rmInitialHide(container);
      return;
    }
    // If Eventive is already "ready", sync state immediately (Elementor may mount after ready)
    if (isEVTReady(EVT)) {
      try {
        if (EVT.isLoggedIn && EVT.isLoggedIn()) {
          EVT.request({ method:'GET', path:'people/self', authenticatePerson:true })
            .then(function(res){ onState(res && (res.person || res)); })
            .catch(function(){ onState({ id:true, name:'Friend' }); });
        } else {
          onState(null);
        }
      } catch(_) { onState(null); }
    }

    EVT.on('ready', function(){
      if(readyFired) return; readyFired = true;
      // Elementor/preview race fix: if not logged in but a token exists, hydrate once
      try {
        var preAuthed = !!(EVT.isLoggedIn && EVT.isLoggedIn());
        if (!preAuthed) {
          var tok = getStoredEventiveToken();
          if (tok) {
            loginWithEventiveTokenCompat(tok)
              .then(function(){ return EVT.request({ method:'GET', path:'people/self', authenticatePerson:true }); })
              .then(function(res){ onState(res && (res.person || res)); })
              .catch(function(){ onState(null); });
            return; // defer to hydration result
          }
        }
      } catch(_){ }
      // Initial state pull
      try {
        if (EVT.isLoggedIn && EVT.isLoggedIn()) {
          // When logged in, attempt to fetch person
          EVT.request({ method:'GET', path:'people/self', authenticatePerson:true })
            .then(function(res){ onState(res && (res.person || res)); })
            .catch(function(){ onState({ id:true, name:'Friend' }); });
        } else {
          onState(null);
        }
      } catch(_) { onState(null); }

      // Soft retry once shortly after ready to catch late token revalidations
      setTimeout(function(){
        try {
          if (EVT.isLoggedIn && EVT.isLoggedIn()) {
            EVT.request({ method:'GET', path:'people/self', authenticatePerson:true })
              .then(function(res){ onState(res && (res.person || res)); })
              .catch(function(){});
          }
        } catch(_){ }
      }, 350);

      // Subscribe to auth changes and reload on transitions (version‑safe across loader builds)
      try {
        var last = (typeof cfg.__lastAuth === 'boolean') ? cfg.__lastAuth : null;
        function handleAuth(state){
          var person = state && (state.person || state);
          var isAuthed = !!(person && person.id);
          onState(person);
          if (last === null) { cfg.__lastAuth = isAuthed; last = isAuthed; return; }
          if (last !== isAuthed) {
            cfg.__lastAuth = isAuthed;
            last = isAuthed;
            if (isAuthed) {
              // When authentication flips to true (e.g., popup flow), reload so other shortcodes re-evaluate
              try { requestStorageAccessIfNeeded().then(function(){ setTimeout(function(){ try{ window.location.reload(); }catch(_){ window.location.href = window.location.href; } }, 120); }); } catch(_){ setTimeout(function(){ try{ window.location.reload(); }catch(_){ window.location.href = window.location.href; } }, 120); }
            }
          }
        }
        ['login','logout','person','personState','person_state'].forEach(function(evt){ try { EVT.on(evt, handleAuth); } catch(_){} });
      } catch(_){}

      // Editor-safe bounded retry: if not ready yet, ping a few times
      (function retryWaitEVT(attempt){
        if (attempt > 10) return; // ~5s max if 500ms interval
        var e = getEVT();
        if (isEVTReady(e)) {
          try {
            if (e.isLoggedIn && e.isLoggedIn()) {
              e.request({ method:'GET', path:'people/self', authenticatePerson:true })
                .then(function(res){ onState(res && (res.person || res)); })
                .catch(function(){ onState({ id:true, name:'Friend' }); });
            } else { onState(null); }
          } catch(_){ onState(null); }
          return;
        }
        setTimeout(function(){ retryWaitEVT(attempt+1); }, 500);
      })(0);
    });
  }

  function initAll(){
    var list = (window.__EVT_LOGIN_INSTANCES || []);
    if(!list.length) return;
    list.forEach(initOne);
  }

  // Delegated logout handler for anchors with ids like "eventive-logout-link-XXXX"
  if(!window.__EVT_LOGOUT_DELEGATE_BOUND){
    window.__EVT_LOGOUT_DELEGATE_BOUND = true;
    document.addEventListener('click', function(ev){
      var el = ev.target;
      if (el && el.closest) el = el.closest('a[id^="eventive-logout-link-"]');
      if(!el) return;
      // Respect aria-hidden/visibility
      if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return;
      ev.preventDefault();
      var EVT = (typeof getEVT === 'function') ? getEVT() : (window.__eventiveGetEVT && window.__eventiveGetEVT());
      function hardReload(){ try{ window.location.reload(); }catch(_){} }
      function clearTokens(){
        try{
          var keys = ['eventivePersonToken','eventiveAppPersonToken','eventive_token','eventive_person_token'];
          keys.forEach(function(k){ try{ localStorage.removeItem(k); }catch(_){ } });
        }catch(_){}
      }
      function logoutViaRequest(){
        if(!EVT || !EVT.request){ return Promise.reject(new Error('Eventive.request unavailable')); }
        return EVT.request({ method:'POST', path:'people/logout', authenticatePerson:true }).catch(function(){});
      }
      try{
        if(EVT && typeof EVT.logout === 'function'){
          var p = EVT.logout();
          if(p && typeof p.then === 'function'){
            p.then(function(){ clearTokens(); hardReload(); }).catch(function(){ clearTokens(); logoutViaRequest().finally(hardReload); });
            return;
          }
        }
      }catch(_){}
      logoutViaRequest().finally(function(){ clearTokens(); hardReload(); });
    }, true);
  }

  // Global delegated click fallback (Elementor-safe)
  if(!window.__EVT_LOGIN_DELEGATED_BOUND){
    window.__EVT_LOGIN_DELEGATED_BOUND = true;
    document.addEventListener('click', function(e){
      var t = e.target;
      if(!t) return;
      // bubble up to an anchor/button with an id
      var clickable = t.closest && t.closest('a[id],button[id]');
      if(!clickable) return;
      var id = clickable.id;
      if(!id) return;
      var cfg = findCfgByTriggerId(id);
      if(!cfg) return;
      e.preventDefault();
      var modal = document.getElementById(cfg.modal);
      var container = document.getElementById(cfg.container);
      if(container) rmInitialHide(container);
      if(modal){ modal.classList.remove('hidden'); openModal(modal); bindEscToClose(modal, function(){ closeModal(modal); }); dbg('delegated open modal for '+id); }
    }, true);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll, { once:true });
  else initAll();

  if(window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try { elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(){ initAll(); }); } catch(_) {}
    });
  }
})();

(function(){
  // Eventive native login/logout bridge — no hard reload; nudges instances to refresh UI
  function init(){
    var EVT = (typeof getEVT === 'function') ? getEVT() : (window.__eventiveGetEVT && window.__eventiveGetEVT());
    if(!EVT || !EVT.on) return;
    EVT.on('ready', function(){
      try {
        var authed = !!(EVT.isLoggedIn && EVT.isLoggedIn());
        var list = (window.__EVT_LOGIN_INSTANCES || []);
        list.forEach(function(cfg){ try {
          if (authed) {
            EVT.request({ method:'GET', path:'people/self', authenticatePerson:true })
              .then(function(res){ var p = res && (res.person || res); var el = document.getElementById(cfg.container); if(el){ el.classList.remove('eventive-initial-hide'); } renderLoggedInUI(cfg, p); })
              .catch(function(){ var el = document.getElementById(cfg.container); if(el){ el.classList.remove('eventive-initial-hide'); } renderLoggedOutUI(cfg); });
          } else {
            var el = document.getElementById(cfg.container); if(el){ el.classList.remove('eventive-initial-hide'); }
            renderLoggedOutUI(cfg);
          }
        } catch(_){ } });
      } catch(_){ }
    });
    ['login','logout','person','personState','person_state'].forEach(function(name){
      try{ EVT.on(name, function(){
        var list = (window.__EVT_LOGIN_INSTANCES || []);
        list.forEach(function(cfg){ try { var el = document.getElementById(cfg.container); if(el){ el.classList.remove('eventive-initial-hide'); } } catch(_){ } });
      }); }catch(_){ }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();