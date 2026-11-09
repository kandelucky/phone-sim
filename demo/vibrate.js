// vibrate.js: buttons that buzz the phone with navigator.vibrate(…).
// data-vib on a button = what navigator.vibrate gets: one number = one buzz (ms); a list = buzz, pause, buzz… (ms).
// Capacitor's Haptics plugin calls the same function when the app runs in a browser.
//
// In the simulator a zigzag lights up on each side of the phone for every buzz, and the console writes the pattern.
// On a phone, as in the simulator, the call is refused until the user has touched the page once.
(function () {
  "use strict";

  Array.prototype.forEach.call(document.querySelectorAll("[data-vib]"), function (b) {
    var parts = b.dataset.vib.split(",").map(Number);
    b.onclick = function () {
      if (navigator.vibrate) navigator.vibrate(parts.length === 1 ? parts[0] : parts);
    };
  });
})();
