"use strict";
(() => {
  // src/sw.ts
  var sw = self;
  var CACHE_NAME = "todo-pwa-v1";
  var urlsToCache = [
    "/",
    "/index.html",
    "/manifest.webmanifest"
  ];
  sw.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)).then(() => sw.skipWaiting())
    );
  });
  sw.addEventListener("activate", (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )).then(() => sw.clients.claim())
    );
  });
  sw.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        return new Response("Offline", { status: 404 });
      })
    );
  });
})();
