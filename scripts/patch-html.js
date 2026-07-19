const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const installPromptStyle = `<style>
  #siel-install-prompt {
    position: fixed;
    inset: 0;
    z-index: 999998;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    display: none;
    align-items: flex-end;
    justify-content: center;
    padding: 16px;
    animation: siel-fadein 0.25s ease-out;
    font-family: system-ui, -apple-system, sans-serif;
  }
  @media (min-width: 640px) { #siel-install-prompt { align-items: center; } }
  #siel-install-prompt.show { display: flex; }
  @keyframes siel-fadein { from {opacity:0;} to {opacity:1;} }
  @keyframes siel-slideup { from {transform:translateY(20px);opacity:0;} to {transform:translateY(0);opacity:1;} }
  #siel-install-card {
    background: #FFFFFF;
    border-radius: 24px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    max-width: 420px;
    width: 100%;
    padding: 24px;
    direction: rtl;
    animation: siel-slideup 0.3s ease-out;
  }
  #siel-install-card h2 { font-size: 18px; font-weight: 700; color: #2A1F17; margin: 12px 0 4px; text-align: center; }
  #siel-install-card .siel-ip-sub { font-size: 14px; color: #9A8878; text-align: center; margin-bottom: 20px; }
  #siel-install-card .siel-ip-icon { width: 56px; height: 56px; background: rgba(196,132,154,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto; }
  #siel-install-card .siel-ip-step { display: flex; gap: 12px; align-items: start; font-size: 14px; color: #2A1F17; line-height: 1.5; margin-bottom: 10px; }
  #siel-install-card .siel-ip-step-num { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: #C4849A; color: #FFF; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  #siel-install-card .siel-ip-buttons { display: flex; gap: 8px; margin-top: 20px; }
  #siel-install-card .siel-ip-btn { flex: 1; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; }
  #siel-install-card .siel-ip-btn-secondary { background: transparent; border: 1px solid #E6DDD1; color: #9A8878; }
  #siel-install-card .siel-ip-btn-primary { background: #C4849A; color: #FFF; }
</style>`;

const installPromptScript = `<script>
(function() {
  var DISMISS_KEY = 'siel.installPromptDismissed';
  var DISMISS_DAYS = 7;
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function wasDismissedRecently() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      var t = parseInt(raw, 10);
      if (!t) return false;
      var daysAgo = (Date.now() - t) / (1000 * 60 * 60 * 24);
      return daysAgo < DISMISS_DAYS;
    } catch(e) { return false; }
  }
  function detectDevice() {
    var ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
  }
  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch(e){}
    var el = document.getElementById('siel-install-prompt');
    if (el) el.classList.remove('show');
  }
  function steps(device) {
    if (device === 'ios') return [
      'לחצו על כפתור <strong>השיתוף</strong> (⬆️) בתחתית הדפדפן',
      'גוללו ובחרו <strong>״הוספה למסך הבית״</strong>',
      'לחצו <strong>״הוסף״</strong> בפינה הימנית העליונה',
      'סגרו את ספארי ופתחו את האייקון מהמסך הבית ✨'
    ];
    if (device === 'android') return [
      'לחצו על <strong>תפריט שלוש נקודות</strong> בפינה (⋮)',
      'בחרו <strong>״הוסף למסך הבית״</strong>',
      'אישור — האפליקציה תופיע כאייקון נפרד ✨'
    ];
    return [
      'לחצו על אייקון <strong>ההתקנה</strong> בקצה שורת הכתובת',
      'אשרו <strong>״התקן״</strong>',
      'האפליקציה תיפתח כחלון נפרד עצמאי ✨'
    ];
  }
  function showPrompt() {
    if (isStandalone() || wasDismissedRecently()) return;
    var device = detectDevice();
    var stepsHtml = steps(device).map(function(s, i) {
      return '<div class="siel-ip-step"><span class="siel-ip-step-num">' + (i+1) + '</span><span>' + s + '</span></div>';
    }).join('');
    var div = document.createElement('div');
    div.id = 'siel-install-prompt';
    div.innerHTML = '<div id="siel-install-card">' +
      '<div class="siel-ip-icon">📱</div>' +
      '<h2>קבעו את SIEL במסך הבית</h2>' +
      '<p class="siel-ip-sub">פתיחה מהירה, התראות, בלי חיפושים</p>' +
      stepsHtml +
      '<div class="siel-ip-buttons">' +
        '<button class="siel-ip-btn siel-ip-btn-secondary" id="siel-ip-later">אולי אחר כך</button>' +
        '<button class="siel-ip-btn siel-ip-btn-primary" id="siel-ip-ok">הבנתי, תודה</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(div);
    div.classList.add('show');
    document.getElementById('siel-ip-later').onclick = dismiss;
    document.getElementById('siel-ip-ok').onclick = dismiss;
    div.onclick = function(e) { if (e.target === div) dismiss(); };
  }
  setTimeout(showPrompt, 3000);
})();
</script>`;

const headInjection = [
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="apple-mobile-web-app-title" content="SIEL">',
  '<link rel="apple-touch-icon" href="/assets/icon.png">',
  '<link rel="manifest" href="/manifest.json">',
  `<style>
    html, body {
      background-color: #F3EDE4;
      margin: 0;
    }
  </style>`,
  `<style>
    #siel-splash {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, #FDF8F5 0%, #F4DDE5 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: opacity 0.6s ease-out;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #siel-splash.siel-fade { opacity: 0; pointer-events: none; }
    #siel-splash .siel-logo {
      font-size: 3.25rem;
      font-weight: 700;
      letter-spacing: 0.3em;
      color: #7B4E2D;
      margin-bottom: 0.5rem;
    }
    #siel-splash .siel-tagline {
      font-size: 0.7rem;
      color: #B08B7E;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      margin-bottom: 2rem;
    }
    #siel-splash .siel-dots { display: flex; gap: 10px; }
    #siel-splash .siel-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #C4849A;
      animation: siel-pulse 1.2s ease-in-out infinite;
    }
    #siel-splash .siel-dot:nth-child(2) { animation-delay: 0.2s; }
    #siel-splash .siel-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes siel-pulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
      40% { opacity: 1; transform: scale(1); }
    }
  </style>`,
].join('\n');

const splashHtml = `<div id="siel-splash" aria-hidden="true">
  <div class="siel-logo">SIEL</div>
  <div class="siel-tagline">וסת · תפילה · יופי</div>
  <div class="siel-dots"><div class="siel-dot"></div><div class="siel-dot"></div><div class="siel-dot"></div></div>
</div>
<script>
(function() {
  function hideSplash() {
    var s = document.getElementById('siel-splash');
    if (!s) return;
    s.classList.add('siel-fade');
    setTimeout(function() { if (s.parentNode) s.parentNode.removeChild(s); }, 600);
  }
  function waitForApp() {
    // Wait until React Native Web has mounted real content
    var root = document.getElementById('root');
    if (root && root.children && root.children.length > 0) {
      setTimeout(hideSplash, 400);
    } else {
      setTimeout(waitForApp, 100);
    }
  }
  if (document.readyState === 'complete') waitForApp();
  else window.addEventListener('load', waitForApp);
  // Safety fallback: never block forever
  setTimeout(hideSplash, 8000);
})();
</script>`;

const swScript = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      function checkUpdate() { reg.update().catch(function(){}); }
      // Aggressive update checks
      checkUpdate();
      setInterval(checkUpdate, 30000);
      // Also check whenever the page becomes visible (returning from background)
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') checkUpdate();
      });
      window.addEventListener('pageshow', checkUpdate);
      window.addEventListener('focus', checkUpdate);

      reg.addEventListener('updatefound', function () {
        var newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', function () {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            newSW.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
      var reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    }).catch(function () {});
  });
}
</script>`;

let patched = html.replace('</head>', `${headInjection}\n${installPromptStyle}\n</head>`);
// Force viewport-fit=cover for iOS safe-area insets to work in PWA mode
patched = patched.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />'
);
patched = patched.replace('<body>', `<body>\n${splashHtml}`);
patched = patched.replace('</body>', `${swScript}\n${installPromptScript}\n</body>`);

fs.writeFileSync(path.join(DIST, 'index.html'), patched);

// Copy sw.js and stamp in a unique build ID so every deploy creates a
// brand-new SW (different cache name → forces reinstall + claim → page
// auto-reloads to the latest bundle for every user on next open).
const BUILD_ID = String(Date.now());
for (const file of ['sw.js', 'manifest.json']) {
  const src = path.join(PUBLIC_DIR, file);
  const dst = path.join(DIST, file);
  if (!fs.existsSync(src)) continue;
  if (file === 'sw.js') {
    let swContent = fs.readFileSync(src, 'utf-8');
    swContent = swContent.replace(/'siel-pwa-v[^']+'/, `'siel-pwa-${BUILD_ID}'`);
    fs.writeFileSync(dst, swContent);
  } else {
    fs.copyFileSync(src, dst);
  }
}

const distAssets = path.join(DIST, 'assets');
if (!fs.existsSync(distAssets)) fs.mkdirSync(distAssets, { recursive: true });
for (const file of ['icon.png', 'adaptive-icon.png', 'splash-icon.png', 'favicon.png']) {
  const src = path.join(ASSETS_DIR, file);
  const dst = path.join(distAssets, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, dst);
}

console.log('PWA patch applied: SW registration + manifest + apple-touch-icon + sw.js + manifest.json + icons');
