const CACHE_PREFIX = "personal-overtime-shell-";
const CACHE_NAME = CACHE_PREFIX + "v41";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./privacy.html",
  "./terms.html",
  "./RemachineScript_Personal_Use.ttf",
  "./data/dgpa_closures.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (key) { return key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); })); })
      .then(function () { return self.clients.claim(); })
  );
});

async function putCachedResponse(cache, key, response) {
  try {
    await cache.put(key, response.clone());
  } catch (error) {
    console.warn("離線快取更新失敗。", error);
  }
}

async function networkFirst(request, fallbackUrl, cacheUrl) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = cacheUrl || request;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await putCachedResponse(cache, cacheKey, response);
      return response;
    }
    return (await cache.match(cacheKey)) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || response;
  } catch (error) {
    return (await cache.match(cacheKey)) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) await putCachedResponse(cache, request, response);
    return response;
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    const appRoot = new URL("./", self.location.href);
    const appIndex = new URL("./index.html", self.location.href);
    const isHomepage = url.pathname === appRoot.pathname || url.pathname === appIndex.pathname;
    event.respondWith(networkFirst(request, "./index.html", isHomepage ? "./index.html" : null));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/data/dgpa_closures.json")) {
    event.respondWith(networkFirst(request, "./data/dgpa_closures.json", "./data/dgpa_closures.json"));
    return;
  }
  event.respondWith(cacheFirst(request));
});
