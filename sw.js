/* Minimal service worker for PWA installability.
   Shell assets are cached; /data/ CSV requests are never intercepted. */
const CACHE_NAME = "flhs-help-shell-v85";

const SHELL_URLS = [
  "./",
  "./index.html",
  "./pages/homeroom.html",
  "./pages/calendar.html",
  "./pages/resources.html",
  "./pages/teacher-resources.html",
  "./pages/upload.html",
  "./pages/media.html",
  "./pages/counselors.html",
  "./pages/administrators.html",
  "./pages/map.html",
  "./pages/meet-rj.html",
  "./pages/laptop-checkout.html",
  "./pages/laptop-desk.html",
  "./pages/student-locator.html",
  "./js/home.js",
  "./js/laptop-checkout.js",
  "./js/laptop-desk.js",
  "./js/flhs-db.js",
  "./js/supabase-config.js",
  "./js/calendar.js",
  "./js/map.js",
  "./js/media.js",
  "./manifest.webmanifest",
  "./assets/brand/logo.png",
  "./assets/maps/campus.png",
  "./assets/maps/hotspots.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png",
  "./assets/icons/apple-touch-icon.png",
];

function isDataRequest(url) {
  return url.pathname.includes("/data/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* ignore individual precache failures */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isDataRequest(url)) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback =
            (await caches.match("./index.html")) ||
            (await caches.match("./"));
          if (fallback) return fallback;
        }
        throw new Error("Offline and not cached");
      }
    })()
  );
});
