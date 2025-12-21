

(function(){
  // Initialize a single account container
  function initContainer(wrap){
    if (!wrap || wrap.__evtInited) return; // idempotent guard
    wrap.__evtInited = true;

    // Prefer the unique IDs emitted by the shortcode refactor; fall back to class queries if needed
    var content   = wrap.querySelector('[id$="_content"], #eventive-account-content, .eventive-account-content');
    var loginReq  = wrap.querySelector('[id$="_login_required"], #eventive-login-required-message, .eventive-login-required');
    var actions   = wrap.querySelector('.account-actions');
    var logoutLnk = wrap.querySelector('[id$="_logout_link"], #eventive-logout-link, .eventive-logout-link');

    function show(el){ if (el) el.style.display = 'block'; }
    function hide(el){ if (el) el.style.display = 'none'; }

    function showContent(){ show(content); show(actions); bindLogout(); }
    function showLogin(){ show(loginReq); }

    function bindLogout(){
      if (!logoutLnk || logoutLnk.__evtBound) return;
      logoutLnk.__evtBound = true;
      logoutLnk.addEventListener('click', function(e){
        e.preventDefault();
        // Use global handler when available
        if (typeof window.handleLogout === 'function') {
          try { window.handleLogout(); return; } catch (err) { console.error('handleLogout error:', err); }
        }
        // Fallback logout flow
        try {
          try { localStorage.clear(); } catch(_){}
          try { sessionStorage.clear(); } catch(_){}
          document.cookie = 'eventive-personState=; path=/; max-age=0';
          if (window.Eventive && Eventive.logout) {
            Eventive.logout().then(function(){ location.reload(); }).catch(function(err){ console.error('Eventive.logout() failed:', err); location.reload(); });
          } else {
            location.reload();
          }
        } catch (err) {
          console.error('Unexpected logout error:', err);
          location.reload();
        }
      });
    }

    function run(){
      try {
        if (Eventive && typeof Eventive.isLoggedIn === 'function' && Eventive.isLoggedIn()) {
          showContent();
        } else {
          showLogin();
        }
      } catch (e) {
        console.error('[eventive-account] ready error', e);
        showLogin();
      }
    }

    if (!window.Eventive || !Eventive.on) {
      // If loader not present yet, just show login prompt as a safe default
      showLogin();
      return;
    }

    if (Eventive._ready || Eventive.ready) run();
    else Eventive.on('ready', run);
  }

  // Initialize all instances on the page
  function initAll(root){
    (root || document).querySelectorAll('.eventive-account-container').forEach(initContainer);
  }

  // DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ initAll(document); }, { once: true });
  else initAll(document);

  // Elementor live preview re-renders
  if (window.jQuery && window.elementorFrontend) {
    jQuery(window).on('elementor/frontend/init', function(){
      try {
        elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(scope){
          if (scope && scope[0]) initAll(scope[0]); else initAll(document);
        });
      } catch (e) {}
    });
  }
})();