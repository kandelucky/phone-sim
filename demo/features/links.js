// features/links.js: plain <a> links that leave the app. No script does the leaving.
// On a phone Capacitor opens an address that is not the app's own in another app (browser, Play Store, mail…)
// and ours goes to the background. sim-bridge.js stops the link and the simulator shows that app; ◁ comes back.
(function () {
  "use strict";

  var LINKS = [
    ["Website", "https:", "https://example.com"],
    ["Play Store", "market:", "market://details?id=com.android.chrome"],
    ["Mail", "mailto:", "mailto:someone@example.com?subject=Hello"],
    ["WhatsApp", "whatsapp:", "whatsapp://send?text=Hello"]
  ];

  Demo.add({
    id: "links", group: "out", title: "Links", hint: "Website, Play Store, mail", icon: "link", color: "info",
    lead: "A plain `<a>` link to another address leaves the app. No script does the leaving.",
    can: [
      ["globe", "info", "Website", "`https:` opens the browser."],
      ["bag", "success", "Play Store", "`market:` opens an app's Play Store page."],
      ["mail", "secondary", "Mail", "`mailto:` opens the mail app, the address and subject filled in."],
      ["chat", "accent", "WhatsApp", "`whatsapp:` opens only if WhatsApp is installed."]
    ],
    sim: [
      ["window", "A stand-in for the app that would open; this app goes to the background."],
      ["back", "[◁] brings you back."],
      ["terminal", "`whatsapp:` opens nothing here, as on a phone without WhatsApp: the console says so."]
    ],
    tip: ["know", "on a phone Capacitor opens every address that is not the app's own in another app. This app pauses (see Background)."],
    foot: "Plain links: no script needed.",
    code: [
      { file: "features/links.js", tag: "HTML",
        title: "Links that leave the app",
        rows: [
          ["link", "A plain `<a href>`: no script does the leaving."],
          ["globe", "`https:` browser · `market:` Play Store · `mailto:` mail · `whatsapp:` WhatsApp."],
          ["bag", "An app id in a `market:` link opens that app's Play Store page."]
        ],
        src: LINKS.map(function (l) { return '<a href="' + l[2] + '">' + l[0] + "</a>"; }).join("\n") }
    ],
    build: function (pane) {
      pane.innerHTML = LINKS.map(function (l) {
        return '<a class="btn w-full justify-between" href="' + l[2] + '"><span>' + l[0] + '</span><span class="text-xs opacity-60">' + l[1] + "</span></a>";
      }).join("");
    }
  });
})();
