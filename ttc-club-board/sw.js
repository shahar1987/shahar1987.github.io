// Network first so parents always see fresh results; the cache only answers when there is no signal.
const CACHE = "ttc-v14";
const SHELL = ["./", "index.html", "app.js", "manifest.json", "icon-192.png", "icon-512.png", "logo.png", "mark.png", "data.json", "posts.json"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const key = new URL(req.url); key.search = "";
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key.href, copy)); }
      return res;
    }).catch(() => caches.match(key.href).then(m => m || caches.match("index.html")))
  );
});

// Push from the club (FCM data message): show it, and open the app on tap.
self.addEventListener("push", e => {
  let d = {};
  try { const p = e.data ? e.data.json() : {}; d = p.data || p; } catch (err) {}
  const title = String(d.title || "מועדון טניס שולחן מבואות החרמון").slice(0, 60);
  e.waitUntil(self.registration.showNotification(title, {
    body: String(d.body || "").slice(0, 180), icon: "icon-192.png", badge: "icon-192.png", lang: "he", dir: "rtl",
    data: { url: (() => { try { const u = new URL(d.url); return u.origin === "https://shahar1987.github.io" && u.pathname.startsWith("/ttc-club-board/") ? u.href : "./"; } catch (e) { return "./"; } })() }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.startsWith(self.registration.scope));
    return w ? w.focus().then(c => c.navigate ? c.navigate(url) : c) : clients.openWindow(url);
  }));
});
