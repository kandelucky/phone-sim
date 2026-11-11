// features/fps.js: the app busy, nothing drawn. ⚙ → FPS meter in the simulator shows the drop.
// demo.busy(2000) in the command line: the app stops for 2 s.
(function () {
  "use strict";
  var demo = window.demo = window.demo || {};

  // A loop that never lets the page draw, like heavy work in a game frame
  demo.busy = function (ms) {
    ms = Math.min(Math.max(Math.round(+ms) || 500, 50), 5000);
    var end = performance.now() + ms;
    while (performance.now() < end) { /* busy */ }
    log("busy " + ms + " ms: no frame drawn meanwhile");
    return "busy " + ms + " ms";
  };

  Demo.add({
    id: "fps", group: "dev", title: "FPS", hint: "When the app is busy", icon: "gauge", color: "error",
    lead: "While JavaScript runs, nothing is drawn.",
    can: [
      ["hourglass", "error", "Busy for 0.5 s", "A loop that never lets the page draw: half a second with no frame."],
      ["gauge", "warning", "The drop", "Heavy work inside one frame = a stutter you can see."]
    ],
    sim: [
      ["gear", "[⚙] → [FPS meter] shows the frames per second."],
      ["terminal", "`demo.busy(2000)` in the command line: 2 s with no frame (50 ms to 5 s)."]
    ],
    tip: ["know", "at 60 frames a second one frame has about 16 ms. Split long work, or move it to a Web Worker."],
    foot: "`performance.now()`: no plugin.",
    code: [
      { file: "features/fps.js", tag: "Web API",
        title: "Busy",
        rows: [
          ["hourglass", "A loop that never lets the page draw, like heavy work inside a game frame."],
          ["clock", "`performance.now()`: milliseconds, precise."]
        ],
        src:
'function busy(ms) {\n' +
'  var end = performance.now() + ms;\n' +
'  while (performance.now() < end) { }    // nothing is drawn meanwhile\n' +
'}\n' +
'busy(500);' }
    ],
    build: function (pane) {
      pane.innerHTML = '<button class="btn w-full justify-between"><span>Busy for 0.5 s</span><span class="text-xs opacity-60">demo.busy(500)</span></button>';
      pane.querySelector("button").onclick = function () { demo.busy(500); };
    }
  });
})();
