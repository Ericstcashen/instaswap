(function () {
  var CFG = window.INSTASWAP || { api: '', site: location.origin };
  var $ = function (id) { return document.getElementById(id); };
  var show = function (id) {
    ['setup', 'code', 'connect', 'done'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
  };
  var clean = function (v) { return (v || '').trim().replace(/^@+/, '').toLowerCase(); };
  var valid = function (h) { return /^[a-z0-9._]{1,30}$/.test(h); };

  var HOST_KEY = 'instaswap.host';       // { id, token, handle }
  var MINE_KEY = 'instaswap.myhandle';   // this phone's own handle

  var getHost = function () { try { return JSON.parse(localStorage.getItem(HOST_KEY)); } catch (e) { return null; } };
  var setHost = function (h) { localStorage.setItem(HOST_KEY, JSON.stringify(h)); };

  // deep-link into the IG app, fall back to web
  function openInstagram(handle) {
    var web = 'https://instagram.com/' + encodeURIComponent(handle);
    var t = setTimeout(function () { location.href = web; }, 1200);
    window.addEventListener('pagehide', function () { clearTimeout(t); }, { once: true });
    location.href = 'instagram://user?username=' + encodeURIComponent(handle);
  }

  function renderCode(host) {
    var link = CFG.site + '/?u=' + encodeURIComponent(host.id);
    $('shareLink').value = link;
    $('qr').innerHTML = '';
    try {
      var qr = qrcode(0, 'M'); qr.addData(link); qr.make();
      $('qr').innerHTML = qr.createImgTag(6, 0);
    } catch (e) { $('qr').textContent = 'Share the link below.'; }
    show('code');
  }

  var params = new URLSearchParams(location.search);
  var hostId = params.get('u');

  // ================= GUEST FLOW =================
  if (hostId) {
    fetch(CFG.api + '/api/hosts/' + encodeURIComponent(hostId))
      .then(function (r) { if (!r.ok) throw new Error('gone'); return r.json(); })
      .then(function (h) {
        $('hostName').textContent = '@' + h.handle;
        $('hostAv').textContent = h.handle.charAt(0).toUpperCase();
        var mine = localStorage.getItem(MINE_KEY);
        if (mine) $('guestHandle').value = mine;
        show('connect');

        $('swapBtn').onclick = function () {
          var guest = clean($('guestHandle').value);
          if (!valid(guest)) { $('connectErr').textContent = 'Enter your Instagram to swap.'; return; }
          $('connectErr').textContent = '';
          localStorage.setItem(MINE_KEY, guest);
          $('swapBtn').setAttribute('disabled', ''); $('swapBtn').textContent = 'Swapping…';

          fetch(CFG.api + '/api/swaps', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hostId: h.id, guest: guest })
          }).then(function (r) { return r.json(); })
            .catch(function () { return {}; })
            .then(function () {
              $('doneTitle').textContent = 'Swapped with @' + h.handle;
              $('doneSub').textContent = '@' + h.handle + ' just got your handle. Follow them back 👇';
              $('followBtn').onclick = function () { openInstagram(h.handle); };
              show('done');
            });
        };
      })
      .catch(function () {
        $('hostName').textContent = 'Code not found';
        $('hostAv').textContent = '×';
        $('connectErr').textContent = 'This Swaply code is invalid or expired.';
        $('swapBtn').setAttribute('disabled', '');
        show('connect');
      });

    $('ownBtn').onclick = function () {
      history.replaceState(null, '', '/');
      var mine = localStorage.getItem(MINE_KEY); if (mine) $('hostHandle').value = mine;
      show('setup');
    };
    return; // guest routing done
  }

  // ================= HOST FLOW =================
  var existing = getHost();
  if (existing) { $('hostHandle').value = existing.handle; }
  else { var mine = localStorage.getItem(MINE_KEY); if (mine) $('hostHandle').value = mine; }

  $('createBtn').onclick = function () {
    var h = clean($('hostHandle').value);
    if (!valid(h)) { $('setupErr').textContent = 'That doesn’t look like a valid Instagram handle.'; return; }
    $('setupErr').textContent = '';
    localStorage.setItem(MINE_KEY, h);

    var cur = getHost();
    if (cur && cur.handle === h && cur.id && cur.token) { renderCode(cur); return; }

    $('createBtn').setAttribute('disabled', ''); $('createBtn').textContent = 'Creating…';
    fetch(CFG.api + '/api/hosts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: h })
    }).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (host) { setHost(host); renderCode(host); })
      .catch(function () { $('setupErr').textContent = 'Could not create your code. Try again.'; })
      .finally(function () { $('createBtn').removeAttribute('disabled'); $('createBtn').textContent = 'Create my code'; });
  };

  // ---- native "scan someone's code" ----
  // Turns a scanned Swaply QR into a mutual swap: extract the code and jump
  // into the connect flow (with this phone's handle already remembered).
  function handleScannedText(text) {
    var id = null;
    try { id = new URL(text).searchParams.get('u'); } catch (e) { /* not a URL */ }
    if (!id && /^[a-z0-9]{6,}$/i.test((text || '').trim())) id = text.trim();
    if (!id) { alert("That QR isn't an Swaply code."); return; }
    location.href = '/?u=' + encodeURIComponent(id);
  }

  var scanStream = null, scanRAF = 0;
  function stopCameraScan() {
    if (scanRAF) cancelAnimationFrame(scanRAF), scanRAF = 0;
    if (scanStream) { scanStream.getTracks().forEach(function (t) { t.stop(); }); scanStream = null; }
    var v = $('scanVideo'); if (v) v.srcObject = null;
    $('scanOverlay').classList.add('hidden');
  }

  async function startCameraScan() {
    var overlay = $('scanOverlay'), video = $('scanVideo');
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    overlay.classList.remove('hidden');
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }, audio: false
    });
    video.srcObject = scanStream;
    await video.play();
    (function tick() {
      if (!scanStream) return; // cancelled
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code = window.jsQR && window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) { stopCameraScan(); handleScannedText(code.data); return; }
      }
      scanRAF = requestAnimationFrame(tick);
    })();
  }

  async function startScan() {
    // Real camera scan (native app + mobile browsers with a camera).
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.jsQR) {
      try { await startCameraScan(); return; }
      catch (e) { stopCameraScan(); /* no camera / denied → manual fallback */ }
    }
    var t = prompt('Paste an Swaply link or code:');
    if (t) handleScannedText(t);
  }
  $('scanBtn').onclick = startScan;
  $('scanCancel').onclick = stopCameraScan;

  $('editBtn').onclick = function () { show('setup'); };
  $('copyBtn').onclick = function () {
    $('shareLink').select();
    if (navigator.clipboard) navigator.clipboard.writeText($('shareLink').value);
    $('copyBtn').textContent = 'Copied';
    setTimeout(function () { $('copyBtn').textContent = 'Copy'; }, 1500);
  };
  $('ownBtn').onclick = function () { show('setup'); };

  // if a code already exists on this phone, jump straight to it
  if (existing && existing.id && existing.token) { renderCode(existing); }
})();
