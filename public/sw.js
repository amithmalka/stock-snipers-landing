// The version below is rewritten on every build by scripts/patch-html.js
// to ensure each deploy ships a brand-new SW that auto-activates and
// reloads existing PWAs to the latest bundle.
const CACHE_NAME = 'siel-pwa-v23';
const SHELL = ['/favicon.ico', '/manifest.json', '/assets/icon.png', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Wipe all old caches
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    // Take control of all open pages — but DO NOT force-reload them.
    // Force-reload mid-init wipes Supabase auth state and causes the
    // "first-open broken, reopen works" pattern. The page handles reload
    // via the controllerchange listener in patch-html.js, which only
    // fires when safe.
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Navigation: network-first with a generous 5-second timeout so users
  // on slower networks still get the freshest HTML (and therefore the
  // latest JS bundle hash) instead of falling back to cached HTML which
  // references an older bundle. Cache only as fallback.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const network = await Promise.race([
          fetch(req, { cache: 'no-store' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('nav-timeout')), 5000)),
        ]);
        if (network && network.ok) {
          cache.put('/index.html', network.clone());
          return network;
        }
        throw new Error('bad response');
      } catch {
        const cached = await cache.match('/index.html');
        if (cached) return cached;
        return new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Hashed assets — cache-first (immutable filenames)
  const isHashedAsset =
    url.pathname.startsWith('/_expo/') ||
    /\/assets\/[A-Fa-f0-9]{8,}/.test(url.pathname) ||
    /-[A-Fa-f0-9]{8,}\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp)$/i.test(url.pathname);

  if (isHashedAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((response) => {
            if (response && response.ok) cache.put(req, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Everything else — network-first, cache fallback
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const network = await fetch(req);
      if (network && network.ok) cache.put(req, network.clone());
      return network;
    } catch {
      const cached = await cache.match(req);
      if (cached) return cached;
      throw new Error('offline');
    }
  })());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'SIEL', {
      body: data.body || '',
      icon: '/assets/icon.png',
      badge: '/assets/icon.png',
      dir: 'rtl',
      lang: 'he',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
