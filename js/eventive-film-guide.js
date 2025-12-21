

(function(){
  // ------- Schedulers & small utils -------
  var rAF = window.requestAnimationFrame || function(cb){ return setTimeout(cb,16); };
  var rIC = window.requestIdleCallback || function(cb){ return setTimeout(function(){ cb({didTimeout:true,timeRemaining:function(){return 0;}}); }, 50); };
  function debounce(fn, wait){ var t; return function(){ var a=arguments,c=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(c,a); }, wait); }; }
  function lower(v){ return (v==null?'':String(v)).toLowerCase(); }
  function esc(v){ return v==null?'':String(v); }
  function slugify(str){ if(!str) return ''; return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''); }
  function textColor(bg){ if(!bg) return '#000'; var hex=bg.replace('#',''); if(hex.length===3){hex=hex.split('').map(function(c){return c+c;}).join('');} var r=parseInt(hex.substr(0,2),16)||0,g=parseInt(hex.substr(2,2),16)||0,b=parseInt(hex.substr(4,2),16)||0; return ((r*299+g*587+b*114)/1000>128)?'#000':'#fff'; }

  function normalizeImageType(v){
    var s = (v||'').toString().toLowerCase();
    if (s === 'poster' || s === 'poster-image' || s === 'poster_image') return 'poster_image';
    if (s === 'cover'  || s === 'cover-image'  || s === 'cover_image')  return 'cover_image';
    if (s === 'still'  || s === 'still-image'  || s === 'still_image')  return 'still_image';
    return s; // already a field name or unknown
  }

  // ------- URL helpers (for tag param management) -------
  function setURLTagParam(tagId, method){
    try {
      var u = new URL(window.location.href);
      if (!tagId) u.searchParams.delete('tag-id');
      else u.searchParams.set('tag-id', tagId);
      if (method === 'replace') history.replaceState({}, '', u.toString());
      else history.pushState({}, '', u.toString());
    } catch(_){}
  }

  // ------- Eventive request cache -------
  window.__Eventive_FilmCache = window.__Eventive_FilmCache || {};
  function fetchFilmsOnce(bucket, yearRound){
    var key = bucket + '::' + (yearRound?'marquee': 'all');
    var C = window.__Eventive_FilmCache;
    if (C[key]) return Promise.resolve(C[key]);
    if (!window.Eventive) return Promise.reject(new Error('Eventive not ready'));
    var opts = { method:'GET', path:'event_buckets/'+encodeURIComponent(bucket)+'/films', qs:{ include: 'tags' } };
    if (yearRound) opts.qs.marquee = true;
    return Eventive.request(opts).then(function(res){ var list=(res&&res.films)||[]; C[key]=list; return list; });
  }

  // ------- DOM pickers (robust to Elementor) -------
  function pickByIdOrGuess(wrap, id, guessSel){
    if (id){
      var el = document.getElementById(id);
      if (el) return el;
    }
    if (guessSel){
      try {
        var g = wrap.querySelector(guessSel);
        if (g) return g;
      } catch(_){}
    }
    // last resorts: only if we actually have an id string
    if (id && typeof id === 'string' && id.length){
      try {
        var safeClass = id.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
        var fall = wrap.querySelector('[id*="'+id+'"], .'+safeClass);
        if (fall) return fall;
      } catch(_){}
    }
    return null;
  }

  function buildTagSets(list){ var ids=new Set(), names=new Set(); (list||[]).forEach(function(v){ if(v==null) return; var s=String(v).trim(); if(!s) return; ids.add(s); names.add(s.toLowerCase()); }); return {ids:ids, names:names}; }
  function filmHasAnyTag(film, idsSet, namesSet, candidate){ var tags=(film.tags||[]); if(!tags.length) return false; var cand=candidate?String(candidate).trim().toLowerCase():null; for(var i=0;i<tags.length;i++){ var t=tags[i]; var tid=(t&&t.id!=null)?String(t.id):''; var tname=(t&&t.name!=null)?String(t.name).toLowerCase():''; if(cand && !(tid===candidate || tname===cand)) continue; if(idsSet.has(tid) || namesSet.has(tname)) return true; } return false; }

  function preprocess(list){ return (list||[]).map(function(f){ if(!f) return f; var d=String((f.description||f.short_description)||''); var creditsText=''; if(f.credits && typeof f.credits==='object'){ try{ creditsText = Object.values(f.credits).flat().join(' ');}catch(_){ creditsText = Object.values(f.credits).join(' ');} } return Object.assign({}, f, { _lc_name: lower(f.name), _lc_desc: lower(d), _lc_credits: lower(creditsText) }); }); }

  // ------- Instance bootstrap -------
  function initInstance(wrap){
    // Prevent initializing a child inside another film guide wrapper
    var owner = wrap.closest && wrap.closest('.wp-block-eventive-film-guide');
    if (owner && owner !== wrap) return;
    if (!wrap || wrap.__efgInited) return; wrap.__efgInited = true;
    if (!wrap.id) { wrap.id = 'efg-' + Math.random().toString(36).slice(2); }
    try { console.debug('[eventive-film-guide] init', { id: wrap.id, bucket: wrap.getAttribute && wrap.getAttribute('data-bucket'), view: wrap.getAttribute && wrap.getAttribute('data-view') }); } catch(_) {}

    // Read config from data-* on wrapper (provided by shortcode markup)
    var bucket = wrap.getAttribute('data-bucket');
    var includeTags = []; try{ includeTags = JSON.parse(wrap.getAttribute('data-include-tags')||'[]'); }catch(e){}
    var excludeTags = []; try{ excludeTags = JSON.parse(wrap.getAttribute('data-exclude-tags')||'[]'); }catch(e){}
    var specificFilmId = wrap.getAttribute('data-film-id')||'';
    var imageType = wrap.getAttribute('data-image-type')||'poster_image';
    var view = wrap.getAttribute('data-view')||'grid';
    imageType = normalizeImageType(imageType);
    var showEvents = wrap.getAttribute('data-show-events')==='true';
    var showDetails= wrap.getAttribute('data-show-details')==='true';
    var showDescription = wrap.getAttribute('data-show-description')==='true';
    var showTags   = wrap.getAttribute('data-show-tags')==='true';
    var yearRound  = wrap.getAttribute('data-year-round')==='true';
    var pretty     = wrap.getAttribute('data-pretty')==='true';
    var detailBase = wrap.getAttribute('data-detail-base')||'';
    var syncEnabled= wrap.getAttribute('data-sync-enabled')==='true';
    var showSearch = wrap.getAttribute('data-show-search')==='true';
    var showSwitch = wrap.getAttribute('data-show-switchers')==='true';

    // Resolve inner element IDs if provided as data-*, else guess commonly used selectors
    var gridId  = wrap.getAttribute('data-grid-id');
    var listId  = wrap.getAttribute('data-list-id');
    var viewId  = wrap.getAttribute('data-view-id');
    var imageId = wrap.getAttribute('data-image-id');
    var searchId= wrap.getAttribute('data-search-id');

    // Container where we will render in-frame tag pills (if present)
    var tagsWrap = wrap.querySelector('.eventive-film-guide-tags-filter');

    // Try provided IDs first, then common selectors, then ID suffix patterns, then create as last resort
    var grid = pickByIdOrGuess(wrap, gridId, '.catalog-film-container.grid, .catalog-grid, [data-role="grid"], #catalog-grid')
            || wrap.querySelector('#'+wrap.id+'_grid, [id$="_grid"], [id$="-grid"]');
    var list = pickByIdOrGuess(wrap, listId, '.catalog-film-container.list, .catalog-list, [data-role="list"], #catalog-list')
            || wrap.querySelector('#'+wrap.id+'_list, [id$="_list"], [id$="-list"]');
    var viewSel = pickByIdOrGuess(wrap, viewId, 'select[data-role="view"], .efg-view-select')
              || wrap.querySelector('#'+wrap.id+'_view, select[id$="_view"]');
    var imgSel  = pickByIdOrGuess(wrap, imageId, 'select[data-role="image"], .efg-image-select')
              || wrap.querySelector('#'+wrap.id+'_image, select[id$="_image"]');
    var searchInput = pickByIdOrGuess(wrap, searchId, 'input[type="search"], .efg-search, [data-role="search"]');

    if (!grid && !list){
      // Create a default grid container if none present
      grid = document.createElement('div');
      grid.className = 'catalog-film-container grid';
      wrap.appendChild(grid);
    }

    if (grid && list){
      grid.style.display = (view === 'grid') ? 'grid' : 'none';
      list.style.display = (view === 'list') ? 'block' : 'none';
    }

    // URL tag param
    var urlParams = new URLSearchParams(window.location.search);
    var urlTagId = urlParams.get('tag-id');
    var activeTag = urlTagId || '';
    var searchTerm='';

    var renderScheduled=false;
    function scheduleRender(){ if(renderScheduled) return; renderScheduled=true; rAF(function(){ renderScheduled=false; renderNow(); }); }

    // Respond to global tag selection
    document.addEventListener('eventive:setActiveTag', function(ev){
      try {
        var tid = ev && ev.detail && (ev.detail.tagId!==undefined ? ev.detail.tagId : ev.detail);
        if (tid === undefined) return;
        activeTag = String(tid||'');
        setURLTagParam(activeTag, 'replace');
        highlightActiveTag();
        scheduleRender();
      } catch(_){}
    });

    // UI bindings
    if (viewSel) viewSel.addEventListener('change', function(e){ view=e.target.value; if(grid && list){ grid.style.display = (view==='grid')?'grid':'none'; list.style.display = (view==='list')?'block':'none'; } scheduleRender(); });
    if (imgSel) imgSel.addEventListener('change', function(e){ imageType = normalizeImageType(e.target.value); scheduleRender(); });
    // In-card tag pills should filter within the same view
    document.addEventListener('click', function(ev){
      var t = ev.target; if(!t) return;
      var within = t.closest ? t.closest('#'+wrap.id) : null; if(!within) return;
      var pill = t.closest ? t.closest('.tag-pill') : null; if(!pill) return;
      ev.preventDefault(); ev.stopPropagation();
      var tid = pill.getAttribute('data-tag-id'); if(!tid) return;
      activeTag = String(tid);
      setURLTagParam(activeTag, 'push');
      scheduleRender();
    }, true);
    if (searchInput) { var apply=debounce(function(){ searchTerm=(searchInput.value||'').trim().toLowerCase(); scheduleRender(); }, 150); searchInput.addEventListener('input', apply); searchInput.addEventListener('change', apply); searchInput.addEventListener('keydown', function(ev){ if(ev.key==='Enter'){ ev.preventDefault(); apply(); } }); }

    // Intercept clicks on our in-frame tag pills (no shortcode required)
    if (tagsWrap && !tagsWrap.__efgClickBound) {
      tagsWrap.__efgClickBound = true;
      tagsWrap.addEventListener('click', function(ev){
        var a = ev.target && ev.target.closest ? ev.target.closest('a.external-tag-filter') : null;
        if (!a) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || a.target === '_blank') return; // let modified clicks pass
        ev.preventDefault(); ev.stopPropagation();
        var tid = a.getAttribute('data-tag-id') || '';
        activeTag = String(tid);
        setURLTagParam(activeTag, 'replace');
        highlightActiveTag();
        scheduleRender();
      }, true);
    }

    // Back/forward sync
    window.addEventListener('popstate', function(){ try{ var v=new URL(window.location.href).searchParams.get('tag-id')||''; activeTag=v; highlightActiveTag(); scheduleRender(); }catch(_){ } });
    function collectAvailableTagsFromFilms(list){
      var map = new Map(); // id -> {id,name,color,count}
      (list||[]).forEach(function(f){
        var tags = Array.isArray(f.tags) ? f.tags : [];
        if (!tags.length && Array.isArray(f.tag_ids)) {
          tags = f.tag_ids.map(function(id){ return { id: String(id), name: '#'+id, color: '#cccccc' }; });
        }
        tags.forEach(function(t){
          if (!t) return;
          var id = (t.id!=null) ? String(t.id) : '';
          var name = t.name || t.title || t.label || (id?('#'+id):'');
          if (!id && !name) return;
          var cur = map.get(id||name) || { id: id, name: name, color: (t.color||'#e0e0e0'), count: 0 };
          cur.count += 1; map.set(id||name, cur);
        });
      });
      return Array.from(map.values());
    }

    function renderTagPillsFromFilms(list){
      if (!tagsWrap) return;
      var baseFiltered = list.slice();
      // honor include/exclude sets but ignore current activeTag to show full options
      if (!specificFilmId && (inc.ids.size||inc.names.size)) {
        baseFiltered = baseFiltered.filter(function(f){ return filmHasAnyTag(f, inc.ids, inc.names); });
      }
      if (exc.ids.size||exc.names.size) {
        baseFiltered = baseFiltered.filter(function(f){ return !filmHasAnyTag(f, exc.ids, exc.names); });
      }
      var tags = collectAvailableTagsFromFilms(baseFiltered);
      if (!tags.length) { tagsWrap.innerHTML=''; return; }

      var resetUrl = (function(){ try{ var u=new URL(window.location.href); u.searchParams.delete('tag-id'); return u.toString(); }catch(_){ return '#'; } })();
      var html = '';
      html += '<div class="tag-container eventive-tags" data-hide-empty="false">';
      // ALL first
      html += '<span class="tag-label is-all"><a class="external-tag-filter" data-tag-id="" href="'+resetUrl+'">All</a></span>';
      // then each unique tag by name
      tags.sort(function(a,b){ return a.name.toLowerCase()<b.name.toLowerCase()?-1:1; });
      html += tags.map(function(t){
        var fg = textColor(t.color||'#e0e0e0');
        var href = (function(){ try{ var u=new URL(resetUrl); u.searchParams.set('tag-id', t.id||t.name); return u.toString(); }catch(_){ return '#'; } })();
        return '<span class="tag-label" style="background-color:'+esc(t.color||'#e0e0e0')+';color:'+fg+'">'
             + '<a class="external-tag-filter" data-tag-id="'+esc(t.id||t.name)+'" href="'+href+'">'+esc(t.name)+'</a>'
             + '</span>';
      }).join('');
      html += '</div>';
      tagsWrap.innerHTML = html;
      highlightActiveTag();
    }

    function highlightActiveTag(){
      if (!tagsWrap) return;
      try{
        var links = tagsWrap.querySelectorAll('a.external-tag-filter');
        links.forEach(function(l){ l.classList.remove('is-active'); });
        links.forEach(function(l){
          var id = l.getAttribute('data-tag-id');
          if (!activeTag) { if (!id) l.classList.add('is-active'); }
          else if (id === activeTag) { l.classList.add('is-active'); }
        });
      }catch(_){ }
    }

    // Build tag sets
    var inc=buildTagSets(includeTags), exc=buildTagSets(excludeTags);

    var films=[];

    function renderNow(){
      var filtered = films.slice();
      if(specificFilmId){ filtered = filtered.filter(function(f){ return String(f.id)===String(specificFilmId); }); }
      if(!specificFilmId && (inc.ids.size||inc.names.size)){ filtered = filtered.filter(function(f){ return filmHasAnyTag(f, inc.ids, inc.names); }); }
      if(!specificFilmId && activeTag){ var at=String(activeTag).trim(); filtered = filtered.filter(function(f){ return filmHasAnyTag(f, new Set([at]), new Set([at.toLowerCase()])); }); }
      if(exc.ids.size||exc.names.size){ filtered = filtered.filter(function(f){ return !filmHasAnyTag(f, exc.ids, exc.names); }); }
      if(searchTerm){ filtered = filtered.filter(function(f){ return (f._lc_name.indexOf(searchTerm)>-1)|| (f._lc_desc.indexOf(searchTerm)>-1) || (f._lc_credits.indexOf(searchTerm)>-1); }); }
      filtered.sort(function(a,b){ var A=(a.name||'').toLowerCase(), B=(b.name||'').toLowerCase(); return A<B?-1:A>B?1:0; });

      var target = (view==='list')? (list||grid) : (grid||list);
      if(!target){ return; }
      if(!filtered.length){ target.innerHTML = '<div class="catalog-no-films">No films found for the selected criteria.</div>'; return; }

      target.innerHTML='';
      var i=0, batch=20; // films per frame
      function renderChunk(){
        var frag=document.createDocumentFragment();
        var end=Math.min(i+batch, filtered.length);
        for(; i<end; i++){
          var f=filtered[i];
          var runtime = showDetails ? ((f.details&&f.details.runtime)||'N/A') : null;
          var director = showDetails ? ((f.credits&&f.credits.director)||'Unknown') : null;
          var year = showDetails ? ((f.details&&f.details.year)||'N/A') : null;
          var language = showDetails ? ((f.details&&f.details.language)||'N/A') : null;
          var imgKey = normalizeImageType(imageType);
          var imageSrc = f[imgKey] || f[imageType] || 'default-placeholder.jpg';
          var shortDesc = f.short_description || '';
          var slug = slugify(f.name);
          var filmLink='';
          if(syncEnabled){ filmLink = (esc(detailBase).replace(/\/$/,'') + '/' + slug); } else { filmLink = pretty ? (detailBase + '?film-id=' + encodeURIComponent(f.id)) : (detailBase + '&film-id=' + encodeURIComponent(f.id)); }
          var tagsHTML='';
          var filmTagsArr = Array.isArray(f.tags) ? f.tags : [];
          if (!filmTagsArr.length && Array.isArray(f.tag_ids)) { filmTagsArr = f.tag_ids.map(function(id){ return { id: id, name: '#'+id, color: '#ccc' }; }); }
          if(showTags && filmTagsArr && filmTagsArr.length){ var tagMap=new Map(); filmTagsArr.forEach(function(t){ if(t && t.id && !tagMap.has(t.id)) tagMap.set(t.id,t); }); tagsHTML = '<div class="film-tags">' + Array.from(tagMap.values()).map(function(t){ var fg=textColor(t.color||'#ccc'); return '<button class="tag-pill" style="background-color:' + (t.color||'#ccc') + '; color:' + fg + '; border:none; padding:0.25rem 0.5rem; margin:0.125rem; border-radius:999px; cursor:pointer;" data-tag-id="'+t.id+'">'+t.name+'</button>'; }).join('') + '</div>'; }

          var el=document.createElement('div');
          if(view==='list'){
            el.className='catalog-film-list-item';
            el.innerHTML = '<a href="'+filmLink+'"><img class="catalog-film-image" loading="lazy" decoding="async" src="'+imageSrc+'" alt="'+(f.name||'Film')+'"/></a>' +
              '<div class="catalog-film-details">'+
              '<h2 class="catalog-film-title">'+(f.name||'')+'</h2>' + tagsHTML +
              '<span class="catalog-film-description">'+ (showDetails?('Directed by: '+director+'<br />'+ (runtime+' min | '+year+' | '+language)):'') + '</span>' +
              (showDescription && shortDesc ? '<div class="catalog-film-short">'+ shortDesc +'</div>' : '') +
              (showEvents ? '<div class="catalog-film-details-link"><a href="'+filmLink+'">Details & Showtimes</a></div>' : '') +
              '</div>';
          } else {
            el.className='catalog-film-box'; el.setAttribute('role','article');
            el.innerHTML = '<a href="'+filmLink+'" aria-label="Details for '+(f.name||'')+'"><div class="catalog-film-image-wrapper"><img class="catalog-film-image" loading="lazy" decoding="async" src="'+imageSrc+'" alt="'+(f.name||'')+'"/></div></a>' +
              '<div class="catalog-film-details">'+
              '<h2 class="catalog-film-title">'+(f.name||'')+'</h2>' + tagsHTML +
              '<span class="catalog-film-description">'+ (showDetails?('Directed by: '+director+'<br />'+ (runtime+' min | '+year+' | '+language)):'') + '</span>' +
              (showDescription && shortDesc ? '<div class="catalog-film-short">'+ shortDesc +'</div>' : '') +
              (showEvents ? '<div class="catalog-film-details-link"><a href="'+filmLink+'">Details & Showtimes</a></div>' : '') +
              '</div>';
          }
          frag.appendChild(el);
        }
        target.appendChild(frag);
        if(i < filtered.length){ rAF(renderChunk); } else { rIC(function(){ if(window.Eventive && Eventive.rebuild){ try{ Eventive.rebuild(); }catch(e){} } }); }
      }
      rAF(renderChunk);
    }

    function boot(){
      if(!window.Eventive){ var t=(view==='list')?list:grid; if(t) t.innerHTML='<div class=\"catalog-error\">Eventive API is not available.</div>'; return; }
      var run = function(){ fetchFilmsOnce(bucket, yearRound).then(function(all){ films = preprocess(all); renderTagPillsFromFilms(films); scheduleRender(); }).catch(function(){ var t=(view==='list')?list:grid; if(t) t.innerHTML='<div class=\"catalog-error\">Error loading film catalog.</div>'; }); };
      // Prefer a ready(cb) if present, else on('ready'), else poll
      var attached = false;
      try {
        if (window.Eventive && typeof Eventive.ready === 'function') {
          Eventive.ready(run); attached = true;
        }
      } catch(_){}
      if (!attached) {
        try {
          if (window.Eventive && Eventive.on && typeof Eventive.on === 'function') {
            Eventive.on('ready', run); attached = true;
          }
        } catch(_){}
      }
      if (!attached) {
        var tries = 0;
        (function poll(){
          if (window.Eventive && typeof Eventive.request === 'function') { run(); return; }
          if (++tries > 60) { run(); return; } // give up after ~3s then attempt anyway
          setTimeout(poll, 50);
        })();
      }
    }

    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  }

  function autoInit(){
    // Only initialize shortcode wrappers, not any descendant element that happens to have data-bucket
    var candidates = document.querySelectorAll('.wp-block-eventive-film-guide');
    if (!candidates || !candidates.length) return;
    candidates.forEach(function(node){
      if (!node.getAttribute) return;
      if (!node.getAttribute('data-bucket')) return;
      // Guard: do not init if this node is nested inside another film-guide wrapper
      var parentGuide = node.parentElement && node.parentElement.closest && node.parentElement.closest('.wp-block-eventive-film-guide');
      if (parentGuide && parentGuide !== node) return;
      initInstance(node);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit, {once:true});
  } else {
    autoInit();
  }

  // Elementor: re-init on widget render
  if (window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try{
        elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(scope){
          if (scope && scope[0]){
            var wraps = scope[0].querySelectorAll('.wp-block-eventive-film-guide');
            if (wraps && wraps.length){
              wraps.forEach(function(n){
                // skip nested guides
                var parentGuide = n.parentElement && n.parentElement.closest && n.parentElement.closest('.wp-block-eventive-film-guide');
                if (parentGuide && parentGuide !== n) return;
                initInstance(n);
              });
            }
          }
        });
      }catch(_){ }
    });
  }
})();