// features/ads.js: a banner and a full-screen ad (interstitial) through the AdMob plugin for Capacitor (@capacitor-community/admob).
// On a phone the native plugin answers. In the simulator sim-bridge.js gives a stand-in with the same calls and events
// (window.simAdMob) and the simulator draws a stand-in ad. The first line below picks the right one; anywhere else
// (a plain browser) there is none, and the screen says so.
//
// What every app with ads has to do, shown here:
//   - the banner lies OVER the app and does not move it: make room from bannerAdSizeChanged (here the room under the tabs);
//   - a full-screen ad is loaded first (prepareInterstitial) and shown once (showInterstitial); load the next one when it closes;
//   - while it shows, the app may keep running: hold the game and the music yourself, go on when it closes;
//   - no ad ("No fill": offline, or nothing to show; ⚙ → Ads in the simulator) must not stop the app.
// The ad unit ids are Google's public test ids: on a phone they bring Google's test ads, never real ones.
(function () {
  "use strict";
  var AdMob = window.Capacitor && Capacitor.isNativePlatform() ? Capacitor.Plugins.AdMob : window.simAdMob;
  var BANNER = "ca-app-pub-3940256099942544/6300978111", FULL = "ca-app-pub-3940256099942544/1033173712";
  var note, room;
  var started = false, banner = "none", ready = false, loading = false;     // banner: "none" | "on" | "hidden"
  function say(t) { note.textContent = t; }
  function music(hold) { if (window.Music) Music.hold(hold); }

  Demo.add({
    id: "ads", group: "out", title: "Ads", hint: "Banner and full-screen ad", icon: "megaphone", color: "warning",
    lead: "A banner and a full-screen ad through the AdMob plugin for Capacitor.",
    can: [
      ["panelBottom", "warning", "Show banner", "320×50 at the bottom. It lies over the app, so the app makes room for it."],
      ["eyeOff", "secondary", "Hide banner", "Its room closes too."],
      ["full", "accent", "Full-screen ad", "Loaded first, shown once; the next one loads when it closes. The music waits."],
      ["ban", "error", "No ad", "Offline or nothing to show: the app goes on as if nothing happened."]
    ],
    sim: [
      ["megaphone", "Stand-in ads with the same calls and events as the plugin."],
      ["gear", "[⚙] → [Ads] → [No ads]: every ad fails. The app must go on."],
      ["terminal", "The console writes when an ad shows and closes."]
    ],
    tip: ["watch", "the ids here are Google's public test ids: they never bring real ads. Your own ids go only into the release build."],
    foot: "`@capacitor-community/admob`: install it in the app (npm).",
    code: [
      { file: "features/ads.js", tag: "Capacitor",
        title: "Banner",
        rows: [
          ["plug", "`Capacitor.Plugins.AdMob` on a phone; `window.simAdMob` in the simulator."],
          ["panelBottom", "`showBanner`: 320×50 at the bottom, with Google's test id."],
          ["layers", "The banner lies over the app: `bannerAdSizeChanged` gives its height, make that much room. 0 = hidden or gone."]
        ],
        src:
'var AdMob = Capacitor.Plugins.AdMob;   // in the simulator: window.simAdMob\n' +
'AdMob.initialize();\n' +
'\n' +
'AdMob.showBanner({\n' +
'  adId: "ca-app-pub-3940256099942544/6300978111",   // Google\'s test id\n' +
'  adSize: "BANNER", position: "BOTTOM_CENTER", isTesting: true\n' +
'});\n' +
'// the banner covers the app: make room under the content\n' +
'AdMob.addListener("bannerAdSizeChanged", function (s) {\n' +
'  room.style.height = s.height + "px";     // 0 = hidden or gone\n' +
'});' },
      { file: "features/ads.js", tag: "Capacitor",
        title: "Full-screen ad",
        rows: [
          ["download", "`prepareInterstitial` loads it, `showInterstitial` shows it once. Load the next one when it closes."],
          ["ban", "No ad (offline, nothing to show) lands in `catch`: the app goes on."],
          ["music", "While it shows, the app may keep running: hold the music and the game yourself, go on when it closes."]
        ],
        src:
'AdMob.prepareInterstitial({\n' +
'  adId: "ca-app-pub-3940256099942544/1033173712", isTesting: true\n' +
'}).then(function () {\n' +
'  AdMob.showInterstitial();\n' +
'}).catch(function (e) {\n' +
'  log("no ad: " + e.message);           // the app goes on without it\n' +
'});\n' +
'// while it shows, the app may keep running: hold the music, the game\n' +
'AdMob.addListener("interstitialAdShowed", function () { Music.hold(true); });\n' +
'AdMob.addListener("interstitialAdDismissed", function () { Music.hold(false); });' }
    ],
    build: function (pane, screen) {
      pane.innerHTML =
        '<button class="btn w-full justify-between" data-ad="banner"><span>Show banner</span><span class="text-xs opacity-60">bottom, 320×50</span></button>' +
        '<button class="btn w-full" data-ad="hide">Hide banner</button>' +
        '<button class="btn w-full" data-ad="full">Full-screen ad</button>' +
        '<p class="text-sm muted min-h-10"></p>';
      note = pane.querySelector("p");
      // the room the app makes for the banner: as high as the banner (bannerAdSizeChanged), 0 when there is none
      room = document.createElement("div");
      room.className = "shrink-0"; room.style.height = "0";
      screen.appendChild(room);

      var btns = pane.querySelectorAll("[data-ad]");
      if (!AdMob) {
        Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
        say("No AdMob here: open the demo in the simulator, or build the app with the plugin.");
        return;
      }
      var act = {
        banner: function () {
          if (banner === "hidden") { AdMob.resumeBanner(); banner = "on"; return; }
          if (banner === "on") return;
          banner = "on"; say("Banner: loading…");
          AdMob.showBanner({ adId: BANNER, adSize: "BANNER", position: "BOTTOM_CENTER", isTesting: true });
        },
        hide: function () {
          if (banner !== "on") return;
          AdMob.hideBanner(); banner = "hidden";
          say("Banner hidden: its room closes too.");
        },
        full: function () {
          if (!ready) { say("Not loaded yet, or no ad came. Try again in a moment."); if (!loading) load(); return; }
          ready = false;
          AdMob.showInterstitial();
        }
      };
      Array.prototype.forEach.call(btns, function (b) { b.onclick = function () { start(); act[b.dataset.ad](); }; });
    },
    // Starts on the first open, so the rest of the demo stays quiet
    open: function () { if (AdMob) start(); }
  });

  function start() {
    if (started) return;
    started = true;
    AdMob.initialize();
    AdMob.addListener("bannerAdSizeChanged", function (s) { room.style.height = s.height + "px"; });   // 0 = hidden or gone
    AdMob.addListener("bannerAdLoaded", function () { say("Banner shown. The app made room for it: nothing sits under it."); });
    AdMob.addListener("bannerAdFailedToLoad", function (e) { banner = "none"; say("No banner (" + e.message + "): the screen stays as it is."); });
    AdMob.addListener("interstitialAdShowed", function () { music(true); log("ad on screen: music held"); });
    AdMob.addListener("interstitialAdDismissed", function () {
      music(false); log("ad closed: music goes on");
      say("Closed. The app goes on; the next ad is loading.");
      load();
    });
    load();
  }
  function load() {
    ready = false; loading = true;
    AdMob.prepareInterstitial({ adId: FULL, isTesting: true })
      .then(function () { ready = true; })
      .catch(function (e) { say("No full-screen ad (" + e.message + "): the app goes on without it."); })
      .then(function () { loading = false; });
  }
})();
