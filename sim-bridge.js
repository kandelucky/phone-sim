// sim-bridge.js — connects an app page to sim.html (phone frame + console + theme picker).
// Include it once in the app's <head>: <script src="sim-bridge.js"></script>
// Opened on its own (a real phone, an APK) the page has no parent frame and every call is a no-op.
// The same inside any other frame (itch.io and other sites that embed a web build): the bridge only turns on
// in the simulator's phone, whose frame is named "simscreen". So sim.html and sim-bridge.js are updated together.
// file:// pages cannot reach each other directly, so everything goes through postMessage.
(function () {
  "use strict";
  var hasParent = window.parent && window.parent !== window && window.name === "simscreen";
  function send(msg) { if (hasParent) window.parent.postMessage(msg, "*"); }

  // log("text") → one line in the simulator console. HTML is allowed: log("<b>buy</b> 50").
  window.log = function (msg) { send({ type: "log", msg: String(msg) }); };

  // simScreen("home") → console line "snapshot: screen home"; call it whenever the visible screen changes.
  window.simScreen = function (name) { send({ type: "snapshot", screen: name }); };

  // Uncaught errors land in the console in red, so a broken click is not silent.
  window.addEventListener("error", function (e) {
    send({ type: "error", msg: e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "") });
  });
  // A rejected Promise nobody caught is an error too.
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    send({ type: "error", msg: "Promise: " + (r instanceof Error ? r.name + ": " + r.message : fmt(r, 0)) });
  });

  // console.log / info / debug / warn / error → also a line in the simulator console (the browser's own console still gets it).
  // Only inside the simulator; on a phone console stays untouched. Objects become short readable text.
  function fmt(v, depth) {
    if (typeof v === "string") return depth ? JSON.stringify(v) : v;
    if (typeof v === "function") return "ƒ " + (v.name || "anonymous") + "()";
    if (v === null || typeof v !== "object") return String(v);               // number, boolean, undefined, symbol, bigint
    if (v instanceof Error) return v.name + ": " + v.message;
    if (typeof Element !== "undefined" && v instanceof Element) {
      var cls = typeof v.className === "string" && v.className.trim() ? "." + v.className.trim().split(/\s+/).join(".") : "";
      return "<" + v.tagName.toLowerCase() + (v.id ? "#" + v.id : "") + cls + ">";
    }
    if (v instanceof Map || v instanceof Set) return (v instanceof Map ? "Map(" : "Set(") + v.size + ")";
    if (depth > 2) return Array.isArray(v) ? "[…]" : "{…}";
    try {
      if (Array.isArray(v)) return "[" + v.slice(0, 20).map(function (x) { return fmt(x, depth + 1); }).join(", ") + (v.length > 20 ? ", … (" + v.length + ")" : "") + "]";
      var keys = Object.keys(v);
      if (!keys.length) return "{}";
      return "{ " + keys.slice(0, 20).map(function (k) { return k + ": " + fmt(v[k], depth + 1); }).join(", ") + (keys.length > 20 ? ", …" : "") + " }";
    } catch (err) { return String(v); }
  }
  // console.log("%s has %d", a, b): the format codes are filled in as the browser does; %c (CSS) is dropped
  function fmtArgs(args) {
    args = Array.prototype.slice.call(args);
    var out = [];
    if (typeof args[0] === "string" && args.length > 1 && /%[sdifoOc]/.test(args[0])) {
      var i = 1;
      out.push(args[0].replace(/%([sdifoOc%])/g, function (m, c) {
        if (c === "%") return "%";
        if (i >= args.length) return m;
        var a = args[i++];
        if (c === "c") return "";
        if (c === "d" || c === "i") return String(parseInt(a, 10));
        if (c === "f") return String(parseFloat(a));
        return fmt(a, c === "s" ? 0 : 1);
      }));
      args = args.slice(i);
    }
    args.forEach(function (a) { out.push(fmt(a, 0)); });
    return out.join(" ");
  }
  if (hasParent && window.console) ["log", "info", "debug", "warn", "error"].forEach(function (level) {
    var orig = console[level];
    if (typeof orig !== "function") return;
    console[level] = function () {
      try { send({ type: "console", level: level, text: fmtArgs(arguments).slice(0, 2000) }); } catch (err) {}
      return orig.apply(console, arguments);
    };
  });

  // ---- Ads: a stand-in for the AdMob plugin (@capacitor-community/admob 8), only inside the simulator ----
  // window.simAdMob has the plugin's calls and events (showBanner, prepareInterstitial, showInterstitial, addListener…).
  // Each call goes to the simulator, which draws a stand-in ad over the app and answers the way the plugin does.
  // Banner and interstitial only; consent answers as for a user outside the EEA; any other call fails.
  // The app picks it with one line, so the same code runs on a phone (the native plugin) and here:
  //   var AdMob = window.Capacitor && Capacitor.isNativePlatform() ? Capacitor.Plugins.AdMob : window.simAdMob;
  // window.Capacitor itself is not touched: an app that checks it would think it runs on a phone.
  var adWait = {}, adNext = 1, adOn = {};
  if (hasParent && typeof Proxy === "function") {
    var adBase = {
      addListener: function (name, fn) {
        (adOn[name] = adOn[name] || []).push(fn);
        var h = { remove: function () { var l = adOn[name] || [], i = l.indexOf(fn); if (i !== -1) l.splice(i, 1); return Promise.resolve(); } };
        var p = Promise.resolve(h); p.remove = h.remove;            // older Capacitor code calls .remove() on the promise itself
        return p;
      },
      removeAllListeners: function () { adOn = {}; return Promise.resolve(); }
    };
    // Any other method name becomes a call to the simulator, so a method the stand-in lacks fails there with a console line
    window.simAdMob = new Proxy(adBase, {
      get: function (t, k) {
        if (k in t) return t[k];
        if (typeof k !== "string" || k === "then" || k === "toJSON") return undefined;   // not a promise, not JSON
        return function (opts) {
          var id = adNext++, o = {};
          try { o = JSON.parse(JSON.stringify(opts || {})); } catch (err) {}
          return new Promise(function (ok, no) { adWait[id] = [ok, no]; send({ type: "ad", id: id, op: k, opts: o }); });
        };
      }
    });
  }

  // onBack(fn) → fn runs when the phone's ◁ back button is pressed in the simulator.
  // What "back" means (previous screen, close a dialog, nothing) is the app's decision, as on Android.
  var backHandler = null;
  window.onBack = function (fn) { backHandler = fn; };

  // ---- Lifecycle: the simulator's ⏸ Background / ⏻ Close ----
  // onPause(fn) → fn runs when the app goes to the background; save progress HERE (a killed app gets no warning).
  // onResume(fn) → fn runs when the app comes back.
  // Both hang on visibilitychange, so outside the simulator they run on the real event.
  var pauseHandler = null, resumeHandler = null, killed = false;
  window.onPause = function (fn) { pauseHandler = fn; };
  window.onResume = function (fn) { resumeHandler = fn; };
  // simExit() → call it from the app's own exit button. In the simulator = the same as ⏻ (pause, then closed).
  // Outside the simulator it does nothing; on a phone the app closes itself (Capacitor App.exitApp()).
  window.simExit = function () { send({ type: "exit" }); };

  if (hasParent) {
    // Scrollbars: a phone's WebView has none that take room or can be grabbed (Android only shows a thin line that fades
    // while scrolling). The PC's would make the app narrower than on the phone and catch the mouse at the right edge
    // (Chrome drags them itself, so a back swipe from there never arrives). Hidden; scrolling still works by finger / wheel.
    var noBars = document.createElement("style");
    noBars.textContent = "* { scrollbar-width: none !important; } ::-webkit-scrollbar { display: none !important; }";
    (document.head || document.documentElement).appendChild(noBars);

    // Kill: the app must not get a last chance, as on a phone. These capture listeners are registered first,
    // so they stop the app's own pagehide / beforeunload / unload / visibilitychange handlers.
    ["pagehide", "beforeunload", "unload"].forEach(function (t) {
      window.addEventListener(t, function (e) { if (killed) e.stopImmediatePropagation(); }, true);
    });
    document.addEventListener("visibilitychange", function (e) { if (killed) e.stopImmediatePropagation(); }, true);

    // Cold start after a kill: sessionStorage would survive an iframe reload, on a phone it does not.
    if (/[?&]simcold=/.test(location.search)) { try { sessionStorage.clear(); } catch (e) {} }

    // Pause: document.hidden / visibilityState report "hidden" (or the real value, if the browser tab itself is hidden).
    var fakeHidden = false, real = Object.getOwnPropertyDescriptor(Document.prototype, "hidden");
    var realHidden = function () { return real && real.get ? real.get.call(document) : false; };
    try {
      Object.defineProperty(document, "hidden", { configurable: true, get: function () { return fakeHidden || realHidden(); } });
      Object.defineProperty(document, "visibilityState", { configurable: true, get: function () { return document.hidden ? "hidden" : "visible"; } });
    } catch (e) {}

    // A hidden WebView draws no frames: requestAnimationFrame callbacks wait until resume.
    // A held frame keeps its id after resume (resumed: held id → the real one), so the app can still cancel it.
    var rAF = window.requestAnimationFrame, cAF = window.cancelAnimationFrame, held = [], heldId = 0, resumed = {};
    window.requestAnimationFrame = function (cb) {
      if (!fakeHidden) return rAF.call(window, cb);
      held.push({ id: --heldId, cb: cb }); return heldId;
    };
    window.cancelAnimationFrame = function (id) {
      if (id < 0 && resumed[id]) { cAF.call(window, resumed[id]); delete resumed[id]; }
      else if (id < 0) held = held.filter(function (h) { return h.id !== id; });
      else cAF.call(window, id);
    };

    // Volume: the simulator's volume keys scale ALL the app's sound, as Android's media volume does.
    // The app is not told; its own volume settings keep working on top (heard = the app's volume × the phone's).
    // <audio>/<video>: the volume property reports the app's own value, the element plays it × gain.
    // Web Audio: every AudioContext gets a hidden gain node in front of the speakers (ctx.destination).
    // An <audio>/<video> routed into Web Audio (createMediaElementSource) plays at the app's own volume:
    // the gain node scales it, so the phone's volume counts once.
    var gain = 1, media = [], gains = [], own = new WeakMap(), routed = new WeakSet();
    var vDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    var applyMedia = function (el) {
      if (media.indexOf(el) === -1) {
        // a paused element no longer in the page is let go (its play() brings it back), so an app that makes
        // a new Audio() for every sound does not pile them up
        media = media.filter(function (m) { return m.isConnected || !m.paused; });
        media.push(el);
      }
      vDesc.set.call(el, (own.has(el) ? own.get(el) : 1) * (routed.has(el) ? 1 : gain));
    };
    var route = function (el) { if (el instanceof HTMLMediaElement) { routed.add(el); applyMedia(el); } };
    try {
      Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        configurable: true, enumerable: true,
        get: function () { return own.has(this) ? own.get(this) : 1; },
        set: function (v) {
          if (!(v >= 0 && v <= 1)) vDesc.set.call(this, v);   // out of range → the browser's own error
          own.set(this, +v); applyMedia(this);
        }
      });
      var mediaPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { applyMedia(this); return mediaPlay.apply(this, arguments); };
      document.addEventListener("play", function (e) { if (e.target instanceof HTMLMediaElement) applyMedia(e.target); }, true);
    } catch (e) {}
    ["AudioContext", "webkitAudioContext"].forEach(function (n) {
      var Orig = window[n];
      if (!Orig) return;
      var Ctx = function (opts) {
        var ctx = arguments.length ? new Orig(opts) : new Orig(), real = ctx.destination, g = ctx.createGain();
        g.gain.value = gain; g.connect(real);
        Object.defineProperty(ctx, "destination", { configurable: true, get: function () { return g; } });
        try { Object.defineProperty(g, "maxChannelCount", { get: function () { return real.maxChannelCount; } }); } catch (e) {}
        gains.push(g);
        return ctx;
      };
      Ctx.prototype = Orig.prototype;
      window[n] = Ctx;
      var mes = Orig.prototype.createMediaElementSource;
      if (mes && !mes.simRoute) {                // webkitAudioContext may share the prototype: wrap once
        var wrapped = function (el) { var node = mes.apply(this, arguments); route(el); return node; };
        wrapped.simRoute = true;
        Orig.prototype.createMediaElementSource = wrapped;
      }
    });
    if (window.MediaElementAudioSourceNode) {   // the same through the constructor: new MediaElementAudioSourceNode(ctx, { mediaElement })
      var MES = window.MediaElementAudioSourceNode;
      var MESNode = function (ctx, opts) { var node = new MES(ctx, opts); route(opts && opts.mediaElement); return node; };
      MESNode.prototype = MES.prototype;
      window.MediaElementAudioSourceNode = MESNode;
    }
    var setGain = function (v) {
      gain = Math.max(0, Math.min(1, +v || 0));
      media.forEach(applyMedia);
      gains.forEach(function (g) { g.gain.value = gain; });
    };

    // Vibration: navigator.vibrate(…) → the simulator draws zigzags on both sides of the phone, one buzz at a time.
    // Capacitor's Haptics plugin in a browser and Construct 2's vibrate call this same function, so one patch catches all.
    // As Chrome on a phone: refused (false) before the first touch on the page, or while the app is hidden;
    // a new call replaces the running pattern, 0 or [] stops it; a buzz is at most 10 s, a pattern at most 99 parts.
    var vibWarned = false;
    var vibrate = function (p) {
      var a = (Array.isArray(p) ? p.slice(0, 99) : [p]).map(function (v) {
        v = Math.floor(Number(v)); return v > 0 ? Math.min(v, 10000) : 0;
      });
      if (fakeHidden || realHidden()) return false;
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) {
        if (!vibWarned) { vibWarned = true; send({ type: "vibrate-blocked" }); }
        return false;
      }
      if (a.length % 2 === 0) a.pop();          // a pause at the end means nothing
      send({ type: "vibrate", pattern: a });
      return true;
    };
    try { Object.defineProperty(Navigator.prototype, "vibrate", { configurable: true, writable: true, value: vibrate }); } catch (e) {}

    // ---- Links: what Capacitor does with an address that is not the app's own ----
    // On a phone (Capacitor's Bridge.launchIntent) a page of the app itself (same scheme + host) opens inside the app;
    // any other address goes to Android as ACTION_VIEW: https → the browser (or the site's own app), market: → Play Store,
    // mailto: → mail, tel: → the dialer… The app goes to the background. No app on the phone for it = nothing happens.
    // Here such a navigation is stopped and reported ({type:"link"}); the simulator shows which app would open.
    // Caught: a tapped link, location.href = … from code, window.open. data: / blob: / javascript: / about: pass, as there.
    var ownPage = function (u) { return u.protocol === location.protocol && u.host === location.host; };
    var outward = function (href) {             // true = it would leave the app: stopped and reported
      var u; try { u = new URL(href, location.href); } catch (e) { return false; }
      if (/^(data|blob|javascript|about):$/.test(u.protocol) || ownPage(u)) return false;
      send({ type: "link", url: u.href });
      return true;
    };
    // target="_blank" / "_top" / a name: Capacitor's WebView has no second window, so the link loads in the app's own
    // window and goes the same way. Here it is turned to _self for this one click (_top would replace the simulator).
    window.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href], area[href]") : null, t = a && a.getAttribute("target");
      if (!t || t.toLowerCase() === "_self") return;
      a.setAttribute("target", "_self");
      setTimeout(function () { a.setAttribute("target", t); }, 0);
    }, true);
    if (window.navigation) {
      // Chrome / Edge: every navigation of this page, after the app's own click handlers (its preventDefault still wins).
      // A POST form is left alone: Android does not ask Capacitor about POST requests, it loads them in the app.
      navigation.addEventListener("navigate", function (e) {
        if (!e.cancelable || e.formData || (e.navigationType !== "push" && e.navigationType !== "replace")) return;
        if (outward(e.destination.url)) e.preventDefault();
      });
    } else {
      // Without the Navigation API: tapped links only.
      window.addEventListener("click", function (e) {
        var a = e.defaultPrevented || !e.target.closest ? null : e.target.closest("a[href], area[href]");
        if (a && outward(a.href)) e.preventDefault();
      });
    }
    // window.open: with one window (Capacitor allows window.open, has no second window) the address loads here, as a link would.
    window.open = function (url) {
      var href = url == null ? "" : String(url);
      if (!href || outward(href)) return null;
      try { var u = new URL(href, location.href); if (!/^(javascript|about):$/.test(u.protocol)) location.assign(u.href); } catch (e) {}
      return null;
    };

    // ---- Finger mode: the simulator's finger button (on by default) ----
    // Over the phone screen the mouse is a finger. The app never sees the real mouse; it gets what Chrome on a phone
    // sends for a touch: pointer events (pointerType "touch", implicit capture), touch events, and after a tap the
    // compatibility mouse events + click (none if touchstart / touchend was prevented; no mousedown / mouseup if
    // pointerdown was prevented). A drag past SLOP on an element whose touch-action allows panning = the browser
    // takes the finger: pointercancel, then the list under it scrolls (no fling). The wheel = two fingers on a
    // horizontal line: wheel up = apart, wheel down = together; they lift 0.3 s after the wheel stops.
    // The simulator draws the finger circles; this side only reports where the fingers are.
    // Each gesture ends with one "touchlog" message (tap, double tap, swipe, scroll, pinch); the simulator writes it
    // to its console when ⚙ → Touches in console is on.
    // Gesture navigation (⚙ → Bars → Gestures): a touch that lands in an edge zone (sizes from the simulator) and first
    // moves inward (from the left / right edge) or up (from the bottom) is the system's: the app gets pointercancel +
    // touchcancel, as Android takes the finger; the simulator gets "navdrag" / "navend" and does back / home.
    // Not imitated: long-press, text selection, native controls (select, range) → the simulator's mouse mode.
    var touchOn = false, fingers = [], ours = {}, nextId = 2, pinch = null, hover = null, lastTap = null, lastOver = null, cursorCss = null;
    var SLOP = 10, FINGER = 23;                 // px: movement before a touch stops being a tap; the finger's contact size (estimates)
    var PINCH_D = 80, PINCH_MIN = 44;           // px: the two fingers' first distance, the closest they come (the circles stay apart)
    var scr = { x: 0, y: 0 };                   // screenX − clientX, from the last real mouse event
    var navZ = { l: 0, r: 0, b: 0 }, sysF = null;   // gesture navigation: edge zones (app px, 0 = none); the finger the system took
    var caps = null; try { caps = new InputDeviceCapabilities({ firesTouchEvents: true }); } catch (e) {}
    var opt = function (o) { o.view = window; o.composed = true; if (caps) o.sourceCapabilities = caps; return o; };
    var hit = function (x, y) { return document.elementFromPoint(x, y) || document.documentElement; };
    var within = function (x, y) { return [Math.max(0, Math.min(innerWidth - 1, x)), Math.max(0, Math.min(innerHeight - 1, y))]; };
    var chain = function (el) { var a = []; for (; el && el.nodeType === 1; el = el.parentNode) a.push(el); return a; };   // el … <html>
    var byId = function (id) { for (var i = 0; i < fingers.length; i++) if (fingers[i].id === id) return fingers[i]; return null; };

    var pointer = function (type, f, el) {
      var ev = new PointerEvent(type, opt({
        bubbles: type !== "pointerenter" && type !== "pointerleave", cancelable: !/enter|leave|cancel|capture/.test(type),
        pointerId: f.id, pointerType: "touch", isPrimary: f.primary,
        clientX: f.x, clientY: f.y, screenX: f.x + scr.x, screenY: f.y + scr.y,
        width: FINGER, height: FINGER, pressure: f.down ? 0.5 : 0,
        button: type === "pointerdown" || type === "pointerup" || type === "click" ? 0 : -1, buttons: f.down ? 1 : 0,
        detail: type === "click" ? f.taps || 1 : 0
      }));
      el.dispatchEvent(ev); return ev;
    };
    // The finger moves from one element to another: out + leave on what it left, over + enter on what it reached.
    var cross = function (f, from, to) {
      if (from === to) return;
      var a = from ? chain(from) : [], b = to ? chain(to) : [];
      if (from) { pointer("pointerout", f, from); a.forEach(function (n) { if (b.indexOf(n) < 0) pointer("pointerleave", f, n); }); }
      if (to) { pointer("pointerover", f, to); b.reverse().forEach(function (n) { if (a.indexOf(n) < 0) pointer("pointerenter", f, n); }); }
    };
    // Pointer capture for the fake fingers (the browser's own calls would throw: it does not know their ids).
    // A touch is captured by the element it landed on; the app may move or release that. Applied before the next event, as in Chrome.
    var EP = Element.prototype, realCap = { set: EP.setPointerCapture, rel: EP.releasePointerCapture, has: EP.hasPointerCapture };
    EP.setPointerCapture = function (id) { var f = byId(id); if (f) f.next = this; else if (!ours[id]) return realCap.set.call(this, id); };
    EP.releasePointerCapture = function (id) { var f = byId(id); if (f) { if (f.next === this) f.next = null; } else if (!ours[id]) return realCap.rel.call(this, id); };
    EP.hasPointerCapture = function (id) { var f = byId(id); return f ? f.next === this : ours[id] ? false : realCap.has.call(this, id); };
    var aim = function (f) {                    // pending capture → current (got / lost events), then the element the finger is "over"
      if (f.next !== f.capture) {
        var old = f.capture; f.capture = f.next;
        if (old) pointer("lostpointercapture", f, old);
        if (f.capture) pointer("gotpointercapture", f, f.capture);
      }
      var t = f.capture || hit(f.x, f.y); cross(f, f.over, t); f.over = t;
      return t;
    };

    var touchObj = function (f) {
      var o = { identifier: f.id, target: f.tt, clientX: f.x, clientY: f.y, pageX: f.x + scrollX, pageY: f.y + scrollY,
                screenX: f.x + scr.x, screenY: f.y + scr.y, radiusX: FINGER / 2, radiusY: FINGER / 2, rotationAngle: 0, force: 0.5 };
      try { return new Touch(o); } catch (e) { return o; }
    };
    // Touch events always go to the element the finger first landed on; one event per such element, as Chrome sends them.
    // Returns true if a listener called preventDefault.
    var touch = function (type, changed, cancelable) {
      var all = fingers.map(touchObj), done = [], prevented = false;
      changed.forEach(function (f) {
        if (done.indexOf(f.tt) >= 0) return; done.push(f.tt);
        var same = function (g) { return g.tt === f.tt; };
        var init = opt({ bubbles: true, cancelable: cancelable, touches: all,
                         targetTouches: fingers.filter(same).map(touchObj), changedTouches: changed.filter(same).map(touchObj) });
        var ev;
        try { ev = new TouchEvent(type, init); }
        catch (e) { ev = new Event(type, init); ["touches", "targetTouches", "changedTouches"].forEach(function (k) { Object.defineProperty(ev, k, { value: init[k] }); }); }
        f.tt.dispatchEvent(ev);
        if (ev.defaultPrevented) prevented = true;
      });
      return prevented;
    };

    // ---- One console line per gesture: it starts with the first finger down and ends when the last one lifts ----
    var gest = null, logTap = null;
    var what = function (el) {                  // the element a finger landed on, short: tag#id or tag.class
      if (!el || !el.tagName) return "";
      var s = el.tagName.toLowerCase(), c = el.classList && el.classList[0];
      return el.id ? s + "#" + el.id : c ? s + "." + c : s;
    };
    var report = function (f) {                 // f = the last finger to lift; arrows = the way the finger moved
      var g = gest, now = Date.now(); gest = null;
      if (!g) return;
      var m = { type: "touchlog", el: g.el, x: Math.round(g.x0), y: Math.round(g.y0) };
      if (g.pinch) { m.g = "pinch"; m.k = g.k || 1; }
      else if (!f.moved) {                      // a double tap: the same rule as the dblclick below
        var dbl = logTap && now - logTap.t < 300 && Math.abs(f.x - logTap.x) < 25 && Math.abs(f.y - logTap.y) < 25;
        m.g = dbl ? "dbl" : "tap"; logTap = dbl ? null : { t: now, x: f.x, y: f.y };
      } else {
        var dx = f.x - f.x0, dy = f.y - f.y0;
        m.g = f.pan ? "scroll" : "swipe";        // scroll = the browser took the finger; swipe = the app kept it
        m.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "→" : "←") : (dy > 0 ? "↓" : "↑");
        m.d = Math.round(Math.sqrt(dx * dx + dy * dy)); m.ms = now - g.t0;
      }
      send(m);
    };

    var down = function (x, y, primary) {
      var t = hit(x, y);
      if (!fingers.length) gest = { t0: Date.now(), x0: x, y0: y, el: what(t), pinch: false };
      var f = { id: nextId++, x: x, y: y, x0: x, y0: y, primary: primary, down: true, tt: t, over: null, capture: null, next: t };
      ours[f.id] = true; fingers.push(f);
      cross(f, null, t); f.over = t;
      f.noMouse = pointer("pointerdown", f, t).defaultPrevented;   // prevented pointerdown = no compatibility mousedown / mouseup
      aim(f);
      f.held = touch("touchstart", [f], true);                       // prevented touchstart = no scroll, no click
      return f;
    };
    var move = function (fs) {
      fs.forEach(function (f) { if (!f.cancelled) pointer("pointermove", f, aim(f)); });
      if (touch("touchmove", fs, !fs.some(function (f) { return f.pan; }))) fs.forEach(function (f) { if (!f.pan) f.held = true; });
    };
    var cancelPointer = function (f) {          // the browser takes the finger (scroll) or the gesture is dropped
      f.down = false; pointer("pointercancel", f, aim(f));
      f.next = null; aim(f); cross(f, f.over, null); f.over = null; f.cancelled = true;
    };
    var panOk = function (el, across) {         // does touch-action on el and its parents let the browser pan this way?
      for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
        var v = getComputedStyle(n).touchAction;
        if (!v || v === "auto" || v === "manipulation") continue;
        if (v === "none" || !(across ? /pan-(x|left|right)/ : /pan-(y|up|down)/).test(v)) return false;
      }
      return true;
    };
    // What the browser scrolls for a drag this way: the nearest element that can scroll along that axis
    // (a vertical drag on a sideways carousel scrolls the page). body counts only when it scrolls itself:
    // with html's overflow left visible, body's overflow belongs to the page, which is the last resort anyway.
    var scroller = function (el, across) {
      var h = getComputedStyle(document.documentElement), bodyOwn = h.overflowX !== "visible" || h.overflowY !== "visible";
      for (var n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentNode) {
        if (n === document.body && !bodyOwn) break;
        var s = getComputedStyle(n);
        if (across ? /auto|scroll|overlay/.test(s.overflowX) && n.scrollWidth > n.clientWidth
                   : /auto|scroll|overlay/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return n;
      }
      return document.scrollingElement || document.documentElement;
    };
    // Gesture navigation: the zones a touch landed in; its first move past SLOP says whether the system takes it.
    var edgesAt = function (x, y) {
      var e = [];
      if (x < navZ.l) e.push("l");
      if (x >= innerWidth - navZ.r) e.push("r");
      if (y >= innerHeight - navZ.b) e.push("b");
      return e;
    };
    var inward = function (k, dx, dy) { return k === "l" ? dx > Math.abs(dy) : k === "r" ? -dx > Math.abs(dy) : -dy > Math.abs(dx); };
    var navMsg = function (type, f) { send({ type: type, edge: f.edge, x0: f.x0, y0: f.y0, x: f.x, y: f.y }); };
    var take = function (f) {                    // the system takes the finger (Android's pilferPointers): the app gets cancel
      if (!f.cancelled) cancelPointer(f);
      fingers.splice(fingers.indexOf(f), 1);
      touch("touchcancel", [f], false);
      gest = null; sysF = f; navMsg("navdrag", f);   // no touch line from here: the simulator writes the gesture's
    };
    var drag = function (f, x, y) {
      if (f === sysF) { f.x = x; f.y = y; navMsg("navdrag", f); return; }
      var px = f.x, py = f.y;
      if (x === px && y === py) return;
      f.x = x; f.y = y;
      if (f.edges && (Math.abs(x - f.x0) > SLOP || Math.abs(y - f.y0) > SLOP)) {
        var k = f.edges.filter(function (e) { return inward(e, x - f.x0, y - f.y0); })[0];
        f.edges = null;
        if (k) { f.edge = k; take(f); return; }
      }
      move([f]);
      if (!f.moved && (Math.abs(x - f.x0) > SLOP || Math.abs(y - f.y0) > SLOP)) {
        f.moved = true;
        var across = Math.abs(x - f.x0) > Math.abs(y - f.y0);
        if (!f.held && !f.cancelled && panOk(f.tt, across)) { f.pan = true; f.scroller = scroller(f.tt, across); cancelPointer(f); }
      }
      if (f.pan) f.scroller.scrollBy({ left: px - x, top: py - y, behavior: "instant" });
    };

    var FOCUSABLE = "input,textarea,select,button,a[href],area[href],iframe,summary,[tabindex],[contenteditable]:not([contenteditable=false])";
    var focusAt = function (t) {                // a tap focuses what it hit, or takes the focus away
      var el = t.closest ? t.closest(FOCUSABLE) : null, a = document.activeElement;
      if (el && !el.disabled) el.focus();
      else if (a && a !== document.body && a.blur) a.blur();
    };
    var mouse = function (type, el, f, detail) {
      var ev = new MouseEvent(type, opt({ bubbles: true, cancelable: true, clientX: f.x, clientY: f.y, screenX: f.x + scr.x, screenY: f.y + scr.y,
                                          button: 0, buttons: type === "mousedown" ? 1 : 0, detail: detail || 0 }));
      el.dispatchEvent(ev); return ev;
    };
    var tap = function (f) {                    // what Chrome sends after a tap; two taps close together = dblclick
      var t = hit(f.x, f.y), now = Date.now();
      var dbl = lastTap && now - lastTap.t < 300 && Math.abs(f.x - lastTap.x) < 25 && Math.abs(f.y - lastTap.y) < 25;
      f.taps = dbl ? 2 : 1;
      if (!f.noMouse) {
        if (lastOver !== t) { if (lastOver) mouse("mouseout", lastOver, f); mouse("mouseover", t, f); lastOver = t; }
        mouse("mousemove", t, f);
        if (!mouse("mousedown", t, f, f.taps).defaultPrevented) focusAt(t);
        mouse("mouseup", t, f, f.taps);
      } else focusAt(t);
      pointer("click", f, t);
      if (dbl) { mouse("dblclick", t, f, 2); lastTap = null; } else lastTap = { t: now, x: f.x, y: f.y };
    };
    var up = function (f, mayTap) {
      if (f === sysF) { sysF = null; navMsg("navend", f); return; }
      if (!f.cancelled) {
        f.down = false; pointer("pointerup", f, aim(f));
        f.next = null; aim(f); cross(f, f.over, null); f.over = null;
      }
      fingers.splice(fingers.indexOf(f), 1);
      if (!fingers.length) report(f);            // before touchend, so the line comes before what the app logs for it
      var held = touch("touchend", [f], !f.pan);
      if (mayTap && !f.moved && !f.held && !held) tap(f);
    };
    var cancelAll = function () {
      if (pinch) { clearTimeout(pinch.timer); pinch = null; }
      gest = null;                               // a dropped gesture writes no line
      if (sysF) { send({ type: "navend", edge: sysF.edge, cancel: true }); sysF = null; }
      fingers.slice().forEach(function (f) {
        if (!f.cancelled) cancelPointer(f);
        fingers.splice(fingers.indexOf(f), 1);
        touch("touchcancel", [f], false);
      });
    };
    // → the simulator draws: a filled ring = a finger down, a thin ring = where one would land.
    // [x, y, id]: the id lets the simulator follow each finger, so its press and release can be animated.
    var viz = function () {
      var all = sysF ? fingers.concat([sysF]) : fingers;
      send({ type: "touchviz", pts: all.map(function (f) { return [f.x, f.y, f.id]; }), hover: touchOn && !all.length && hover ? hover : null });
    };

    // Two fingers from the wheel. The centre stays where the wheel started; it moves in only if a finger would leave the screen.
    var pinchPlace = function () {
      var h = pinch.d / 2, cx = Math.max(h + 4, Math.min(innerWidth - h - 4, pinch.cx));
      pinch.a.x = cx - h; pinch.b.x = cx + h; pinch.a.y = pinch.b.y = pinch.cy;
    };
    var pinchRun = function () {                // the fingers glide to the new distance over a few frames, as real ones would
      if (pinch.running) return;
      pinch.running = true;
      var step = function () {
        if (!pinch) return;
        var diff = pinch.goal - pinch.d;
        pinch.d = Math.abs(diff) < 0.5 ? pinch.goal : pinch.d + diff * 0.35;
        pinchPlace(); move([pinch.a, pinch.b]); viz();
        if (pinch.d !== pinch.goal) rAF.call(window, step); else pinch.running = false;
      };
      rAF.call(window, step);
    };
    var pinchEnd = function () {
      if (!pinch) return;
      if (pinch.running) { pinch.timer = setTimeout(pinchEnd, 50); return; }
      var a = pinch.a, b = pinch.b;
      if (gest) gest.k = pinch.d / PINCH_D;
      pinch = null;
      up(b, false); up(a, false); viz();
    };
    window.addEventListener("wheel", function (e) {
      if (!e.isTrusted || !touchOn) return;
      e.preventDefault(); e.stopImmediatePropagation();          // a phone has no wheel: the app never sees it, the page does not scroll
      if ((fingers.length && !pinch) || sysF) return;            // one finger is already down
      var dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1);
      if (!dy) return;
      if (!pinch) {
        var p = within(e.clientX, e.clientY), h = PINCH_D / 2, cx = Math.max(h + 4, Math.min(innerWidth - h - 4, p[0]));
        pinch = { cx: p[0], cy: p[1], d: PINCH_D, goal: PINCH_D, timer: 0, running: false };
        pinch.a = down(cx - h, p[1], true); pinch.b = down(cx + h, p[1], false);
        if (gest) { gest.pinch = true; gest.x0 = p[0]; gest.y0 = p[1]; gest.el = what(hit(p[0], p[1])); }   // the line names what is under the cursor
      }
      pinch.goal = Math.max(PINCH_MIN, Math.min(Math.max(PINCH_MIN, innerWidth - 8), pinch.goal * Math.exp(-dy * 0.0025)));
      pinchRun();
      clearTimeout(pinch.timer); pinch.timer = setTimeout(pinchEnd, 300);
    }, { capture: true, passive: false });

    // The real mouse: stopped before any of the app's listeners (this file loads first), turned into the finger.
    // A touch screen's own events pass (they say firesTouchEvents); keyboard clicks pass (pointerType "").
    var fromMouse = function (e) {
      if (!e.isTrusted || !touchOn || (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) return false;
      return e.pointerType === undefined || e.pointerType === "mouse";
    };
    var intake = function (e) {
      if (!fromMouse(e)) return;
      e.stopImmediatePropagation();
      // no focus, text selection, image drag or link from the real mouse; the right-click menu stays (Inspect)
      var isPtr = e.type.indexOf("pointer") !== -1;
      if (!isPtr && e.type !== "contextmenu") e.preventDefault();
      if (!isPtr) return;
      scr.x = e.screenX - e.clientX; scr.y = e.screenY - e.clientY;
      var p = within(e.clientX, e.clientY), f = sysF || (fingers.length === 1 && !pinch ? fingers[0] : null);
      if (e.type === "pointerdown") {
        try { window.focus(); } catch (er) {}                  // the real mousedown is prevented, so the frame would not get the keyboard
        if (e.button === 0 && !fingers.length && !pinch && !sysF) { var nf = down(p[0], p[1], true), z = edgesAt(p[0], p[1]); if (z.length) nf.edges = z; }
        viz();
      } else if (e.type === "pointermove") {
        hover = p;
        if (f) { if (e.buttons & 1) drag(f, p[0], p[1]); else up(f, true); }   // released outside the frame: lift here
        viz();
      } else if (e.type === "pointerup") {
        if (f && e.button === 0) up(f, true);
        viz();
      } else if (e.type === "pointerout" && !e.relatedTarget) { hover = null; viz(); }
    };
    ["pointerover", "pointerenter", "pointerdown", "pointermove", "pointerrawupdate", "pointerup", "pointercancel", "pointerout", "pointerleave",
     "gotpointercapture", "lostpointercapture", "mouseover", "mouseenter", "mousedown", "mousemove", "mouseup", "mouseout", "mouseleave",
     "click", "auxclick", "dblclick", "contextmenu", "mousewheel"].forEach(function (t) { window.addEventListener(t, intake, true); });
    window.addEventListener("blur", function () { if (fingers.length) { cancelAll(); viz(); } });

    var setTouch = function (on) {
      on = !!on;
      if (on === touchOn) return;
      if (!on) cancelAll();
      touchOn = on; hover = null;
      if (!cursorCss) { cursorCss = document.createElement("style"); cursorCss.textContent = "*, *::before, *::after { cursor: none !important; }"; }
      if (on) (document.head || document.documentElement).appendChild(cursorCss); else cursorCss.remove();   // a phone has no arrow
      viz();
    };

    var lifecycle = function (ev) {
      fakeHidden = ev === "pause";
      document.dispatchEvent(new Event("visibilitychange"));
      if (!fakeHidden) held.splice(0).forEach(function (h) {
        resumed[h.id] = rAF.call(window, function (t) { delete resumed[h.id]; h.cb(t); });
      });
      send({ type: "lifecycle-ack", ev: ev, handled: !!(fakeHidden ? pauseHandler : resumeHandler) });
    };
  }

  // Runs onPause / onResume once per real change of document.hidden (fake in the simulator, real outside it).
  var wasHidden = document.hidden;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden === wasHidden) return;
    wasHidden = document.hidden;
    var fn = wasHidden ? pauseHandler : resumeHandler;
    if (fn) { try { fn(); } catch (err) { send({ type: "error", msg: (wasHidden ? "onPause" : "onResume") + ": " + err.message }); } }
  });

  // Messages from the simulator: theme picker → data-theme on this page; ◁ → onBack handler; ⏸ / ▶ / ⏻ → lifecycle;
  // volume → gain on all the app's sound; touchmode → finger mode on / off; ad-reply / ad-event → simAdMob's promises and listeners;
  // nav → the gesture-navigation edge zones.
  window.addEventListener("message", function (e) {
    var m = e.data || {};
    if (m.type === "theme" && m.theme) document.documentElement.setAttribute("data-theme", m.theme);
    else if (m.type === "back") { if (backHandler) backHandler(); else send({ type: "back-unhandled" }); }
    else if (hasParent && (m.type === "pause" || m.type === "resume")) lifecycle(m.type);
    else if (hasParent && m.type === "kill") killed = true;
    else if (hasParent && m.type === "volume") setGain(m.gain);
    else if (hasParent && m.type === "touchmode") { setTouch(m.on); send({ type: "touchmode-ack" }); }
    else if (hasParent && m.type === "nav") navZ = { l: Math.max(0, +m.l || 0), r: Math.max(0, +m.r || 0), b: Math.max(0, +m.b || 0) };
    else if (hasParent && m.type === "ad-reply" && adWait[m.id]) {
      var w = adWait[m.id]; delete adWait[m.id];
      if (m.ok) w[0](m.value);
      else { var er = new Error(m.message); if (m.code != null) er.code = m.code; w[1](er); }
    }
    else if (hasParent && m.type === "ad-event") (adOn[m.name] || []).slice().forEach(function (fn) {
      try { fn(m.data || {}); } catch (err) { setTimeout(function () { throw err; }); }   // the app's own error: a red line, the rest still run
    });
    else if (hasParent && m.type === "insets") {
      // The same CSS variables Capacitor 8 (SystemBars, insetsHandling "css") sets on a phone.
      ["top", "right", "bottom", "left"].forEach(function (k) {
        document.documentElement.style.setProperty("--safe-area-inset-" + k, (m[k] | 0) + "px");
      });
    }
  });

  // viewport-fit=cover? Read the way Capacitor's SystemBars does it: the last meta viewport tag.
  // With cover (and WebView 140+) the phone draws the app UNDER the system bars; without it the bars take height.
  function hasCover() {
    var t = document.querySelectorAll("meta[name=viewport]");
    return t.length > 0 && t[t.length - 1].content.indexOf("viewport-fit=cover") !== -1;
  }

  // Tell the simulator we are up; it answers with the current theme.
  // `cover` tells the simulator how a phone would place this app.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { send({ type: "ready", cover: hasCover() }); });
  else send({ type: "ready", cover: hasCover() });
})();
