(function(){
  // ---------- Utilities ----------
  var rAF = window.requestAnimationFrame || function(cb){ return setTimeout(cb,16); };
  function lower(s){ return (s==null?'':String(s)).toLowerCase(); }

  function initWrapperDecor(wrapper){
    var overlay = wrapper.querySelector('.eventive-marquee-overlay');
    var url = wrapper.getAttribute('data-overlay-url') || '';
    var op = parseFloat(wrapper.getAttribute('data-overlay-opacity') || '0.22');
    if (overlay) {
      overlay.style.backgroundImage = url ? 'url('+url+')' : '';
      overlay.style.opacity = isNaN(op) ? '0.22' : String(Math.max(0, Math.min(1, op)));
    }
    var captionText = (wrapper.getAttribute('data-caption') || '').trim();
    var track = wrapper.querySelector('.eventive-marquee-caption-track');
    if (track) {
      if (captionText) {
        var segment = ' • ' + captionText + ' ';
        var repeated = captionText;
        while (repeated.length < 200) repeated += segment;
        track.textContent = repeated;
      } else {
        track.textContent = '';
      }
    }
  }

  function pickFirstUrl(candidates){
    if (!Array.isArray(candidates)) return '';
    for (var i=0;i<candidates.length;i++){
      var c=candidates[i]; if(!c) continue;
      if (typeof c==='string' && c.trim()) return c.trim();
      if (typeof c==='object' && typeof c.url==='string' && c.url.trim()) return c.url.trim();
    }
    return '';
  }

  function safe(obj, chain){ try { return chain.reduce(function(o,k){ return (o && (o[k] !== undefined)) ? o[k] : undefined; }, obj);} catch(e){ return undefined; } }

  function getImageUrlForFilm(film, useStills){
    var stillCandidates = [
      safe(film, ['images','still_image']), safe(film, ['images','still']), safe(film, ['images','stillImage']),
      safe(film, ['images','still_url']), safe(film, ['images','still','url']), safe(film, ['images','still_image','url']),
      safe(film, ['still_image']), safe(film, ['still_url'])
    ];
    var posterCandidates = [
      safe(film, ['poster_image']), safe(film, ['images','poster_image']), safe(film, ['images','poster']),
      safe(film, ['images','poster','url']), safe(film, ['poster','url'])
    ];
    var chosen = '';
    if (useStills) chosen = pickFirstUrl(stillCandidates);
    if (!chosen) chosen = pickFirstUrl(posterCandidates);
    return chosen || '';
  }

  function getFilmTagNames(film){
    var names = [];
    if (Array.isArray(film.tags)) film.tags.forEach(function(t){ var n=(t&&(t.name||t.title||t.label))?String(t.name||t.title||t.label).toLowerCase():''; if(n) names.push(n); });
    if (Array.isArray(film.tag_names)) film.tag_names.forEach(function(s){ var n=s?String(s).toLowerCase():''; if(n) names.push(n); });
    if (Array.isArray(film.categories)) film.categories.forEach(function(s){ var n=s?String(s).toLowerCase():''; if(n) names.push(n); });
    if (film.category) names.push(String(film.category).toLowerCase());
    return Array.from(new Set(names));
  }
  function filmHasAnyTag(film, list){ if(!list||!list.length) return false; var t=getFilmTagNames(film); return list.some(function(x){ return t.indexOf(x) > -1; }); }
  function parseTagList(str){ if(!str) return []; return String(str).split(',').map(function(s){ return s.trim().toLowerCase().replace(/\s+/g,' '); }).filter(Boolean); }
  function filterByIncludeExclude(items, includeStr, excludeStr){
    var inc = parseTagList(includeStr), exc = parseTagList(excludeStr);
    return (items||[]).filter(function(item){ var passInc = inc.length ? filmHasAnyTag(item, inc) : true; var passExc = exc.length ? !filmHasAnyTag(item, exc) : true; return passInc && passExc; });
  }

  function createPosterSlide(filmName, imageUrl, filmId, filmSyncEnabled, prettyPermalinks, detailBaseURL){
    if (!imageUrl) {
      var placeholder = document.createElement('a'); placeholder.href='#'; placeholder.className='poster-slide placeholder'; placeholder.setAttribute('aria-hidden','true'); return placeholder;
    }
    var filmNameSlug = String(filmName||'').toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').trim();
    var linkHref;
    if (filmSyncEnabled) linkHref = detailBaseURL.replace(/\/$/,'') + '/' + filmNameSlug;
    else linkHref = prettyPermalinks ? (detailBaseURL+'?film-id='+encodeURIComponent(filmId)) : (detailBaseURL+'&film-id='+encodeURIComponent(filmId));

    var slide = document.createElement('div'); slide.className='poster-slide'; slide.style.backgroundImage = "url('"+imageUrl+"')";
    var a = document.createElement('a'); a.href = linkHref; a.target = '_self'; a.appendChild(slide);
    a.addEventListener('click', function(e){ e.stopPropagation(); });
    return a;
  }

  function duplicateContentForLoop(container){
    var slides = Array.from(container.children);
    slides.forEach(function(s){ container.appendChild(s.cloneNode(true)); });
  }

  function initOneWrapper(wrapper){
    if (wrapper.__evtMarqueeInited) return; wrapper.__evtMarqueeInited = true;
    initWrapperDecor(wrapper);

    var filmSyncEnabled = (wrapper.getAttribute('data-film-sync-enabled') === 'true');
    var prettyPermalinks = (wrapper.getAttribute('data-pretty-permalinks') === 'true');
    var detailBaseURL = wrapper.getAttribute('data-detail-base-url') || '';
    var eventBucket = wrapper.getAttribute('data-event-bucket');

    var marquee = wrapper.querySelector('.eventive-marquee'); if(!marquee) return;
    var tag = marquee.getAttribute('data-tag') || '';
    var number = Math.min(parseInt(marquee.getAttribute('data-number'),10) || 5, 50);
    var rawStills = (marquee.getAttribute('data-stills')||'').toString().toLowerCase();
    var useStills = (rawStills==='true'||rawStills==='1'||rawStills==='yes');
    var yearRound = marquee.getAttribute('data-year-round') === 'true';
    var exclude = marquee.getAttribute('data-exclude') || '';

    function run(){
      var qs = yearRound ? '?marquee=true' : '';
      window.Eventive.request({ method:'GET', path: 'event_buckets/'+encodeURIComponent(eventBucket)+'/films'+qs })
      .then(function(res){
        if (!res || !res.films) return;
        var filtered = filterByIncludeExclude(res.films, tag, exclude);
        var content = document.createElement('div'); content.className = 'marquee-content';
        var slideWidth = 210;
        filtered.slice(0, number).forEach(function(f){
          var imageUrl = getImageUrlForFilm(f, useStills);
          content.appendChild(createPosterSlide(f.name, imageUrl, f.id, filmSyncEnabled, prettyPermalinks, detailBaseURL));
        });
        var rendered = Array.from(content.children);
        var currentWidth = rendered.length * slideWidth;
        var containerWidth = marquee.offsetWidth;
        while (currentWidth < containerWidth) {
          rendered.forEach(function(slide){ content.appendChild(slide.cloneNode(true)); });
          rendered = Array.from(content.children);
          currentWidth = rendered.length * slideWidth;
        }
        duplicateContentForLoop(content);
        var totalWidth = content.children.length * slideWidth;
        content.style.width = totalWidth + 'px';
        var PX_PER_SECOND = 60, MIN_SEC = 20, MAX_SEC = 180;
        var durationSec = Math.max(MIN_SEC, Math.min(MAX_SEC, Math.round(totalWidth / PX_PER_SECOND)));
        content.style.animationDuration = durationSec + 's';
        var track = wrapper.querySelector('.eventive-marquee-caption-track');
        var speedAttr = lower(wrapper.getAttribute('data-caption-speed') || 'match');
        var captionDuration = durationSec;
        var asNumber = parseInt(speedAttr,10); if(!isNaN(asNumber)&&asNumber>0) captionDuration = asNumber;
        if (track && (track.textContent||'').trim().length) { track.style.animationDuration = captionDuration + 's'; track.classList.add('caption-scroll'); }
        marquee.appendChild(content);
      })
      .catch(function(err){ try{ console.error('[eventive_marquee] fetch error', err); }catch(_){ } });
    }

    if (window.Eventive && typeof Eventive.ready === 'function') { Eventive.ready(run); }
    else if (window.Eventive && Eventive.on && typeof Eventive.on === 'function') { try{ Eventive.on('ready', run); }catch(_){ run(); } }
    else {
      // Poll until Eventive.request exists, then run
      var tries=0; (function poll(){ if(window.Eventive && typeof Eventive.request==='function'){ run(); return; } if(++tries>60){ run(); return; } setTimeout(poll,50); })();
    }
  }

  function boot(){
    document.querySelectorAll('.eventive-marquee-wrapper').forEach(initOneWrapper);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();

  // Elementor live preview support
  if (window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try {
        elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(scope){ if(scope&&scope[0]){ var wraps = scope[0].querySelectorAll('.eventive-marquee-wrapper'); wraps && wraps.forEach(initOneWrapper); } });
      } catch(_){ }
    });
  }
})();