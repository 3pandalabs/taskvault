// TaskVault service worker. It exists only so the app is installable as a PWA.
//
// It deliberately caches NOTHING: no app pages, no API responses, no offline
// mode. Household paperwork must never sit in a device cache, and a stale
// "what's next" list is worse than an honest network error. Every request
// passes straight through to the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // No respondWith: the browser handles the request normally.
});
