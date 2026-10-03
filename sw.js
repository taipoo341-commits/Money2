const CACHE_NAME = "personal-overtime-shell-v40";
const APP_SHELL = [
  "./",
  "./index.html",
  "./privacy.html",
  "./terms.html",
  "./RemachineScript_Personal_Use.ttf",
  "./data/dgpa_closures.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return Promise.allSettled(APP_SHELL.map(function (url) { return cache.add(url); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); })); })
      .then(function () { return self.clients.claim(); })
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (fallbackUrl ? await cache.match(fallbackUrl) : null) || Response.error();
  }
}

// 安裝用的 manifest 與圖示一律不經過快取：Chrome 安裝時會把自己下載到的圖示
// 與 Google 伺服器重新抓到的圖示比對，若這裡回傳舊快取，兩邊不一致就會安裝失敗。
function isInstallAsset(url) {
  return /\/manifest\.json$/.test(url.pathname) || /\/icon[^/]*\.png$/.test(url.pathname);
}

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (isInstallAsset(url)) return;
  if (url.pathname.endsWith("/data/dgpa_closures.json")) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) caches.open(CACHE_NAME).then(function (cache) { cache.put(request, response.clone()); });
        return response;
      });
    })
  );
});
