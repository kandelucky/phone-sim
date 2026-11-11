// features/console.js: the simulator's console is the app's diary.
//   log("ping pressed")   one line with the time; HTML is allowed: log("<b>buy</b> 50")
//   simScreen("touch")    the line "snapshot: screen touch"; core.js calls it on every screen change
//   an uncaught error     shows by itself in red, with the file and the line
// The command line under the console runs code in this page: window.demo (core.js, data.js, fps.js).
(function () {
  "use strict";

  Demo.add({
    id: "console", group: "dev", title: "Console", hint: "log() and the command line", icon: "terminal", color: "base-content",
    lead: "The console beside the phone is the app's diary.",
    can: [
      ["terminal", "primary", "Ping", "`log(\"ping pressed\")`: one line with the time."],
      ["bold", "accent", "A line with HTML", "`log()` takes HTML: *buy* 50."],
      ["alert", "error", "Errors", "An uncaught error shows by itself in red, with the file and the line."]
    ],
    sim: [
      ["terminal", "The command line under the console runs code inside the app:"],
      ["play", "`demo.go(\"ads\")` opens a screen"],
      ["save", "`demo.name(\"Ann\")` saves a name"],
      ["hourglass", "`demo.busy(2000)` stops the app for 2 s"]
    ],
    tip: ["know", "the command line can call anything on `window`. What the call returns is written back (a string in quotes)."],
    foot: "Outside the simulator `log()` does nothing: the same code ships in the APK.",
    code: [
      { file: "core.js", tag: "sim-bridge.js",
        title: "log()",
        rows: [
          ["terminal", "`log()`: one line with the time in the console."],
          ["bold", "HTML is allowed: `<b>buy</b> 50`."],
          ["camera", "`simScreen(\"home\")` writes the line “snapshot: screen home”."],
          ["ban", "Outside the simulator they do nothing."]
        ],
        src:
'log("ping pressed");\n' +
'log("<b>buy</b> 50");          // HTML is allowed\n' +
'simScreen("home");             // the line "snapshot: screen home"' },
      { file: "core.js", tag: "sim-bridge.js",
        title: "Your own commands",
        rows: [
          ["terminal", "Whatever is on `window`, the command line can call."],
          ["enter", "What it returns is written back under the command."]
        ],
        src:
'window.demo = {\n' +
'  go: function (id) { show(id); return "screen " + id; }\n' +
'};\n' +
'// in the command line:  demo.go("ads")' }
    ],
    build: function (pane) {
      pane.innerHTML =
        '<button class="btn w-full justify-between" data-c="ping"><span>Ping</span><span class="text-xs opacity-60">log()</span></button>' +
        '<button class="btn w-full justify-between" data-c="html"><span>A line with HTML</span><span class="text-xs opacity-60">&lt;b&gt;</span></button>' +
        '<div class="box text-sm"><div class="muted mb-1">In the command line:</div>' +
          '<code>demo.go("ads")</code><br><code>demo.name("Ann")</code><br><code>demo.busy(2000)</code></div>';
      pane.querySelector('[data-c="ping"]').onclick = function () { log("ping pressed"); };
      pane.querySelector('[data-c="html"]').onclick = function () { log("<b>buy</b> 50"); };
    }
  });
})();
