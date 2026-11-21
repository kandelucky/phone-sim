// sim-sw.js: the service worker behind Open app → Choose folder / Choose APK, and the simulator's offline copy.
//
// 1. A chosen folder or APK: a page cannot put a picked folder into an iframe (no path, so relative links break).
//    So the app is served from a made-up address, local/<id>/index.html (<id> = the simulator tab that picked it).
//    Each request under local/ asks the tabs for the file; the owner reads it from the folder / APK and sends the bytes.
//    Read fresh every time, so ↻ shows edits; nothing leaves the computer.
//    An HTML page without sim-bridge.js gets it at the top of <head>; a missing sim-bridge.js comes from the simulator's folder.
// 2. Offline: the simulator's own files (GET, this folder; never local/ or another site), network first, the copy when offline.
//    sim.html registers this worker on every visit; it works for the installed app (Phone Sim) too.
// Service workers run only on http(s) (the live demo, a local server), not on file://.
"use strict";

var BASE = new URL("local/", self.registration.scope);            // where the made-up addresses start
var BRIDGE = new URL("sim-bridge.js", self.registration.scope);   // the simulator's own bridge

var TYPES = {
  html: "text/html", htm: "text/html", js: "text/javascript", mjs: "text/javascript", css: "text/css",
  json: "application/json", map: "application/json", txt: "text/plain", xml: "application/xml", wasm: "application/wasm",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
  svg: "image/svg+xml", ico: "image/x-icon",
  mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac",
  mp4: "video/mp4", webm: "video/webm",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf"
};
function typeOf(file) {
  var t = TYPES[(file.split(".").pop() || "").toLowerCase()] || "application/octet-stream";
  return /^text\/|javascript|json|xml|svg/.test(t) ? t + "; charset=utf-8" : t;
}

// A new version takes over at once, so a changed sim-sw.js does not wait for every tab to close
self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== BASE.origin || url.pathname.indexOf(BASE.pathname) !== 0) { offline(e, url); return; }   // not local/
  var rest = url.pathname.slice(BASE.pathname.length);                                    // "<id>/img/a.png"
  try { rest = decodeURIComponent(rest); } catch (err) {}                                 // a bad %-escape: as it is (a 404)
  var cut = rest.indexOf("/");
  var id = cut < 0 ? rest : rest.slice(0, cut);
  var file = cut < 0 ? "" : rest.slice(cut + 1);
  if (file === "" || file.slice(-1) === "/") file += "index.html";
  e.respondWith(serve(id, file, e.request));
});

function serve(id, file, request) {
  return ask(id, file).then(function (body) {
    if (!body) {
      if (/(^|\/)sim-bridge\.js$/.test(file)) return fetch(BRIDGE);
      return new Response("Not in the chosen folder or APK: " + file, { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    var type = typeOf(file);
    if (request.mode === "navigate" && type.indexOf("text/html") === 0) body = withBridge(new TextDecoder().decode(body));
    return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
  });
}

// Asks every simulator tab; the one that owns <id> answers with the bytes (or null: no such file).
// Other tabs answer "not mine"; a page that does not answer at all (not a simulator) is skipped after 3 s.
function ask(id, file) {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    list = list.filter(function (c) { return new URL(c.url).pathname.indexOf(BASE.pathname) !== 0; });   // not the apps themselves
    return new Promise(function (done) {
      var left = list.length;
      if (!left) { done(null); return; }
      function next() { if (--left === 0) done(null); }
      list.forEach(function (client) {
        var ch = new MessageChannel(), over = false;
        var timer = setTimeout(function () { if (!over) { over = true; next(); } }, 3000);
        ch.port1.onmessage = function (m) {
          if (over) return;
          over = true; clearTimeout(timer);
          if (m.data && m.data.mine) done(m.data.body); else next();
        };
        client.postMessage({ type: "sim-file", id: id, file: file }, [ch.port2]);
      });
    });
  });
}

// ---- Offline copy (see the header): network first, the copy when the network fails ----
var SCOPE = new URL(self.registration.scope);
var CACHE = "sim-offline " + SCOPE.pathname;                       // one copy per simulator folder on this site
function offline(e, url) {
  var req = e.request;
  if (req.method !== "GET" || url.origin !== SCOPE.origin || url.pathname.indexOf(SCOPE.pathname) !== 0) return;   // the network as usual
  if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;                                          // a DevTools quirk
  e.respondWith(fetch(req).then(function (res) {
    if (res.status === 200 && res.type === "basic") {                // not a part (206, sound / video) and not an error page
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { return c.put(req, copy); }).catch(function () {});   // full disk: no copy, still works
    }
    return res;
  }, function (err) {
    // offline: the copy; a page with another ?app= is still the same sim.html
    return caches.open(CACHE).then(function (c) { return c.match(req, { ignoreSearch: req.mode === "navigate" }); })
      .then(function (hit) { if (hit) return hit; throw err; });
  }));
}

// sim-bridge.js first in <head>: it must patch sound and touch before the app's own scripts run
function withBridge(html) {
  if (/sim-bridge\.js/.test(html)) return html;
  var tag = '<script src="' + BRIDGE.pathname + '"></script>';
  var m = html.match(/<head(\s[^>]*)?>/i) || html.match(/<html(\s[^>]*)?>/i);           // not <header>
  return m ? html.replace(m[0], m[0] + tag) : tag + html;
}
