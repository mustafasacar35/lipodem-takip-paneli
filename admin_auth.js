'use strict';

(function(){
  const SESSION_KEY = 'admin_session_v1';
  const DEFAULT_SESSION_HOURS = 8;
  const OWNER = 'mustafasacar35';
  const REPO = 'lipodem-takip-paneli';
  const BRANCH = 'main';
  // Legacy JSON path (kept as last-resort). Primary source is script-injected window.GH_ADMINS via settings/admins.js
  const ADMIN_LIST_JSON = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/settings/admins.json`;
  const ADMIN_LIST_JS = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/settings/admins.js`;
  // Development fallback for file:// or offline usage
  const ADMINS_FALLBACK = {
    admins: [
      { username: 'admin', passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' }
    ]
  };
  const IS_FILE = (location.protocol === 'file:');
  console.info(`AdminAuth loaded. Mode=${IS_FILE ? 'FILE' : location.protocol}, FallbackAdmins=${IS_FILE ? 'ENABLED' : 'DISABLED'}`);

  async function sha256Hex(str){
    // Prefer Web Crypto when available (secure origins)
    if (window.crypto && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    // Fallback: use CryptoJS if present or load it dynamically
    const hashWithCryptoJS = async () => {
      if (window.CryptoJS && CryptoJS.SHA256) {
        return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
      }
      return null;
    };
    let out = await hashWithCryptoJS();
    if (out) return out;
    // Dynamically load CryptoJS (local vendor first, then CDNs)
    async function loadScript(src){
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = resolve; // resolve anyway to allow graceful error
        document.head.appendChild(s);
      });
    }
    // Try local vendor, then jsDelivr, then cdnjs, then unpkg
    await loadScript('vendor/crypto-js.min.js');
    if (!(window.CryptoJS && CryptoJS.SHA256)) {
      await loadScript('https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js');
    }
    if (!(window.CryptoJS && CryptoJS.SHA256)) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js');
    }
    if (!(window.CryptoJS && CryptoJS.SHA256)) {
      await loadScript('https://unpkg.com/crypto-js@4.2.0/crypto-js.js');
    }
    out = await hashWithCryptoJS();
    if (out) return out;
    throw new Error('SHA-256 desteği bulunamadı. Lütfen sayfayı bir sunucu üzerinden (http/https) açın.');
  }

  function normalizeUsername(u){
    return (u||'').trim().toLowerCase();
  }

  async function waitForGHAdmins(timeoutMs=1000, intervalMs=100){
    const start = Date.now();
    while (Date.now() - start < timeoutMs){
      if (window.GH_ADMINS && Array.isArray(window.GH_ADMINS.admins)) return window.GH_ADMINS;
      await new Promise(r=>setTimeout(r, intervalMs));
    }
    return null;
  }

  async function tryFetchAdminsFromJs(url){
    try{
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const text = await res.text();
      // Extract JSON object assigned to window.GH_ADMINS = ...;
      const idx = text.indexOf('window.GH_ADMINS');
      if (idx === -1) return null;
      const eq = text.indexOf('=', idx);
      if (eq === -1) return null;
      const startObj = text.indexOf('{', eq);
      const endObj = text.lastIndexOf('}');
      if (startObj === -1 || endObj === -1 || endObj <= startObj) return null;
      const jsonStr = text.substring(startObj, endObj + 1);
      const obj = JSON.parse(jsonStr);
      if (obj && Array.isArray(obj.admins)) return obj;
    } catch(_){}
    return null;
  }

  async function loadAdmins(){
    // 1) Prefer already-injected window.GH_ADMINS
    if (window.GH_ADMINS && Array.isArray(window.GH_ADMINS.admins)) {
      const injected = window.GH_ADMINS;
      console.info('[AdminAuth] Using injected GH_ADMINS (script tag). admins=', (injected.admins||[]).map(a=>a.username));
      // If patientAdmins missing/empty, try to fetch remote admins.js to supplement
      const hasPatients = Array.isArray(injected.patientAdmins) && injected.patientAdmins.length > 0;
      if (!hasPatients) {
        const fromJsTry = await tryFetchAdminsFromJs(ADMIN_LIST_JS);
        if (fromJsTry && Array.isArray(fromJsTry.patientAdmins) && fromJsTry.patientAdmins.length > 0) {
          console.info('[AdminAuth] Supplementing GH_ADMINS from remote admins.js. patientAdmins count=', fromJsTry.patientAdmins.length);
          return fromJsTry;
        }
      }
      // On file:// also prefer remote if reachable
      if (IS_FILE) {
        const fromJs = await tryFetchAdminsFromJs(ADMIN_LIST_JS);
        if (fromJs) {
          console.info('[AdminAuth] Overriding injected GH_ADMINS with remote admins.js (file://). admins=', (fromJs.admins||[]).map(a=>a.username));
          return fromJs;
        }
      }
      return injected;
    }
    // 2) Wait briefly in case admins.js is still loading
    const waited = await waitForGHAdmins();
    if (waited) {
      console.info('[AdminAuth] GH_ADMINS arrived after wait. admins=', (waited.admins||[]).map(a=>a.username));
      return waited;
    }
    // 2.5) Try injecting remote admins.js script tag now and wait a bit (works on file:// too)
    try {
      const markerId = 'gh-admins-loader';
      if (!document.getElementById(markerId)){
        const s = document.createElement('script');
        s.id = markerId;
        s.src = `${ADMIN_LIST_JS}?t=${Date.now()}`;
        s.async = true;
        document.head.appendChild(s);
      }
    } catch(_){}
    const waitedAfterInject = await waitForGHAdmins(1500, 150);
    if (waitedAfterInject) {
      console.info('[AdminAuth] GH_ADMINS loaded after dynamic inject. admins=', (waitedAfterInject.admins||[]).map(a=>a.username));
      return waitedAfterInject;
    }
    // 3) If not file://, try to parse raw admins.js (no eval, JSON-extract)
    if (!IS_FILE){
      const fromJs = await tryFetchAdminsFromJs(ADMIN_LIST_JS);
      if (fromJs) {
        console.info('[AdminAuth] Parsed admins from raw admins.js. admins=', (fromJs.admins||[]).map(a=>a.username));
        return fromJs;
      }
    }
    // 4) Legacy JSON fallbacks
    if (!IS_FILE){
      try {
        const res = await fetch(`${ADMIN_LIST_JSON}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const js = await res.json();
          console.info('[AdminAuth] Loaded admins from admins.json. admins=', (js.admins||[]).map(a=>a.username));
          return js;
        }
      } catch(_){}
      try {
        const res2 = await fetch(`settings/admins.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res2.ok) {
          const js2 = await res2.json();
          console.info('[AdminAuth] Loaded admins from local admins.json. admins=', (js2.admins||[]).map(a=>a.username));
          return js2;
        }
      } catch(_){}
    }
    // 5) Last resort fallback (file:// or errors)
    console.warn('[AdminAuth] Using ADMINS_FALLBACK.');
    return ADMINS_FALLBACK;
  }

  function getSession(){
    try{
      const raw = localStorage.getItem(SESSION_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(!obj || !obj.username || !obj.expiresAt) return null;
      if(Date.now() > obj.expiresAt){
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return obj;
    } catch(e){
      return null;
    }
  }

  function setSession(username, hours=DEFAULT_SESSION_HOURS){
    const now = Date.now();
    const expiresAt = now + hours*60*60*1000;
    const sess = { username: normalizeUsername(username), loginAt: now, expiresAt };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(sess)); } catch(e){}
    return sess;
  }

  function clearSession(){
    try { localStorage.removeItem(SESSION_KEY); } catch(e){}
  }

  async function verify(username, password){
    const list = await loadAdmins();
    const uNorm = normalizeUsername(username);
    const inputHash = await sha256Hex(password);
    const admins = Array.isArray(list.admins) ? list.admins : [];
    console.info('[AdminAuth] Verifying user=', uNorm, 'available=', admins.map(a=>a.username));
    const found = admins.find(a => normalizeUsername(a.username) === uNorm);
    if(found){
      if((found.passwordHash||'').toLowerCase() !== inputHash){
        return { ok: false, error: 'Şifre yanlış' };
      }
      return { ok: true, admin: { username: found.username, roles: found.roles || ['admin'] } };
    }
    // If not in explicit admins, allow whitelisted patient accounts to login with their patient password
    const patientAdmins = Array.isArray(list.patientAdmins) ? list.patientAdmins.map(normalizeUsername) : [];
    if (patientAdmins.includes(uNorm) && window.PatientAuth && typeof PatientAuth.login === 'function') {
      try {
        console.info('[AdminAuth] patientAdmins hit for', uNorm, '-> delegating to PatientAuth.login');
        const res = await PatientAuth.login(username, password, false);
        console.info('[AdminAuth] PatientAuth.login result:', res);
        if (res && res.success) {
          return { ok: true, admin: { username, roles: ['admin'] } };
        } else if (res && res.error) {
          return { ok: false, error: res.error };
        }
      } catch(_) {}
    }
    return { ok: false, error: 'Kullanıcı bulunamadı' };
  }

  function ensureStyles(){
    if(document.getElementById('admin-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'admin-auth-styles';
    style.textContent = `
    .admin-auth-overlay{position:fixed;inset:0;background:rgba(2,6,23,.55);backdrop-filter:saturate(120%) blur(4px);display:flex;align-items:center;justify-content:center;z-index:2147483000}
    .admin-auth-card{width:min(380px,92%);background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(15,23,42,.35);overflow:hidden}
    .admin-auth-header{padding:16px 18px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff}
    .admin-auth-title{margin:0;font-size:18px;font-weight:700}
    .admin-auth-body{padding:16px 18px;display:flex;flex-direction:column;gap:12px}
    .admin-auth-input{width:100%;padding:10px 12px;border:1px solid #cbd5f5;border-radius:8px;font-size:14px}
    .admin-auth-input:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.22)}
    .admin-auth-actions{display:flex;gap:10px;justify-content:flex-end;padding:12px 18px;background:#f8fafc;border-top:1px solid #e0e7ff}
    .admin-auth-btn{padding:10px 14px;border:none;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer}
    .admin-auth-btn-primary{background:linear-gradient(135deg,#22d3ee 0%,#3b82f6 100%);color:#fff}
    .admin-auth-btn-secondary{background:#e2e8f0;color:#334155}
    .admin-auth-error{font-size:12px;color:#dc2626;background:#fee;padding:8px 10px;border-radius:8px;border-left:3px solid #dc2626;display:none}
    `;
    document.head.appendChild(style);
  }

  function showOverlay(){
    console.info('[AdminAuth] showOverlay called');
    ensureStyles();
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'admin-auth-overlay';
      overlay.innerHTML = `
        <div class="admin-auth-card" role="dialog" aria-modal="true" aria-labelledby="adminAuthTitle">
          <div class="admin-auth-header">
            <h2 class="admin-auth-title" id="adminAuthTitle">Yönetici Girişi</h2>
          </div>
          <div class="admin-auth-body">
            <div class="admin-auth-error" id="adminAuthError"></div>
            <input class="admin-auth-input" id="adminAuthUser" type="text" placeholder="Kullanıcı adı" autocomplete="username" />
            <input class="admin-auth-input" id="adminAuthPass" type="password" placeholder="Şifre" autocomplete="current-password" />
          </div>
          <div class="admin-auth-actions">
            <button class="admin-auth-btn admin-auth-btn-secondary" id="adminAuthCancel" type="button">İptal</button>
            <button class="admin-auth-btn admin-admin-btn-primary" id="adminAuthLogin" type="button">Giriş yap</button>
          </div>
        </div>
      `;
      console.info('[AdminAuth] Appending overlay to body');
      document.body.appendChild(overlay);
      console.info('[AdminAuth] Overlay appended, children count:', document.body.children.length);

      const $u = overlay.querySelector('#adminAuthUser');
      const $p = overlay.querySelector('#adminAuthPass');
      const $err = overlay.querySelector('#adminAuthError');
      const $login = overlay.querySelector('#adminAuthLogin');
      const $cancel = overlay.querySelector('#adminAuthCancel');

      function showError(msg){
        $err.textContent = msg || 'Giriş başarısız';
        $err.style.display = 'block';
      }

      async function doLogin(){
        $err.style.display = 'none';
        $login.disabled = true;
        try{
          const res = await verify($u.value, $p.value);
          if(res.ok){
            setSession(res.admin.username);
            document.body.removeChild(overlay);
            resolve(true);
          } else {
            showError(res.error);
            $login.disabled = false;
          }
        } catch(e){
          showError('Bir hata oluştu');
          $login.disabled = false;
        }
      }

      $login.addEventListener('click', doLogin);
      $cancel.addEventListener('click', () => {
        // Keep overlay; require login
        showError('Devam etmek için giriş yapmalısınız');
      });
      $u.addEventListener('keydown', e=>{ if(e.key==='Enter'){ $p.focus(); }});
      $p.addEventListener('keydown', e=>{ if(e.key==='Enter'){ doLogin(); }});
      setTimeout(()=> $u.focus(), 0);
    });
  }

  async function protectPage(options){
    console.info('[AdminAuth] protectPage called with options:', options);
    // Mark that a page-initiated protection was requested (for auto-guard coordination)
    try { window.__ADMIN_AUTH_PROTECT_CALLED = true; } catch(_) {}
    const force = options && options.forcePrompt;
    if (force) {
      console.info('[AdminAuth] Force re-login requested, clearing session');
      clearSession();
      return await showOverlay();
    }
    const sess = getSession();
    if(sess) {
      console.info('[AdminAuth] Valid session found, username:', sess.username);
      // Ensure page content is visible (remove any blocking overlays)
      try {
        const existingOverlay = document.querySelector('.admin-auth-overlay');
        if (existingOverlay) {
          console.info('[AdminAuth] Removing existing overlay');
          existingOverlay.remove();
        }
      } catch(_) {}
      return true;
    }
    console.info('[AdminAuth] No valid session, showing overlay');
    return await showOverlay();
  }

  function isAuthenticated(){
    return !!getSession();
  }

  // Logout fonksiyonu - global olarak kullanılabilir
  function logoutAdmin() {
    clearSession();
    // Mevcut sayfayı yenile veya login sayfasına yönlendir
    window.location.reload();
  }

  // requireAdminAuth - Sayfa yüklendiğinde auth kontrolü yapar
  function requireAdminAuth() {
    if (!isAuthenticated()) {
      protectPage();
    }
  }

  window.AdminAuth = { protectPage, getSession, clearSession, isAuthenticated, sha256Hex, logoutAdmin, requireAdminAuth };
  
  // Auto-guard: If an admin page forgets to call protectPage (or JS error prevents it),
  // ensure the login overlay still appears. This runs after DOM is ready and only on admin_* pages.
  document.addEventListener('DOMContentLoaded', () => {
    console.info('[AdminAuth] DOMContentLoaded fired, checking auto-guard');
    try {
      const path = (location.pathname || '').toLowerCase();
      console.info('[AdminAuth] Current path:', path);
      const isAdminPage = /admin_(patients|settings|chat)\.html$/.test(path);
      console.info('[AdminAuth] Is admin page?', isAdminPage);
      if (!isAdminPage) return;
      
      // Session kontrolü debug
      const currentSession = getSession();
      console.info('[AdminAuth] Current session:', currentSession);
      console.info('[AdminAuth] localStorage admin_session_v1:', localStorage.getItem('admin_session_v1'));
      
      // Give the page a brief chance to call protectPage itself
      setTimeout(() => {
        console.info('[AdminAuth] Auto-guard timeout fired. __ADMIN_AUTH_PROTECT_CALLED=', !!window.__ADMIN_AUTH_PROTECT_CALLED, 'session=', !!getSession());
        try {
          if (!window.__ADMIN_AUTH_PROTECT_CALLED && !getSession()) {
            console.info('[AdminAuth] Auto-guard triggering showOverlay');
            showOverlay();
          } else {
            console.info('[AdminAuth] Auth OK - Session active:', getSession()?.username);
          }
        } catch(e) { console.error('[AdminAuth] Auto-guard error:', e); }
      }, 50);
    } catch(e) { console.error('[AdminAuth] DOMContentLoaded error:', e); }
  });
})();
