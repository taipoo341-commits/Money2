const CACHE_PREFIX = "personal-overtime-shell-";
const CACHE_NAME = "personal-overtime-shell-v41";
const APP_ROOT = new URL("./", self.location.href);
const APP_SHELL = [
  "./index.html",
  "./privacy.html",
  "./terms.html",
  "./RemachineScript_Personal_Use.ttf",
  "./data/dgpa_closures.json",
  "./manifest.json?v=41",
  "./icon-144.png?v=41",
  "./icon-192.png?v=41",
  "./icon-512.png?v=41",
  "./icon-maskable-192.png?v=41",
  "./icon-maskable-512.png?v=41"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL.map(function (url) {
          return new Request(new URL(url, APP_ROOT), { cache: "reload" });
        }));
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

async function storeResponse(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch (error) {
    console.warn("Service Worker 快取寫入失敗", error);
  }
}

async function networkFirst(request, fallbackUrl) {
  const cacheKey = fallbackUrl || request;
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) await storeResponse(cacheKey, response.clone());
    return response;
  } catch (error) {
    return (await caches.match(cacheKey, { cacheName: CACHE_NAME }).catch(function () { return null; })) || Response.error();
  }
}

// Manifest 與圖示線上優先取得最新內容，離線才使用本版本的快取。
function isInstallAsset(url) {
  return /\/manifest\.json$/.test(url.pathname) || /\/icon[^/]*\.png$/.test(url.pathname);
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== APP_ROOT.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  if (request.mode === "navigate") {
    const cacheUrl = url.pathname === APP_ROOT.pathname ? new URL("./index.html", APP_ROOT).href : url.origin + url.pathname;
    event.respondWith(networkFirst(request, cacheUrl));
    return;
  }
  if (isInstallAsset(url)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (url.pathname.endsWith("/data/dgpa_closures.json")) {
    event.respondWith(networkFirst(request, new URL("./data/dgpa_closures.json", APP_ROOT).href));
    return;
  }
  event.respondWith(
    caches.match(request, { cacheName: CACHE_NAME }).catch(function () { return null; }).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(async function (response) {
        if (response && response.ok) await storeResponse(request, response.clone());
        return response;
      });
    })
  );
});
