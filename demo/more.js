// more.js: the More screen. Three things to test in the simulator, each with a command for the command line:
//   - a name field: the keyboard comes up; the name is saved (localStorage) and the home screen greets it.
//     The simulator's Data tab shows it; Data → Clear data, then ↻ Reload, and the app starts as on a first launch.
//   - online / offline: ⚙ → Internet. The app reads navigator.onLine and hears the online / offline events, as on a phone.
//   - Busy: the app stops for a moment. ⚙ → FPS meter shows the drop.
//
// window.demo = what the command line under the console can call (it runs code in this page):
//   demo.go("ads")      opens a screen (app.js)
//   demo.name("Ann")    saves a name, as the field does; demo.name("") forgets it
//   demo.busy(2000)     the app stops for 2 s
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var demo = window.demo = window.demo || {};
  var KEY = "demo-name";                          // the one key this demo keeps in localStorage

  // log() takes HTML: a typed name goes in as plain text
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }


  // ===== Name: the keyboard and saved data =====
  // setItem / removeItem, not localStorage.x = …: the Data tab sees only these.

  function saved() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function greet() { var n = saved(); $("hello").textContent = n ? "Hello, " + n : "Hello"; }

  demo.name = function (n) {
    n = String(n == null ? "" : n).trim().slice(0, 24);
    try { if (n) localStorage.setItem(KEY, n); else localStorage.removeItem(KEY); }
    catch (e) { log("name not saved: " + esc(e.message)); return "not saved"; }
    $("nameIn").value = n;
    greet();
    log(n ? "name saved: " + esc(n) : "name forgotten");
    return n || "(no name)";
  };

  // Save, or Enter on the keyboard: the form sends; blur() puts the keyboard away
  $("nameForm").onsubmit = function (e) { e.preventDefault(); demo.name($("nameIn").value); $("nameIn").blur(); };

  $("nameIn").value = saved();
  greet();


  // ===== Online / offline =====

  function net() {
    var on = navigator.onLine;
    $("net").textContent = on ? "Online" : "Offline";
    $("net").className = "badge " + (on ? "badge-success" : "badge-error");
  }
  window.addEventListener("online", function () { net(); log("online: the app can load again"); });
  window.addEventListener("offline", function () { net(); log("offline: the app goes on without the internet"); });
  net();


  // ===== Busy: nothing is drawn while the app works =====
  // A loop that never lets the page draw, like heavy work in a game frame.

  demo.busy = function (ms) {
    ms = Math.min(Math.max(Math.round(+ms) || 500, 50), 5000);
    var end = performance.now() + ms;
    while (performance.now() < end) { /* busy */ }
    log("busy " + ms + " ms: no frame drawn meanwhile");
    return "busy " + ms + " ms";
  };
  $("busy").onclick = function () { demo.busy(500); };
})();
