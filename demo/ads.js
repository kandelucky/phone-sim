// ads.js: a banner and a full-screen ad (interstitial) through the AdMob plugin for Capacitor (@capacitor-community/admob).
// On a phone the native plugin answers. In the simulator sim-bridge.js gives a stand-in with the same calls and events
// (window.simAdMob) and the simulator draws a stand-in ad. The first line below picks the right one; anywhere else
// (a plain browser) there is none, and the buttons say so.
//
// What every app with ads has to do, shown here:
//   - the banner lies OVER the app and does not move it: make room from bannerAdSizeChanged (here #adRoom);
//   - a full-screen ad is loaded first (prepareInterstitial) and shown once (showInterstitial); load the next one when it closes;
//   - while it shows, the app keeps running: hold the game and the music, go on when it closes;
//   - no ad ("No fill": offline, or nothing to show; ⚙ → Ads in the simulator) must not stop the app.
// The ad unit ids are Google's public test ids: on a phone they bring Google's test ads, never real ones.
(function () {
  "use strict";
  var AdMob = window.Capacitor && Capacitor.isNativePlatform() ? Capacitor.Plugins.AdMob : window.simAdMob;
  var BANNER = "ca-app-pub-3940256099942544/6300978111", FULL = "ca-app-pub-3940256099942544/1033173712";
  var $ = function (id) { return document.getElementById(id); };
  var note = $("adNote"), room = $("adRoom"), btns = document.querySelectorAll("[data-ad]");
  var started = false, banner = "none", ready = false, loading = false;     // banner: "none" | "on" | "hidden"
  function say(t) { note.textContent = t; }

  if (!AdMob) {
    Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
    say("No AdMob here: open the demo in the simulator, or build the app with the plugin.");
    return;
  }

  // Starts once, when the Ads screen first opens, so the rest of the demo stays quiet
  function start() {
    if (started) return;
    started = true;
    AdMob.initialize();
    AdMob.addListener("bannerAdSizeChanged", function (s) { room.style.height = s.height + "px"; });   // 0 = hidden or gone
    AdMob.addListener("bannerAdLoaded", function () { say("Banner shown. The app made room for it: nothing sits under it."); });
    AdMob.addListener("bannerAdFailedToLoad", function (e) { banner = "none"; say("No banner (" + e.message + "): the screen stays as it is."); });
    AdMob.addListener("interstitialAdShowed", function () { Music.hold(true); log("ad on screen: music held"); });
    AdMob.addListener("interstitialAdDismissed", function () {
      Music.hold(false); log("ad closed: music goes on");
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
  document.querySelector('[data-go="ads"]').addEventListener("click", start);

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
})();
