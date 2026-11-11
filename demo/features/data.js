// features/data.js: saved data (localStorage). The demo keeps one key: the name typed on the Keyboard screen.
// The home screen greets it; the simulator's Data tab shows it; Data → Clear data, then ↻ Reload = a first launch.
//
// For the other files and the command line:
//   demo.name("Ann")   saves a name (demo.name("") forgets it); Demo.emit("name", n) tells the screens
//   Demo.savedName()   the saved name, or ""
(function () {
  "use strict";
  var KEY = "demo-name";                          // the one key this demo keeps in localStorage
  var demo = window.demo = window.demo || {};
  var out = null;

  function saved() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  Demo.savedName = saved;

  // setItem / removeItem, not localStorage.x = …: the Data tab updates by itself only on these
  demo.name = function (n) {
    n = String(n == null ? "" : n).trim().slice(0, 24);
    try { if (n) localStorage.setItem(KEY, n); else localStorage.removeItem(KEY); }
    catch (e) { log("name not saved: " + Demo.esc(e.message)); return "not saved"; }
    log(n ? "name saved: " + Demo.esc(n) : "name forgotten");      // log() takes HTML: the name goes in as text
    Demo.emit("name", n);
    return n || "(no name)";
  };

  // The home header and this screen follow the name
  function draw(n) {
    document.getElementById("hello").textContent = n ? "Hello, " + n : "Try it · read the code · copy it";
    if (out) out.innerHTML = '<span class="muted">' + KEY + "</span><b>" + (n ? '"' + Demo.esc(n) + '"' : "—") + "</b>";
  }
  Demo.on("name", draw);
  draw(saved());

  Demo.add({
    id: "data", group: "dev", title: "Saved data", hint: "localStorage", icon: "database", color: "info",
    lead: "`localStorage` keeps small data on the phone between launches.",
    can: [
      ["type", "accent", "Save a name", "Type it on the Keyboard screen: it is saved under `demo-name`."],
      ["eye", "info", "See it", "This screen shows the key and its value; the home screen greets the name."],
      ["trash", "error", "Forget the name", "Removes the key."]
    ],
    sim: [
      ["database", "The Data tab beside the console shows every key."],
      ["trash", "[Clear data] (press twice), then [↻ Reload] = a first launch."],
      ["terminal", "In the command line: `demo.name(\"Ann\")` saves a name."]
    ],
    tip: ["watch", "clearing the app's data in Android settings wipes it. Full or blocked storage throws: keep it in `try`."],
    foot: "`localStorage`: no plugin.",
    code: [
      { file: "features/data.js", tag: "Web API",
        title: "localStorage",
        rows: [
          ["save", "`setItem` saves, `getItem` reads (`null` if there is none), `removeItem` forgets."],
          ["database", "Use `setItem` / `removeItem`, not `localStorage.x = …`: the simulator's Data tab updates by itself only on these; anything else shows after Refresh in the tab."],
          ["alert", "Full or blocked storage throws: keep it in `try`."]
        ],
        src:
'try {\n' +
'  localStorage.setItem("demo-name", "Ann");\n' +
'  var name = localStorage.getItem("demo-name") || "";\n' +
'  localStorage.removeItem("demo-name");\n' +
'} catch (e) {\n' +
'  log("not saved: " + e.message);\n' +
'}' }
    ],
    build: function (pane) {
      pane.innerHTML = '<div class="box kv"></div><button class="btn w-full">Forget the name</button>';
      out = pane.firstChild;
      draw(saved());
      pane.querySelector("button").onclick = function () { demo.name(""); };
    }
  });
})();
