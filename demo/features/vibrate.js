// features/vibrate.js: buttons that buzz the phone with navigator.vibrate(…).
// data-vib on a button = what navigator.vibrate gets: one number = one buzz (ms); a list = buzz, pause, buzz… (ms).
// Capacitor's Haptics plugin calls the same function when the app runs in a browser.
// In an APK it buzzes only with <uses-permission android:name="android.permission.VIBRATE"/> in AndroidManifest.xml,
// and never while the user has Touch feedback off (Android counts it as touch feedback). It returns true either way.
// In the simulator a zigzag lights up on each side of the phone for every buzz, and the console writes the pattern.
(function () {
  "use strict";

  Demo.add({
    id: "vibrate", group: "feel", title: "Vibrate", hint: "Three buzz patterns", icon: "vibrate", color: "secondary",
    lead: "`navigator.vibrate` makes the phone buzz. One number = one buzz; a list = buzz, pause, buzz…",
    can: [
      ["zap", "primary", "Short", "One 50 ms buzz: a tap you can feel."],
      ["clock", "secondary", "Long", "One 400 ms buzz."],
      ["activity", "accent", "Rhythm", "200 · 100 · 200 ms: buzz, pause, buzz."]
    ],
    sim: [
      ["vibrate", "A zigzag lights up on each side of the phone for every buzz."],
      ["terminal", "The console writes the pattern."],
      ["pointer", "As on a phone: nothing buzzes before the first touch."],
      ["alert", "The simulator does not check the permission or Touch feedback: try it on a phone."]
    ],
    tip: ["watch", "in an APK it buzzes only with the `VIBRATE` permission in AndroidManifest.xml, and never when the user has Touch feedback off (Settings → Vibration & haptics). It returns `true` either way."],
    foot: "No plugin, but an APK needs the `VIBRATE` permission.",
    code: [
      { file: "features/vibrate.js", tag: "Web API",
        title: "navigator.vibrate",
        rows: [
          ["zap", "One number = one buzz, in ms."],
          ["activity", "A list = buzz, pause, buzz… (ms)."],
          ["alert", "Some browsers have none: `if (navigator.vibrate)` first."],
          ["fileCode", "In an APK, AndroidManifest.xml needs `<uses-permission android:name=\"android.permission.VIBRATE\"/>`. Without it nothing buzzes."],
          ["ban", "It returns `true` even when nothing buzzes: the app cannot tell."],
          ["gear", "Android counts it as touch feedback: with Touch feedback off it is silent."],
          ["plug", "Capacitor's Haptics plugin calls this same function when the app runs in a browser."]
        ],
        src:
'navigator.vibrate(50);                 // one buzz, 50 ms\n' +
'navigator.vibrate(400);                // a long one\n' +
'navigator.vibrate([200, 100, 200]);    // buzz, pause, buzz (ms)\n' +
'\n' +
'if (navigator.vibrate) navigator.vibrate(50);   // safe everywhere' }
    ],
    build: function (pane) {
      pane.innerHTML =
        '<button class="btn w-full justify-between" data-vib="50"><span>Short</span><span class="text-xs opacity-60">50 ms</span></button>' +
        '<button class="btn w-full justify-between" data-vib="400"><span>Long</span><span class="text-xs opacity-60">400 ms</span></button>' +
        '<button class="btn w-full justify-between" data-vib="200,100,200"><span>Rhythm</span><span class="text-xs opacity-60">200 · 100 · 200 ms</span></button>';
      Array.prototype.forEach.call(pane.querySelectorAll("[data-vib]"), function (b) {
        var parts = b.dataset.vib.split(",").map(Number);
        b.onclick = function () {
          if (navigator.vibrate) navigator.vibrate(parts.length === 1 ? parts[0] : parts);
        };
      });
    }
  });
})();
