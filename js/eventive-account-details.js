(function(){
  // Helper: detect if this instance is inside the parent [eventive-account]
  function inParentAccountContainer(el){
    try { return !!(el && el.closest && el.closest('.eventive-account-container')); } catch(_) { return false; }
  }

  // Helper: show a friendly message and stop any spinner
  function showMessage(loginEl, contentEl, msg){
    if (contentEl) contentEl.style.display = 'none';
    if (!loginEl) return;
    loginEl.style.display = 'flex';
    loginEl.innerHTML = '<div class="eventive-notice" style="text-align:center;">' + (msg||'Please log in to view your account details.') + '</div>';
  }

  // Helpers to safely extract values
  function pickFirst(){
    for (var i=0;i<arguments.length;i++){
      var v = arguments[i];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return undefined;
  }
  function firstIn(arr, key){
    if (!arr || !arr.length) return undefined;
    if (!key) return arr[0];
    var v = arr[0];
    return (v && typeof v === 'object') ? v[key] : v;
  }
  function joinAddress(obj){
    if (!obj || typeof obj !== 'object') return obj;
    var parts = [obj.street||obj.line1||obj.address1, obj.line2||obj.address2, obj.city, obj.region||obj.state, obj.postal_code||obj.postalCode||obj.zip, obj.country]
      .filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }
  function normalizePerson(p){
    if (!p || typeof p !== 'object') return {};
    var d = p.details || {};
    var addresses = p.addresses || d.addresses;
    var phones = p.phones || d.phones;
    var emails = p.emails || d.emails;

    var name = pickFirst(p.name, d.name, p.full_name, p.fullName, (p.first_name && p.last_name) ? (p.first_name + ' ' + p.last_name) : undefined, (d.first_name && d.last_name) ? (d.first_name + ' ' + d.last_name) : undefined);
    var email = pickFirst(p.email, d.email, firstIn(emails, 'email'));
    var phone_number = pickFirst(p.phone_number, d.phone_number, p.phone, d.phone, p.phoneNumber, d.phoneNumber, firstIn(phones, 'number'));

    var mailing_address = pickFirst(
      joinAddress(p.mailing_address), joinAddress(d.mailing_address),
      joinAddress(p.address), joinAddress(d.address),
      joinAddress(firstIn(addresses)),
      p.mailing_address, d.mailing_address, p.address, d.address, firstIn(addresses)
    );

    var sms_tickets_enabled = pickFirst(p.sms_tickets_enabled, d.sms_tickets_enabled);

    return {
      name: name,
      email: email,
      phone_number: phone_number,
      mailing_address: mailing_address,
      sms_tickets_enabled: sms_tickets_enabled,
      _raw: p
    };
  }

  function initOne(cfg){
    if(!cfg) return;
    var wrap    = document.getElementById(cfg.wrap);
    var loginEl = document.getElementById(cfg.login);
    var content = document.getElementById(cfg.content);
    var table   = document.getElementById(cfg.table);
    if(!wrap || wrap.__inited) return; wrap.__inited = true;

    // Ensure wpApiSettings is available (fallback for REST root + nonce)
    var wpApiSettings = window.wpApiSettings || { root: (window.wp && wp.ajax && wp.ajax.settings && wp.ajax.settings.url) || '/', nonce: '' };

    function clearAccountDetails(){
      if(content) content.style.display='none';
      if(table && table.querySelector('tbody')) table.querySelector('tbody').innerHTML='';
      // If used standalone (not nested in [eventive-account]), show a helpful message
      if (!inParentAccountContainer(wrap)) {
        showMessage(loginEl, content, 'You are not logged in. Please use the login above to continue.');
      } else if (loginEl) {
        // Nested inside [eventive-account]: parent handles UI
        loginEl.style.display='none';
      }
    }

    function renderAccountDetails(details){
      var tbody = table.querySelector('tbody');
      if(!tbody){ return; }
      tbody.innerHTML='';

      // Define which fields to render (expand as needed)
      var fields = { name:'Name', email:'Email', phone_number:'Phone Number', mailing_address:'Mailing Address' };
      if(details && Object.prototype.hasOwnProperty.call(details,'sms_tickets_enabled')){
        fields.sms_tickets_enabled = 'SMS Tickets Enabled';
      }

      Object.keys(fields).forEach(function(key){
        var label = fields[key];
        var raw = details && details[key];
        // Common fallbacks for known fields
        if (raw === undefined) {
          var R = details._raw || {};
          if (key === 'phone_number') raw = details.phone || details.phoneNumber || (R.details && (R.details.phone||R.details.phone_number)) || (R.phones && firstIn(R.phones,'number'));
          if (key === 'mailing_address') raw = details.address || details.mailingAddress || details.mailing_address || (R.details && (R.details.address||R.details.mailing_address)) || joinAddress(firstIn(R.addresses));
          if (key === 'name') raw = (R && (R.name || R.full_name || (R.first_name && R.last_name && (R.first_name+' '+R.last_name))));
          if (key === 'email') raw = (R && (R.email || (R.emails && firstIn(R.emails,'email'))));
        }
        // Normalize mailing_address object -> string
        if (key === 'mailing_address' && raw && typeof raw === 'object') {
          var parts = [raw.street || raw.line1, raw.line2, raw.city, raw.region || raw.state, raw.postal_code || raw.postalCode, raw.country]
            .filter(Boolean);
          raw = parts.join(', ');
        }
        var value = (raw !== undefined && raw !== null && raw !== '') ? raw : 'Not Set';
        var displayValue = (typeof value === 'boolean') ? (value ? 'Yes' : 'No') : value;
        var html = '<tr>'
          + '<td>'+ label +'</td>'
          + '<td class="static-value">'+ displayValue +'</td>'
          + '<td>';
        if(key==='sms_tickets_enabled'){
          var checked = (value===true) ? 'checked' : '';
          html += '<label class="toggle-switch">'
               +    '<input type="checkbox" class="sms-toggle" data-key="'+ key +'" '+ checked +'>\n'
               +    '<span class="slider"></span>'
               +  '</label>';
        } else {
          html += '<button class="edit-row-button" data-key="'+ key +'">Edit</button>';
        }
        html += '</td></tr>';
        tbody.insertAdjacentHTML('beforeend', html);
      });

      // Bind per-row editors
      bindRowEditors(details);

      // Bind SMS toggle
      wrap.querySelectorAll('.sms-toggle').forEach(function(t){
        t.addEventListener('change', function(){
          var key = this.getAttribute('data-key');
          var newVal = this.checked;
          var row = this.closest('tr');
          var cell = row && row.querySelector('.static-value');
          if(cell) cell.textContent = newVal ? 'Yes' : 'No';
          handleRowSubmit(details, key, newVal, row, cell);
        });
      });
    }

    function bindRowEditors(original){
      wrap.querySelectorAll('.edit-row-button').forEach(function(btn){
        btn.addEventListener('click', function(){
          var key = btn.getAttribute('data-key');
          var row = btn.closest('tr');
          var cell = row.querySelector('.static-value');
          var current = cell.textContent.trim();
          if(current==='Yes' || current==='No'){
            cell.innerHTML = '<select class="edit-select">\n<option value="true" '+ (current==='Yes'?'selected':'') +'>Yes</option>\n<option value="false" '+ (current==='No'?'selected':'') +'>No</option>\n</select>';
          } else {
            cell.innerHTML = '<input type="text" value="'+ current.replace(/"/g,'&quot;') +'" class="edit-input" />';
          }
          row.querySelector('td:last-child').innerHTML = '<button class="submit-row-button" data-key="'+ key +'">Submit</button> <button class="cancel-row-button">Cancel</button>';
          row.querySelector('.submit-row-button').addEventListener('click', function(){
            var input = row.querySelector('.edit-select, .edit-input');
            var updated = input ? (input.value||'').trim() : current;
            handleRowSubmit(original, key, updated, row, cell);
          });
          row.querySelector('.cancel-row-button').addEventListener('click', function(){ renderAccountDetails(original); });
        });
      });
    }

    async function handleRowSubmit(original, key, updatedValue, row, cell){
      try {
        var personId = window.eventivePersonId || (window.Eventive && Eventive.person && Eventive.person.id) || null;
        if(!personId){ console.warn('[account-details] missing person id'); return; }
        var url = (wpApiSettings.root || '/') + 'eventive/v1/person/' + personId;
        var payload = {}; payload[key] = updatedValue;
        var res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': (wpApiSettings.nonce||'') },
          body: JSON.stringify(payload)
        });
        var json = await res.json().catch(function(){ return {}; });
        if(!res.ok){ alert('Failed to update. Server error.'); return; }
        original[key] = updatedValue;
        renderAccountDetails(original);
      } catch (err) {
        console.error('Error submitting update:', err);
        alert('Failed to save changes. Please try again.');
      }
    }

    async function fetchAccountDetails(){
      try {
        // Hide loader if a utility exists, else quickly hide it
        if(window.EventiveUtils && EventiveUtils.hideLoader){ try{ EventiveUtils.hideLoader(loginEl); }catch(_){} }
        else if(loginEl){ loginEl.style.display='none'; }

        var resp = await window.Eventive.request({ method:'GET', path:'people/self', authenticatePerson:true });
        var person = resp && (resp.person || resp); // some installs return { person: {...} }, others return the person directly
        window.eventivePersonId = person && person.id;
        var details = normalizePerson(person || {});
        if (!details || Object.keys(details).length === 0) {
          console.warn('[account-details] Empty/unknown person payload from people/self', resp);
        } else {
          console.debug('[account-details] normalized person', details);
        }
        renderAccountDetails(details);
        if(content) content.style.display='block';
        try { if(window.Eventive && typeof window.Eventive.renderButtons==='function') { window.Eventive.renderButtons(); } } catch(_){}
      } catch (error) {
        console.error('Error fetching account details:', error);
        if (error && (error.code === 'InvalidCredentials' || error.message === 'InvalidCredentials')){
          clearAccountDetails();
        } else {
          if (!inParentAccountContainer(wrap)) {
            showMessage(loginEl, content, 'There was a problem loading your account. Please refresh or try again later.');
          }
        }
      }
    }

    function boot(){
      // If Eventive never loads, show a graceful message after a short timeout (standalone only)
      var fallbackTimer = setTimeout(function(){
        if (!window.Eventive || !Eventive.on) {
          if (!inParentAccountContainer(wrap)) {
            showMessage(loginEl, content, 'Eventive is not available. Please check your connection and try again.');
          }
        }
      }, 2500);

      if(!window.Eventive || !Eventive.on){ return; }
      Eventive.on('ready', function(){
        clearTimeout(fallbackTimer);
        try { if(Eventive.isLoggedIn()) fetchAccountDetails(); else clearAccountDetails(); }
        catch(e){ console.error('[account-details] ready error', e); clearAccountDetails(); }
      });
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  }

  function initAll(){
    var cfgs = (window.__EVT_ACCOUNT_DETAILS||[]); if(!cfgs.length) return;
    cfgs.forEach(initOne);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAll, {once:true});
  else initAll();

  if(window.jQuery && window.elementorFrontend){
    jQuery(window).on('elementor/frontend/init', function(){
      try{ elementorFrontend.hooks.addAction('frontend/element_ready/shortcode.default', function(){ initAll(); }); }catch(e){}
    });
  }
})();
