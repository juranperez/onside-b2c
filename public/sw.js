// public/sw.js
// Push-only service worker. Deliberately NO fetch/cache handlers — caching the app
// would serve stale pages. Handles incoming pushes + notification clicks.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const title = data.title || "Onside";
  const options = {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
