// features/background.js: the app going to the background and coming back.
// core.js hears it (onPause / onResume from sim-bridge.js) and tells every feature: Demo.on("pause" | "resume").
// Here: how long the app was away, and how many times. The music holds by itself (features/music.js).
(function () {
  "use strict";

  var times = 0, last = null, out = null;
  function draw() {
    if (!out) return;
    out.innerHTML = '<div class="kv"><span class="muted">away last time</span><b>' + (last == null ? "—" : last + " s") + "</b></div>" +
      '<div class="kv mt-1"><span class="muted">times in the background</span><b>' + times + "</b></div>";
  }
  Demo.on("resume", function (seconds) { times++; last = seconds; draw(); });

  Demo.add({
    id: "background", group: "phone", title: "Background", hint: "Pause and come back", icon: "pause", color: "secondary",
    lead: "Home or another app sends this app to the background. Android may close it there without a warning.",
    can: [
      ["clock", "secondary", "Away last time", "How many seconds the app was in the background."],
      ["repeat", "primary", "Times in the background", "How many times it went to the background."],
      ["music", "accent", "The music holds", "It goes on from the same beat when the app comes back."]
    ],
    sim: [
      ["circle", "[○ Home] or [⏸] sends the app to the background."],
      ["power", "[⏻] closes it, like a phone that kills the app."],
      ["terminal", "The console writes each pause."]
    ],
    tip: ["watch", "a killed app gets no warning. Save the progress when it pauses, not when it closes."],
    foot: "`onPause` / `onResume` from sim-bridge.js hang on `visibilitychange`: on a phone they run on the real event.",
    code: [
      { file: "core.js", tag: "sim-bridge.js",
        title: "onPause / onResume",
        rows: [
          ["save", "`onPause`: the last chance to save. A killed app gets no warning."],
          ["music", "Hold the music; `onResume` lets it go on."],
          ["globe", "Both hang on `visibilitychange`, so on a phone they run on the real event."]
        ],
        src:
'onPause(function () {\n' +
'  save();               // the last chance: a killed app gets no warning\n' +
'  Music.hold(true);\n' +
'});\n' +
'onResume(function () {\n' +
'  Music.hold(false);\n' +
'});' },
      { file: "any page", tag: "Web API",
        title: "Without the bridge",
        rows: [
          ["eyeOff", "`visibilitychange` + `document.hidden`: the same thing in any page."]
        ],
        src:
'document.addEventListener("visibilitychange", function () {\n' +
'  if (document.hidden) save();\n' +
'});' }
    ],
    build: function (pane) {
      pane.innerHTML = '<div class="box"></div>';
      out = pane.firstChild;
      draw();
    }
  });
})();
