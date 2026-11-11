// core.js: the demo's frame. Every feature lives in its own file in features/ and adds itself with Demo.add({…});
// this file draws the home cards from that list, makes each feature's screen (Try + Code tabs) on its first open,
// and does what every screen shares: ⓘ, back, exit, the background, the music button, the command line.
//
// A new feature = one file in features/ + one <script> line in index.html. Its card appears by itself.
//
//   Demo.add({
//     id: "vibrate",                   the screen; demo.go("vibrate") in the command line opens it
//     group: "feel",                   the heading its card goes under (GROUPS below; a new id makes a new heading)
//     title: "Vibrate", hint: "…",     the card: a name and one line
//     icon: "vibrate",                 a name from ICONS below, or Lucide <path …/> markup
//     color: "secondary",              a daisyUI colour: the icon's tint
//     lead: "…",                       the ⓘ sheet: the line under the title
//     can: [[icon, color, name, text]], its "On this screen": what the Try tab lets you do
//     sim: [[icon, text]],             its "In the simulator": how the simulator shows it
//     tip: [kind, text],               optional, a note at the bottom: kind = "find" | "know" | "watch" (TIPS below)
//     foot: "…",                       the last line, beside the tags of its snippets
//     code: [{ file, tag, title, rows, src }], the Code tab; tag = "Web API" | "Capacitor" | "sim-bridge.js" | "HTML" (TAGS below),
//                                      title + rows ([icon, text]) = the snippet's ⓘ
//     build: function (pane, screen) {}, fills the Try tab, once, on the first open
//     open: function () {}             optional: runs on every open
//   });
//   Demo.page({ id, title, build })    a plain screen with no card and no tabs (a screen inside a screen)
//   Demo.on("pause" | "resume" | "music" | "name", fn), Demo.emit(name, value)   the features talk through these
//
// From sim-bridge.js: log(), simScreen(), onBack(), onPause(), onResume(), simExit().
// Outside the simulator they do nothing (onPause / onResume run on the real event), so the demo works unchanged in an APK.
// log() writes a line in the simulator's console: the console is where you watch the app's logic without DevTools.
//
// Marks in the ⓘ texts: `code`, [a key], {icon} inside a key (a name from ICONS), *bold*.
(function () {
  "use strict";

  // ===== The headings on the home screen, in this order =====

  var GROUPS = [
    { id: "feel",  title: "Touch & sound" },
    { id: "out",   title: "Leaving the app" },
    { id: "phone", title: "The phone" },
    { id: "dev",   title: "For developers" }
  ];

  // Where a snippet comes from: its chip and the end of its ⓘ
  var TAGS = {
    "Web API":       { icon: "globe",    color: "info",      text: "A web standard: works in any browser and in the Android WebView. No plugin." },
    "Capacitor":     { icon: "plug",     color: "secondary", text: "A Capacitor plugin: install it in the app (npm). In the simulator a stand-in answers with the same calls." },
    "sim-bridge.js": { icon: "fileCode", color: "accent",    text: "From sim-bridge.js: include it first in `<head>`. Outside the simulator `log()`, `simScreen()`, `onBack()` and `simExit()` do nothing, and `onPause` / `onResume` run on the real event, so the same code ships in the APK." },
    "HTML":          { icon: "tag",      color: "success",   text: "Plain HTML: no script needed." }
  };
  // The note at the bottom of a sheet: its icon and first words
  var TIPS = { find: ["bulb", "Find it:"], know: ["bulb", "Good to know:"], watch: ["alert", "Watch out:"] };

  // ===== Icons: Lucide (ISC licence), stroke paths for a 24×24 box =====

  var ICONS = {
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    pointer: '<path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    vibrate: '<path d="m2 8 2 2-2 2 2 2-2 2"/><path d="m22 8-2 2 2 2-2 2 2 2"/><rect width="8" height="14" x="8" y="5" rx="1"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    pause: '<circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/>',
    keyboard: '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
    wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
    wifiOff: '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
    terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    code: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    vol: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
    swipe: '<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>',
    apart: '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>',
    together: '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    reload: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
    mouse: '<rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v4"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    fileCode: '<path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    window: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
    panelBottom: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15h18"/>',
    eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
    full: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>',
    enter: '<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    bold: '<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/>',
    hourglass: '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 11.995 2z"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    hash: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>',
    up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    down: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    volx: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>'
  };

  var $ = function (id) { return document.getElementById(id); };
  var features = [], byId = {}, screens = {}, listeners = {};
  var current = null, trail = [];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function icon(name, size) {
    size = size || 20;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || name || "") + "</svg>";
  }
  // The icon square: --c is its colour (demo.css tints the square with it)
  function ico(f, size, cls) { return '<span class="ico ' + (cls || "") + '" style="--c: var(--color-' + f.color + ')">' + icon(f.icon, size) + "</span>"; }
  function infoBtn(key, cls) {
    return '<button class="btn btn-ghost btn-circle btn-sm ibtn ' + (cls || "") + '" data-info="' + key + '" aria-label="What is this">' + icon("info", 18) + "</button>";
  }


  // ===== The list of features =====

  var Demo = window.Demo = {
    add: function (f) { features.push(f); byId[f.id] = f; },
    page: function (p) { p.page = true; byId[p.id] = p; },
    open: function (id) { return show(id, true); },
    back: function () { if (trail.length) show(trail[trail.length - 1]); },
    askExit: askExit,
    on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
    emit: function (name, value) { (listeners[name] || []).forEach(function (fn) { fn(value); }); },
    toast: toast,
    icon: icon,
    esc: esc
  };


  // ===== Home: one card per feature, under its heading =====

  function drawHome() {
    var groups = GROUPS.slice();
    features.forEach(function (f) {
      if (!groups.some(function (g) { return g.id === f.group; })) groups.push({ id: f.group, title: f.group || "Other" });
    });
    $("cards").innerHTML = groups.map(function (g) {
      var list = features.filter(function (f) { return f.group === g.id; });
      if (!list.length) return "";
      return '<h3 class="grp">' + esc(g.title) + '</h3><div class="grid grid-cols-2 gap-2">' + list.map(function (f) {
        return '<div class="fcard" role="button" tabindex="0" data-open="' + f.id + '">' +
          '<div class="fcard-top">' + ico(f) + infoBtn("f:" + f.id, "-mr-1 -mt-1") + "</div>" +
          '<div class="fcard-t">' + esc(f.title) + '</div><div class="fcard-h muted">' + esc(f.hint) + "</div></div>";
      }).join("") + "</div>";
    }).join("");
  }


  // ===== A feature's screen: made on its first open, then kept (its state stays) =====

  function make(id) {
    var f = byId[id], s = document.createElement("section");
    s.id = "s-" + id;
    var head = '<header class="bar"><button class="btn btn-ghost btn-circle btn-sm" data-back aria-label="Back">' + icon("back") + "</button>" +
      (f.page ? "" : ico(f, 18, "ico-s")) +
      '<h2 class="flex-1 min-w-0 truncate text-lg font-bold">' + esc(f.title) + "</h2>" + (f.page ? "" : infoBtn("f:" + id)) + "</header>";
    if (f.page) {
      s.innerHTML = head + '<div class="scroll pane"></div>';
    } else {
      s.innerHTML = head +
        '<div class="tabsbar"><div role="tablist" class="tabs tabs-box tabs-sm w-full">' +
        '<button role="tab" class="tab flex-1 gap-1" data-tab="try">' + icon("play", 14) + "Try</button>" +
        '<button role="tab" class="tab flex-1 gap-1" data-tab="code">' + icon("code", 14) + 'Code <span class="badge badge-xs">' + f.code.length + "</span></button></div></div>" +
        '<div class="scroll pane" data-pane="try"></div>' +
        '<div class="scroll" data-pane="code">' + f.code.map(function (c, i) { return codeBlock(f, i); }).join("") + "</div>";
      tab(s, "try");
    }
    $("app").appendChild(s);
    if (f.build) f.build(s.querySelector(".pane"), s);
    return s;
  }

  function tab(s, which) {
    Array.prototype.forEach.call(s.querySelectorAll("[data-tab]"), function (t) { t.classList.toggle("tab-active", t.dataset.tab === which); });
    Array.prototype.forEach.call(s.querySelectorAll("[data-pane]"), function (p) { p.hidden = p.dataset.pane !== which; });
  }


  // ===== Code: a snippet with colours, its ⓘ and Copy =====

  // Colours for comments, strings, keywords and numbers
  function paint(src) {
    var re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(var|function|return|if|else|new|true|false|null|try|catch)\b|\b(\d+(?:\.\d+)?)\b/g;
    var out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index)) + '<span class="t' + (m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : "n") + '">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  function codeBlock(f, i) {
    var c = f.code[i];
    return '<div class="code"><div class="code-h"><span class="code-f">' + esc(c.file) + '</span><span class="code-tag">' + esc(c.tag) + '</span><span class="flex-1"></span>' +
      infoBtn("c:" + f.id + ":" + i, "btn-xs") +
      '<button class="btn btn-ghost btn-xs gap-1" data-copy="' + f.id + ":" + i + '">' + icon("copy", 14) + "Copy</button></div>" +
      "<pre><code>" + paint(c.src) + "</code></pre></div>";
  }

  // The simulator's frame may not allow the clipboard API: then the old way, from a field that brings up no keyboard
  function copy(text, what) {
    var done = function () { toast("Copied"); log("copied: " + esc(what)); };
    function oldWay() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.readOnly = true; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand("copy")) done(); } catch (e) {}
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, oldWay);
    else oldWay();
  }


  // ===== Moving between screens =====
  // The trail remembers where we came from, so back can return there.
  // Going to the screen we came from pops the trail instead of pushing; home clears it.

  function show(id, fresh) {
    id = String(id);
    if (id !== "home" && !byId[id]) return false;
    var s = id === "home" ? $("home") : screens[id] || (screens[id] = make(id));
    var dir = "in";
    if (id === "home") { dir = trail.length ? "out" : "in"; trail = []; }
    else if (current && current !== id) {
      if (trail[trail.length - 1] === id) { trail.pop(); dir = "out"; } else trail.push(current);
    }
    current = id;
    Array.prototype.forEach.call($("app").children, function (x) { x.classList.toggle("on", x === s); });
    s.classList.remove("in", "out"); void s.offsetWidth; s.classList.add(dir);
    var f = byId[id];
    if (f && !f.page && fresh) tab(s, "try");
    if (f && f.open) f.open();
    simScreen(id);                       // console: "snapshot: screen …"
    return true;
  }


  // ===== Back: ◁ on the phone, the simulator's back button, or ← on a screen =====
  // First an open dialog closes, then the previous screen comes back,
  // and on the first screen the app asks before it exits (the usual Android pattern).

  var quit = $("quit");
  function askExit() { quit.showModal(); log("back: first screen, asking to exit"); }

  function goBack() {
    var open = document.querySelectorAll("dialog[open]");
    if (open.length) { open[open.length - 1].close(); log("back: dialog closed"); }
    else if (trail.length) show(trail[trail.length - 1]);
    else askExit();
  }
  onBack(goBack);                                                       // the simulator
  if (window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins.App) {
    Capacitor.Plugins.App.addListener("backButton", goBack);           // a phone
  }

  $("quitNo").onclick = function () { quit.close(); log("exit: no"); };
  $("quitYes").onclick = function () {
    quit.close(); log("exit: yes");
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App) Capacitor.Plugins.App.exitApp();   // a phone
    else simExit();                                                                                        // the simulator: as ⏻
  };


  // ===== Background: ○ Home or ⏸ in the simulator; Home or another app on a phone =====
  // A killed app gets no warning, so pause is where a real app saves its progress.

  var awayAt = 0;
  onPause(function () {
    awayAt = Date.now();
    log("pause: the app would save its progress here");
    Demo.emit("pause");
  });
  onResume(function () {
    var seconds = Math.round((Date.now() - awayAt) / 1000);
    log("resume: back after " + seconds + " s");
    toast("Welcome back, away " + seconds + " s");
    Demo.emit("resume", seconds);
  });


  // ===== ⓘ: a sheet from the bottom for the app, a feature or a snippet =====
  // The texts are data: APP below, each feature's lead / can / sim / tip / foot, each snippet's title / rows.
  // These functions only draw them.

  // The app's own ⓘ (the button in the home header)
  var APP = {
    title: "Phone Sim Demo", icon: "phone", color: "primary",
    lead: "A demo app for the phone simulator. Each card is one thing an app can do on a phone.",
    can: [
      ["play", "primary", "Try", "A card opens a screen with the feature, working."],
      ["code", "info", "Code", "The second tab: short snippets of how it is done."],
      ["copy", "success", "Copy", "One press copies a snippet. It works the same in the simulator and in an APK."],
      ["info", "secondary", "ⓘ everywhere", "On every card and feature screen: what it is and how the simulator shows it. On a snippet: what it does and where it comes from."]
    ],
    sim: [
      ["terminal", "Every action writes a line in the console beside the phone."],
      ["terminal", "The command line under it runs code in this app: `demo.go(\"ads\")` opens a screen."],
      ["palette", "[⚙] → [Theme] recolours the demo; only the code boxes stay dark."]
    ],
    tip: ["know", "Each feature is one file in `features/`. A new file + one `<script>` line = a new card on this screen."],
    link: "https://github.com/kandelucky/phone-sim"      // a link leaves the app, as on a phone
  };

  // `code`, [a key] ({icon} inside a key = that icon), *bold*. The text is escaped first.
  function md(s) {
    return esc(s).replace(/`([^`]+)`|\[([^\]]+)\]|\*([^*]+)\*/g, function (m, code, key, bold) {
      if (code) return "<code>" + code + "</code>";
      if (key) return '<span class="kb">' + key.replace(/\{(\w+)\}/g, function (q, n) { return icon(n, 11); }) + "</span>";
      return "<b>" + bold + "</b>";
    });
  }
  var NOTAG = { icon: "code", color: "info", text: "" };     // a tag that is not in TAGS
  function sheetHead(name, color, title, sub, subIsFile) {
    return '<div class="flex items-start gap-3">' +
      '<span class="ico" style="--c: var(--color-' + color + ')">' + icon(name, 22) + "</span>" +
      '<div class="flex-1 min-w-0"><h3 class="font-bold text-lg leading-tight">' + esc(title) + "</h3>" +
      (sub ? '<p class="d mt-0.5' + (subIsFile ? " file" : "") + '">' + (subIsFile ? esc(sub) : md(sub)) + "</p>" : "") + "</div>" +
      '<form method="dialog"><button class="btn btn-ghost btn-sm btn-circle" aria-label="Close">' + icon("x", 18) + "</button></form></div>";
  }
  function sec(name, title) { return '<div class="sec">' + icon(name, 13) + esc(title) + "</div>"; }
  function canRows(rows) {
    return rows.map(function (r) {
      return '<div class="li"><span class="ico ico-s" style="--c: var(--color-' + r[1] + ')">' + icon(r[0], 17) + "</span>" +
        '<div><div class="t">' + esc(r[2]) + '</div><div class="d">' + md(r[3]) + "</div></div></div>";
    }).join("");
  }
  function box(rows, color) {
    return '<div class="simbox">' + rows.map(function (r) {
      return '<div class="li"><span class="ico ico-xs" style="--c: var(--color-' + (color || "info") + ')">' + icon(r[0], 14) + "</span>" +
        '<div class="d">' + md(r[1]) + "</div></div>";
    }).join("") + "</div>";
  }
  function tipBox(t) {
    var k = TIPS[t[0]] || TIPS.know;
    return '<div class="tip"><span class="ic">' + icon(k[0], 18) + '</span><div class="d"><b>' + k[1] + "</b> " + md(t[1]) + "</div></div>";
  }
  function chip(tag) {
    var g = TAGS[tag] || NOTAG;
    return '<span class="chip" style="--c: var(--color-' + g.color + ')">' + icon(g.icon, 12) + esc(tag) + "</span>";
  }

  // A feature (or the app): what it is, what this screen lets you do, how the simulator shows it
  function featureSheet(f) {
    var tags = [];
    (f.code || []).forEach(function (c) { if (tags.indexOf(c.tag) < 0) tags.push(c.tag); });
    return sheetHead(f.icon, f.color, f.title, f.lead) +
      (f.can && f.can.length ? sec("hand", "On this screen") + canRows(f.can) : "") +
      (f.sim && f.sim.length ? sec("monitor", "In the simulator") + box(f.sim) : "") +
      (f.tip ? tipBox(f.tip) : "") +
      (f.link ? '<a class="btn btn-sm mt-4 w-full" href="' + esc(f.link) + '">Source on GitHub · MIT</a>' :
        tags.length || f.foot ? '<div class="foot">' + tags.map(chip).join("") + (f.foot ? '<span class="d">' + md(f.foot) + "</span>" : "") + "</div>" : "");
  }
  // A snippet: what it does and where it comes from
  function codeSheet(c) {
    var g = TAGS[c.tag] || NOTAG;
    return sheetHead("code", "info", c.title || c.file, c.title ? c.file : "", true) +
      (c.rows && c.rows.length ? sec("info", "What it does") + box(c.rows, "info") : "") +
      sec(g.icon, "Where it comes from") +
      '<div class="li"><span class="ico ico-s" style="--c: var(--color-' + g.color + ')">' + icon(g.icon, 17) + "</span>" +
      '<div><div class="t">' + esc(c.tag) + '</div><div class="d">' + md(g.text) + "</div></div></div>";
  }

  var info = $("info");
  function openInfo(key) {
    var p = key.split(":"), title, html;
    if (p[0] === "app") { html = featureSheet(APP); title = APP.title; }
    else if (p[0] === "f") { var f = byId[p[1]]; html = featureSheet(f); title = f.title; }
    else { var c = byId[p[1]].code[+p[2]]; html = codeSheet(c); title = c.title || c.file; }
    $("infoBody").innerHTML = html;
    info.querySelector(".modal-box").scrollTop = 0;
    info.showModal();
    log("ⓘ " + esc(title));
  }


  // ===== A short note at the bottom of the screen =====

  var toastTimer = 0;
  function toast(text) {
    var t = $("toast");
    t.textContent = text; t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }


  // ===== The music button in the home header (features/music.js makes window.Music) =====

  function musicIcon(on) {
    Array.prototype.forEach.call(document.querySelectorAll("button[data-music=icon]"), function (b) { b.innerHTML = icon(on ? "vol" : "volx", 18); });
  }
  Demo.on("music", musicIcon);


  // ===== One click handler for the shared buttons =====

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-info],[data-copy],[data-open],[data-back],[data-tab],[data-music]");
    if (!el) return;
    var d = el.dataset;
    if (d.info) openInfo(d.info);
    else if (d.copy) { var p = d.copy.split(":"), c = byId[p[0]].code[+p[1]]; copy(c.src, c.file); }
    else if (d.open) show(d.open, true);
    else if ("back" in d) Demo.back();
    else if (d.tab) tab(el.closest("section"), d.tab);
    else if ("music" in d && window.Music) Music.toggle();
  });
  // A card is a div (it holds the ⓘ button): Enter and Space open it too
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".fcard")) { e.preventDefault(); show(e.target.dataset.open, true); }
  });
  // A dialog that closes gives the focus back to the button that opened it, and the browser draws a ring round it.
  // An app on a phone has no keyboard: take the focus off, so the button looks as it did before the press.
  // (close does not bubble, but the capture phase still passes through document)
  document.addEventListener("close", function () {
    var el = document.activeElement;
    if (el && el !== document.body) el.blur();
  }, true);


  // ===== The command line under the console runs code in this page =====
  // demo.go("ads") opens a screen; the features add the rest (demo.name, demo.busy).

  var demo = window.demo = window.demo || {};
  demo.go = function (id) { return show(id, true) ? "screen " + id : "no screen: " + id; };


  // ===== Start: every feature file has loaded by now =====

  document.addEventListener("DOMContentLoaded", function () {
    drawHome();
    if (!window.Music) Array.prototype.forEach.call(document.querySelectorAll("[data-music]"), function (b) { b.hidden = true; });
    else musicIcon(Music.isOn());
    show("home");
  });
})();
