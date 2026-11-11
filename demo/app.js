// app.js: the demo's frame. Screens, the back button, the exit dialog, the background.
// Loads last, after the other demo files, and opens the first screen.
//
// From sim-bridge.js: log(), simScreen(), onBack(), onPause(), onResume(), simExit().
// Outside the simulator they do nothing (onPause / onResume run on the real event),
// so this file works unchanged in an APK.
//
// The console (the simulator's right panel) is the app's diary. Every demo file writes to it:
//   log("ping pressed")   one line with the time; HTML is allowed: log("<b>buy</b> 50")
//   simScreen("touch")    the line "snapshot: screen touch"; show() below calls it on every screen change
//   an uncaught error     shows by itself in red, with the file and the line
// The simulator adds its own lines (back, background, theme, volume…). Use log(), not console.log():
// the console is where you see the app's logic without DevTools.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };


  // ===== Screens =====
  // One <section> per screen; show(id) makes it the visible one.
  // The trail remembers where we came from, so back can return there.
  // Going to the screen we came from pops the trail instead of pushing.

  var current = null, trail = [];

  function show(id) {
    if (current && current !== id) {
      if (trail[trail.length - 1] === id) trail.pop(); else trail.push(current);
    }
    current = id;
    Array.prototype.forEach.call($("app").children, function (s) { s.classList.toggle("on", s.id === id); });
    simScreen(id);                       // console: "snapshot: screen …"
  }

  // The home screen's buttons: data-go="touch" opens the screen with id="touch"
  Array.prototype.forEach.call(document.querySelectorAll("[data-go]"), function (b) {
    b.onclick = function () { show(b.dataset.go); };
  });

  // The command line under the console runs code in this page: demo.go("ads") opens a screen.
  // more.js adds the rest of window.demo.
  var demo = window.demo = window.demo || {};
  demo.go = function (id) {
    var s = $(String(id));
    if (!s || s.parentNode !== $("app")) return "no screen: " + id;
    show(s.id);
    return "screen " + s.id;
  };


  // ===== Back: ◁ on the phone, or the simulator's back button =====
  // First an open dialog closes, then the previous screen comes back,
  // and on the first screen the app asks before it exits (the usual Android pattern).

  var quitDialog = $("quit");

  onBack(function () {
    if (quitDialog.open) { quitDialog.close(); log("back: exit dialog closed"); }
    else if (trail.length) show(trail[trail.length - 1]);
    else { quitDialog.showModal(); log("back: first screen, asking to exit"); }
  });

  // ← at the top of every inner screen: the same step back as ◁. It is never on the first screen, so it never asks to exit.
  Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (b) {
    b.onclick = function () { if (trail.length) show(trail[trail.length - 1]); };
  });

  $("quitNo").onclick = function () { quitDialog.close(); log("exit: no"); };
  $("quitYes").onclick = function () { quitDialog.close(); log("exit: yes"); quit(); };

  // Leaving the app: on a phone Capacitor closes it; in the simulator simExit() does what ⏻ does.
  function quit() {
    if (window.Capacitor) Capacitor.Plugins.App.exitApp();
    else simExit();
  }


  // ===== Background: ○ Home or ⏸ in the simulator; Home or another app on a phone =====
  // A killed app gets no warning, so onPause is where a real app saves its progress.
  // The music stops with the app and goes on when it comes back.

  var awayAt = 0, noteTimer = 0;

  onPause(function () {
    awayAt = Date.now();
    Music.hold(true);
    log("pause: music held; the app would save its progress here");
  });

  onResume(function () {
    var seconds = Math.round((Date.now() - awayAt) / 1000);
    Music.hold(false);
    log("resume: back after " + seconds + " s");
    $("note").textContent = "Welcome back, away " + seconds + " s";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { $("note").textContent = ""; }, 3000);
  });


  // ===== Home screen buttons =====

  $("ping").onclick = function () { log("ping pressed"); };

  $("music").onclick = function () {
    this.textContent = "Music: " + (Music.toggle() ? "on" : "off");
  };


  show("home");
})();
