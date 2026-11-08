// zoom.js: a picture you zoom with two fingers (pinch), move with one, and reset with a double tap.
//
// How it works:
//   - The picture (#zInner) is drawn with translate(x, y) scale(s) around the centre of the stage.
//   - Two fingers: the scale follows their distance (1× to 4×), and the point of the picture that was
//     between them stays between them. One finger: the picture follows it (only when zoomed in).
//   - Each time a finger comes or goes, the gesture starts again from where the picture is now (the anchor).
//     So 2 fingers → 1 finger → 2 fingers never jumps.
//   - The picture never shows an empty edge: x and y are kept within what the scale allows.
//   - A double tap: two short taps within 350 ms and 30 px of each other.
//
// In the simulator the mouse wheel is the pinch: two fingers around the cursor, wheel up = apart.
// touch-action: none on #zStage (index.html): the browser never takes these fingers.
(function () {
  "use strict";

  var stage = document.getElementById("zStage");
  var picture = document.getElementById("zInner");
  var badge = document.getElementById("zScale");

  var MIN = 1, MAX = 4;           // the scale's limits
  var TAP_MOVE = 10;              // px: a finger that moved more is not a tap
  var TAP_TIME = 300;             // ms: a tap is shorter
  var DOUBLE_TIME = 350;          // ms between the two taps of a double tap
  var DOUBLE_DIST = 30;           // px between them

  var view = { s: 1, x: 0, y: 0 };   // the picture now: scale and shift (px from the centre)
  var fingers = {};                  // pointerId → { x, y }, at most two
  var gesture = null;                // from the first finger down to the last one up
  var lastTap = null;                // { t, x, y } of the last tap, for the double tap

  // ===== Drawing =====

  function draw(anim) {
    picture.style.transition = anim ? "transform .25s ease" : "none";
    picture.style.transform = "translate(" + view.x + "px, " + view.y + "px) scale(" + view.s + ")";
    badge.textContent = view.s.toFixed(1) + "×";
  }

  // ===== Finger geometry =====

  // The fingers' midpoint (px from the stage centre), their distance, and whether there are two
  function between() {
    var ids = Object.keys(fingers), a = fingers[ids[0]], b = fingers[ids[1]] || a;
    var r = stage.getBoundingClientRect();
    return {
      x: (a.x + b.x) / 2 - r.left - r.width / 2,
      y: (a.y + b.y) / 2 - r.top - r.height / 2,
      d: Math.hypot(a.x - b.x, a.y - b.y),
      two: ids.length > 1
    };
  }

  // Start the gesture again from here: where the fingers are, where the picture is
  function anchor() {
    gesture.from = between();
    gesture.s = view.s;
    gesture.x = view.x;
    gesture.y = view.y;
  }

  // ===== Fingers =====

  stage.addEventListener("pointerdown", function (e) {
    if (Object.keys(fingers).length >= 2) return;              // a third finger is ignored
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (!gesture) gesture = { startScale: view.s, x0: e.clientX, y0: e.clientY, t0: Date.now(), moved: false, pinched: false };
    if (Object.keys(fingers).length > 1) gesture.pinched = true;
    anchor();
  });

  stage.addEventListener("pointermove", function (e) {
    if (!fingers[e.pointerId]) return;
    fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Math.abs(e.clientX - gesture.x0) > TAP_MOVE || Math.abs(e.clientY - gesture.y0) > TAP_MOVE) gesture.moved = true;

    var now = between(), from = gesture.from;

    // Scale: follows the distance between two fingers; one finger keeps it
    var s = now.two && from.d > 0 ? gesture.s * now.d / from.d : gesture.s;
    s = Math.max(MIN, Math.min(MAX, s));

    // Shift: the point of the picture that was under the fingers stays under them.
    // That point sat at (from − start shift) / start scale; at the new scale and midpoint, the shift is:
    view.s = s;
    view.x = now.x - (from.x - gesture.x) * s / gesture.s;
    view.y = now.y - (from.y - gesture.y) * s / gesture.s;

    // No empty edge: a picture s times bigger can move (s − 1) / 2 of the stage each way
    var r = stage.getBoundingClientRect();
    var maxX = (s - 1) * r.width / 2, maxY = (s - 1) * r.height / 2;
    view.x = Math.max(-maxX, Math.min(maxX, view.x));
    view.y = Math.max(-maxY, Math.min(maxY, view.y));

    draw(false);
  });

  function release(e) {
    if (!fingers[e.pointerId]) return;
    delete fingers[e.pointerId];
    if (Object.keys(fingers).length) { anchor(); return; }    // one finger is still down: it goes on moving the picture

    var g = gesture, now = Date.now();
    gesture = null;

    // A double tap resets the picture
    var tap = !g.pinched && !g.moved && now - g.t0 < TAP_TIME;
    var isDouble = tap && lastTap && now - lastTap.t < DOUBLE_TIME &&
                 Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_DIST;
    if (isDouble) {
      lastTap = null;
      view = { s: 1, x: 0, y: 0 };
      draw(true);
      log("zoom: double tap, back to 1×");
      return;
    }
    lastTap = tap ? { t: now, x: e.clientX, y: e.clientY } : null;

    // One console line per gesture, at its end
    if (view.s.toFixed(1) !== g.startScale.toFixed(1)) log("zoom: " + view.s.toFixed(1) + "×");
    else if (g.moved && view.s > 1) log("zoom: moved");
  }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
})();
