// features/back.js: Android's back button. core.js does the work (goBack: a dialog first, then the previous
// screen, then "Exit the app?" on the first screen); this screen lets you try each step.
// "Open a screen inside" goes one step deeper (Home → Back button → inside): back returns one step at a time.
(function () {
  "use strict";

  var dialog = null;

  Demo.add({
    id: "back", group: "phone", title: "Back button", hint: "◁ and the exit question", icon: "undo", color: "primary",
    lead: "Android's ◁ goes back one step at a time.",
    can: [
      ["window", "primary", "Open a dialog", "◁ closes it first: the screen behind it stays."],
      ["layers", "secondary", "Open a screen inside", "Two steps deep: ◁ ◁ comes back one screen at a time."],
      ["logout", "error", "Exit the app", "Asks “Exit the app?”, as ◁ does on the first screen. Yes closes the app."]
    ],
    sim: [
      ["back", "[◁] (or the back gesture) calls `onBack`."],
      ["phone", "An iPhone has no back button: every inner screen needs its own ←."],
      ["terminal", "The console writes each step: dialog closed, exit yes / no."]
    ],
    tip: ["know", "on a phone the Capacitor App plugin sends `backButton`. Give it the same function as `onBack`."],
    foot: "`onBack()` from sim-bridge.js in the simulator; the App plugin on a phone.",
    code: [
      { file: "core.js", tag: "sim-bridge.js",
        title: "goBack: three steps",
        rows: [
          ["window", "1. An open dialog closes."],
          ["layers", "2. Otherwise the previous screen comes back."],
          ["logout", "3. On the first screen: ask before exiting."],
          ["plug", "`onBack()` in the simulator, the App plugin's `backButton` on a phone: give both the same function."]
        ],
        src:
'function goBack() {\n' +
'  var open = document.querySelectorAll("dialog[open]");\n' +
'  if (open.length) open[open.length - 1].close();   // 1. a dialog closes\n' +
'  else if (trail.length) show(trail.pop());          // 2. the previous screen\n' +
'  else quit.showModal();                             // 3. first screen: ask\n' +
'}\n' +
'onBack(goBack);                                          // simulator\n' +
'Capacitor.Plugins.App.addListener("backButton", goBack); // phone' },
      { file: "core.js", tag: "Capacitor",
        title: "Exit the app",
        rows: [
          ["logout", "The Yes button of the exit dialog."],
          ["phone", "On a phone: `App.exitApp()`."],
          ["power", "In the simulator `simExit()` does what [⏻] does."]
        ],
        src:
'if (window.Capacitor) Capacitor.Plugins.App.exitApp();   // phone\n' +
'else simExit();                                          // simulator' }
    ],
    build: function (pane) {
      pane.innerHTML =
        '<button class="btn w-full justify-between" data-b="dialog"><span>Open a dialog</span><span class="text-xs opacity-60">then ◁</span></button>' +
        '<button class="btn w-full justify-between" data-b="inside"><span>Open a screen inside</span><span class="text-xs opacity-60">then ◁ ◁</span></button>' +
        '<button class="btn w-full" data-b="exit">Exit the app</button>';
      pane.querySelector('[data-b="dialog"]').onclick = function () {
        if (!dialog) {
          dialog = document.createElement("dialog");
          dialog.className = "modal";
          dialog.innerHTML = '<div class="modal-box max-w-xs"><h3 class="text-lg font-bold">A dialog</h3>' +
            '<p class="text-sm muted mt-2">◁ closes it first: the screen behind it stays.</p>' +
            '<div class="modal-action"><form method="dialog"><button class="btn">Close</button></form></div></div>' +
            '<form method="dialog" class="modal-backdrop"><button>close</button></form>';
          document.body.appendChild(dialog);
        }
        dialog.showModal();
        log("dialog open: ◁ closes it");
      };
      pane.querySelector('[data-b="inside"]').onclick = function () { Demo.open("back-inside"); };
      pane.querySelector('[data-b="exit"]').onclick = function () { Demo.askExit(); };
    }
  });

  // A screen two steps from home, with no card of its own
  Demo.page({
    id: "back-inside", title: "A screen inside",
    build: function (pane) {
      pane.innerHTML = '<div class="box text-sm">Home → Back button → here.<br>← and ◁ go back one step at a time. ' +
        'On the home screen ◁ asks before the app exits.</div>';
    }
  });
})();
