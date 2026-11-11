// features/network.js: online / offline. The app reads navigator.onLine and hears the online / offline events,
// as on a phone; in the simulator ⚙ → Internet turns the network off.
(function () {
  "use strict";
  var badge = null;

  function net() {
    if (!badge) return;
    var on = navigator.onLine;
    badge.textContent = on ? "Online" : "Offline";
    badge.className = "badge " + (on ? "badge-success" : "badge-error");
  }
  window.addEventListener("online", function () { net(); log("online: the app can load again"); });
  window.addEventListener("offline", function () { net(); log("offline: the app goes on without the internet"); });

  Demo.add({
    id: "network", group: "phone", title: "Online / offline", hint: "Go on without the internet", icon: "wifi", color: "success",
    lead: "Is there a network, and when does it change? The app must go on without the internet.",
    can: [
      ["wifi", "success", "Online", "The badge is green: the app can load."],
      ["wifiOff", "error", "Offline", "Red: the app goes on with what it has."],
      ["bell", "info", "The change", "The `online` and `offline` events come the moment it changes."]
    ],
    sim: [
      ["gear", "[⚙] → [Internet] turns the network off and on."],
      ["terminal", "The console writes each change."]
    ],
    tip: ["know", "online means there is a network, not that your server answers. A request can still fail: handle it."],
    foot: "`navigator.onLine` and two events: no plugin.",
    code: [
      { file: "features/network.js", tag: "Web API",
        title: "Online / offline",
        rows: [
          ["wifi", "`navigator.onLine`: is there a network now."],
          ["bell", "`online` / `offline` events: the moment it changes. On a phone too, when Wi-Fi or mobile data goes."],
          ["play", "`net()` once at the start: the state at launch."]
        ],
        src:
'function net() {\n' +
'  badge.textContent = navigator.onLine ? "Online" : "Offline";\n' +
'}\n' +
'window.addEventListener("online", net);\n' +
'window.addEventListener("offline", net);\n' +
'net();' }
    ],
    build: function (pane) {
      pane.innerHTML = '<div class="box flex items-center gap-2"><span class="badge"></span><span class="text-sm muted">⚙ → Internet</span></div>';
      badge = pane.querySelector(".badge");
      net();
    }
  });
})();
