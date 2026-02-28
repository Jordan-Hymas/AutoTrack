const CACHE_NAME = "autotrack-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];
const HIDDEN_NOTIFICATION_TITLE = "\u2060";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener("push", (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: HIDDEN_NOTIFICATION_TITLE, body: event.data?.text() || "Maintenance reminder available." };
    }
  })();

  const title = HIDDEN_NOTIFICATION_TITLE;
  const options = {
    body: payload.body || "Maintenance reminder available.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: payload.url || "/"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const resolvedUrl = new URL(targetUrl, self.location.origin).href;
      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });

      for (const client of windowClients) {
        let clientOrigin = "";
        try {
          clientOrigin = new URL(client.url).origin;
        } catch {
          clientOrigin = "";
        }
        if (clientOrigin !== self.location.origin) continue;

        if ("navigate" in client && client.url !== resolvedUrl) {
          try {
            await client.navigate(resolvedUrl);
          } catch {
            // Ignore navigate errors and still try to focus.
          }
        }

        if ("focus" in client) {
          await client.focus();
          return;
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(resolvedUrl);
      }
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Future hook: re-subscribe and sync new subscription with backend.
  event.waitUntil(Promise.resolve());
});

self.addEventListener("message", (event) => {
  const payload = event.data || {};
  if (payload.type !== "DEV_TEST_NOTIFICATION") return;
  const title = HIDDEN_NOTIFICATION_TITLE;
  const options = {
    body: payload.body || "Maintenance reminder available.",
    icon: payload.icon || "/icons/icon-192.png",
    badge: payload.icon || "/icons/icon-192.png",
    data: {
      url: payload.url || "/"
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
