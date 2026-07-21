/* BlackrockReserve service worker — static precache + safe runtime caching */
const CACHE_VERSION = "br-pwa-v9";
const ICON_QUERY = "?v=9";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline";
/** Safari on poor networks can hang indefinitely without a timeout. */
const NETWORK_TIMEOUT_MS = 12_000;

const PRECACHE_URLS = [
  "/offline",
  `/favicon.svg${ICON_QUERY}`,
  `/apple-icon.png${ICON_QUERY}`,
  `/apple-touch-icon.png${ICON_QUERY}`,
  `/icons/icon-192.png${ICON_QUERY}`,
  `/icons/icon-512.png${ICON_QUERY}`,
  `/icons/icon-maskable-192.png${ICON_QUERY}`,
  `/icons/icon-maskable-512.png${ICON_QUERY}`,
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("br-pwa-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isNextStatic(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isAuthNavigation(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin")
  );
}

function isDiagnosticsPath(pathname) {
  return pathname === "/connectivity-check" || pathname.startsWith("/api/ping") || pathname.startsWith("/api/diagnostics");
}

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs ?? NETWORK_TIMEOUT_MS);
  try {
    return await fetch(new Request(request, { signal: controller.signal }));
  } finally {
    clearTimeout(id);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (isApiRequest(url) || isDiagnosticsPath(url.pathname)) {
    return;
  }

  if (isNextStatic(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.match(/\.(svg|png|jpg|jpeg|webp|woff2?|ico)$/)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (isNavigationRequest(request)) {
    if (isAuthNavigation(url.pathname) || url.pathname === "/" || url.pathname === "/connectivity-check") {
      event.respondWith(networkOnlyWithTimeout(request));
      return;
    }
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

async function networkOnlyWithTimeout(request) {
  return fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetchWithTimeout(request, NETWORK_TIMEOUT_MS)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "BlackrockReserve", body: "You have a new notification." };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: `/apple-icon.png?v=8`,
      badge: `/apple-icon.png?v=8`,
      data: payload.data ?? {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
