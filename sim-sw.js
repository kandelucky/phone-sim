// sim-sw.js: the service worker behind Open app → Choose folder and Choose APK.
//
// A web page may read a folder the user picks, but it cannot put that folder's files into an iframe:
// the browser hides the folder's path, and relative links (style.css, img/a.png, fetch("data.json"))
// would have nowhere to go. So the app is served from a made-up address under this folder:
//
//   local/<id>/index.html   <id> = which simulator tab picked the folder (a tab may have its own)
//
// For every request under local/ this worker asks the simulator tabs for the file; the tab that owns <id>
// reads it from the folder (or from the APK, unpacking that one file) and sends the bytes back.
// Every request reads the file again, so ↻ shows edits.
// Nothing leaves the computer: the files go from the folder to the tab to this worker to the phone.
//
// An HTML page without sim-bridge.js gets it added at the top of <head>. A missing sim-bridge.js
// (the app links one but the folder has none) is served from the simulator's own folder.
// Service workers run only on http(s) pages (the live demo, a local server), not from file://.
//
// Its second job: a copy of the simulator's own files, so it opens offline, installed as an app (Phone Sim) or not.
// sim.html registers this worker on every visit for that. Network first: online you always get the newest files and
// the copy is refreshed; offline the copy answers. Only GET requests inside this folder; never local/ (a chosen folder
// or an unpacked APK is read fresh every time) and never another site (an app on localhost, a CDN).
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
