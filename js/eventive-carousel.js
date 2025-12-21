/**
 * Eventive Carousel Script (Elementor-safe, multi-instance)
 * --------------------------------------------------------
 * - Scans for `.event-carousel-container[data-bucket]` and initializes each instance.
 * - Reads config from data-attributes (bucket, limit, description) set by the shortcode.
 * - Waits for Eventive loader via ready/on/poll fallback.
 * - Fetches upcoming events per bucket and renders a simple slider with arrows and dots.
 * - Rebuilds Eventive ticket buttons scoped to the container.
 * - Supports Elementor live preview re-renders.
 */
(function(){
  var __DBG = false; // set true for verbose console logs during troubleshooting
  var PREFERS_REDUCED = (function(){ try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(_) { return false; } })();
  var HAS_IO = (function(){ return 'IntersectionObserver' in window; })();
  function makePausableInterval(fn, ms){
    var id = null, running = false;
    function start(){ if(!running){ id = setInterval(fn, ms); running = true; } }
    function stop(){ if(running){ clearInterval(id); id = null; running = false; } }
    return { start:start, stop:stop, isRunning:function(){ return running; } };
  }
  // ---------- Utilities ----------
  function bySel(root, sel){ return root.querySelector(sel); }
  function bySelAll(root, sel){ return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  function clamp(n, min, max){ n=Number(n)||0; return Math.max(min, Math.min(max, n)); }
  function isTruthy(v){ if(v===true) return true; var s=(v==null?'':String(v)).toLowerCase(); return s==='1'||s==='true'||s==='yes'; }
  function onEventiveReady(cb){
    if (window.Eventive && typeof Eventive.ready === 'function') { try{ Eventive.ready(cb); return; }catch(_){} }
    if (window.Eventive && typeof Eventive.on === 'function') { try{ Eventive.on('ready', cb); return; }catch(_){} }
    // Poll as a last resort (Elementor editor can load scripts out of order)
    var tries=0; (function poll(){ if (window.Eventive && typeof Eventive.request==='function'){ cb(); return; } if(++tries>120){ cb(); return; } setTimeout(poll, 50); })();
  }

  function getCoverImage(ev){
    // Prefer event cover, then first film still/cover/poster
    var img = (ev.images && (ev.images.cover_image || ev.images.cover)) ||
              (ev.cover_image) ||
              (ev.films && ev.films[0] && (ev.films[0].still_image || ev.films[0].cover_image || ev.films[0].poster_image));
    return img || 'default-placeholder.jpg';
  }

  function renderCarousel(container, events){
    if(__DBG) console.log('[carousel] render', events && events.length);
    // Avoid double-init
    if (container.__evtCarouselInited) return; container.__evtCarouselInited = true;

    var limit = clamp(container.getAttribute('data-limit') || 10, 1, 50);
    var items = (events||[]).slice(0, limit);

    if (!items.length){ container.innerHTML = '<p class="error-message">No upcoming events found.</p>'; return; }

    // Build markup
    var html = [
      '<div class="carousel-slider">',
      '  <button class="carousel-arrow left" aria-label="Previous">&#8249;</button>',
      '  <button class="carousel-arrow right" aria-label="Next">&#8250;</button>'
    ];

    items.forEach(function(event){
      var name = event.name || 'Untitled Event';
      var dt   = event.start_time ? new Date(event.start_time) : null;
      var time = dt ? dt.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }).toLowerCase() : 'Time not available';
      var date = dt ? dt.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }) : 'Date not available';
      var venue= (event.venue && event.venue.name) ? (' at '+event.venue.name) : '';
      var img  = getCoverImage(event);
      var showBtn = !event.hide_tickets_button;
      var btnHtml = showBtn ? ('<div class="eventive-button" data-event="'+String(event.id)+'"></div>') : '';

      html.push(
        '  <div class="carousel-slide" style="background-image:url(\''+ img.replace(/'/g, "&#39;") +'\')">',
        '    <div class="carousel-banner">',
        '      <h3 class="carousel-title">'+ escapeHtml(name) +'</h3>',
        '      <p class="carousel-time">'+ escapeHtml(date +' • '+ time + venue) +'</p>',
        '      <div class="carousel-ticket-button">'+ btnHtml +'</div>',
        '    </div>',
        '  </div>'
      );
    });

    html.push('  <div class="carousel-dots" aria-hidden="true"></div>');
    html.push('</div>');
    container.innerHTML = html.join('');

    initializeCarousel(container); // scoped init

    // Rebuild Eventive widgets scoped to this container
    setTimeout(function(){
      try{
        if (window.Eventive && typeof Eventive.rebuild === 'function') { Eventive.rebuild(container); }
        else if (window.Eventive && Eventive.widgets && typeof Eventive.widgets.build === 'function') { Eventive.widgets.build(container); }
      }catch(e){ console.warn('Eventive rebuild failed:', e); }
    }, 200);
  }

  function escapeHtml(s){ return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function initializeCarousel(container){
    var slider = bySel(container, '.carousel-slider');
    if (!slider) { console.error('Carousel slider not found (scoped).'); return; }
    var slides = bySelAll(slider, '.carousel-slide'); if (!slides.length){ console.error('No slides.'); return; }

    var prev = bySel(slider, '.carousel-arrow.left');
    var next = bySel(slider, '.carousel-arrow.right');
    var dotsWrap = bySel(slider, '.carousel-dots') || (function(){ var d=document.createElement('div'); d.className='carousel-dots'; slider.appendChild(d); return d; })();
    var dots = [];
    var current = 0;

    // Build dots
    slides.forEach(function(_, idx){
      var dot = document.createElement('button');
      dot.className = 'carousel-dot' + (idx===0?' active':'');
      dot.type = 'button'; dot.setAttribute('aria-label', 'Go to slide '+(idx+1));
      dot.addEventListener('click', function(){ go(idx); });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function update(){
      slides.forEach(function(slide, i){ slide.style.transform = 'translateX(' + (100 * (i - current)) + '%)'; });
      dots.forEach(function(d){ d.classList.remove('active'); });
      if (dots[current]) dots[current].classList.add('active');
    }
    function go(i){ current = (i+slides.length)%slides.length; update(); }
    function nextSlide(){ go(current+1); }
    function prevSlide(){ go(current-1); }

    if (next) next.addEventListener('click', nextSlide);
    if (prev) prev.addEventListener('click', prevSlide);

    // Auto-slide (reduced motion aware) with pause on hover and tab visibility
    var autoplay = makePausableInterval(nextSlide, 5000);
    if (!PREFERS_REDUCED) autoplay.start();
    slider.addEventListener('mouseenter', function(){ autoplay.stop(); });
    slider.addEventListener('mouseleave', function(){ if (!PREFERS_REDUCED) autoplay.start(); });

    // Pause when tab is hidden, resume when visible
    function onVis(){ if (document.hidden) autoplay.stop(); else if (!PREFERS_REDUCED) autoplay.start(); }
    document.addEventListener('visibilitychange', onVis);

    // Basic touch swipe support
    var touchStartX = 0, touchDeltaX = 0, touchActive = false;
    slider.addEventListener('touchstart', function(e){
      if(!e.touches || !e.touches.length) return; touchActive = true; touchStartX = e.touches[0].clientX; touchDeltaX = 0; autoplay.stop();
    }, {passive:true});
    slider.addEventListener('touchmove', function(e){ if(!touchActive || !e.touches || !e.touches.length) return; touchDeltaX = e.touches[0].clientX - touchStartX; }, {passive:true});
    slider.addEventListener('touchend', function(){
      if (!touchActive) return; touchActive = false;
      if (Math.abs(touchDeltaX) > 40) { if (touchDeltaX < 0) nextSlide(); else prevSlide(); }
      if (!PREFERS_REDUCED) autoplay.start();
    });

    // Initial state
    update();
  }

  function fetchAndRender(container){
    return new Promise(function(resolve){
      var bucket = container.getAttribute('data-bucket');
      var limit  = clamp(container.getAttribute('data-limit') || 10, 1, 50);
      if (!bucket){ container.innerHTML = '<p class="error-message">Missing Eventive bucket.</p>'; return resolve(false); }

      onEventiveReady(function(){
        try {
          Eventive.request({
            method: 'GET',
            path: 'event_buckets/' + encodeURIComponent(bucket) + '/events',
            qs: { upcoming_only: true }
          })
          .then(function(resp){
            var events = (resp && resp.events) ? resp.events : [];
            if (!events.length) {
              container.innerHTML = '<p class="error-message">No upcoming events found.</p>';
              return resolve(false);
            }
            renderCarousel(container, events);
            resolve(true);
          })
          .catch(function(err){
            console.error('Eventive events fetch failed:', err);
            container.innerHTML = '<p class="error-message">Error fetching events.</p>';
            resolve(false);
          });
        } catch(e){
          console.error('Eventive not ready:', e);
          container.innerHTML = '<p class="error-message">Eventive API unavailable.</p>';
          resolve(false);
        }
      });
    });
  }

  function initOne(container){
    if (!container || container.__evtCarouselInited || container.__evtObserved) return;

    if (HAS_IO) {
      try {
        var io = new IntersectionObserver(function(entries){
          entries.forEach(function(entry){
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              io.disconnect();
              container.__evtObserved = false;
              fetchAndRender(container);
            }
          });
        }, { root: null, rootMargin: '120px 0px', threshold: 0.01 });
        io.observe(container);
        container.__evtObserved = true;
        return; // defer init until visible
      } catch(_) { /* fall through */ }
    }

    // Fallback: initialize immediately
    fetchAndRender(container);
  }

  function boot(scope){
    if(__DBG) console.log('[carousel] boot scope', scope);
    var root = scope && scope.nodeType ? scope : document;
    bySelAll(root, '.event-carousel-container[data-bucket]').forEach(initOne);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){
    boot();
    if(__DBG) console.log('[carousel] boot DOM');
  }, { once:true }); else {
    boot();
    if(__DBG) console.log('[carousel] boot DOM');
  }

  // Elementor live preview support
  if (window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try {
        elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(scope){
          if(scope && scope[0]){
            // Re-scan only within this widget scope
            boot(scope[0]);
          }
        });
      } catch(_){ }
    });
  }
})();