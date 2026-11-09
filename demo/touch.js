// touch.js: one picture for every gesture: swipe it, pinch it, move it, double tap it.
//
// How it works:
//   - The picture (#tInner) is drawn with translate(x, y) scale(s) around the centre of the stage,
//     plus a small swipe shift (the nudge) on top.
//   - At 1×, one finger is a swipe: the picture moves only 15 % of the finger's way. On release it is a swipe if the
//     finger went 40 px, or flicked fast after at least 20 px; the direction is the axis it moved more along.
//     A swipe sends the picture on to 20 % of the swipe's length that way, then it springs back.
//   - Two fingers: the scale follows their distance (1× to 4×), and the point of the picture that was
//     between them stays between them. Zoomed in, one finger moves the picture.
//   - Each time a finger comes or goes, the gesture starts again from where the picture is now (the anchor).
//     So 2 fingers → 1 finger → 2 fingers never jumps.
//   - Zoomed in, the picture never shows an empty edge: x and y are kept within what the scale allows.
//   - A double tap (two short taps within 350 ms and 30 px of each other) goes back to 1×.
//   - Every touch ends with one line: under the picture and in the console.
//
// In the simulator the mouse wheel is the pinch: two fingers around the cursor, wheel up = apart.
// touch-action: none on #tStage (index.html): the browser never takes these fingers.
(function () {
  "use strict";

  var stage = document.getElementById("tStage");
  var picture = document.getElementById("tInner");
  var badge = document.getElementById("tScale");
  var say = document.getElementById("tSay");

  var MIN = 1, MAX = 4;           // the scale's limits
  var TAP_MOVE = 10;              // px: a finger that moved more is not a tap
  var TAP_TIME = 300;             // ms: a tap is shorter
  var DOUBLE_TIME = 350;          // ms between the two taps of a double tap
  var DOUBLE_DIST = 30;           // px between them
  var SWIPE = 40;                 // px: a slow drag this far is a swipe
  var FLICK = 0.5;                // px per ms: a flick this fast is a swipe after only FLICK_MIN px
  var FLICK_MIN = 20;
  var FOLLOW = 0.15;              // the part of the finger's way the picture moves during a swipe
  var THROW = 0.2;                // a swipe sends it on to this part of the swipe's length

  var view = { s: 1, x: 0, y: 0 };   // the picture now: scale and shift (px from the centre)
  var nudge = { x: 0, y: 0 };        // the swipe's small shift on top (at 1× only)
  var fingers = {};                  // pointerId → { x, y }, at most two
  var gesture = null;                // from the first finger down to the last one up
  var lastTap = null;                // { t, x, y } of the last tap, for the double tap
  var homeTimer = 0;                 // brings the picture back after a swipe

  // ===== Drawing =====

  // how: "" = follow the fingers, "throw" = a swipe flies on, "home" = spring back, "reset" = the double tap's 1×
  function draw(how) {
    picture.style.transition = how === "throw" ? "transform .16s ease-out"
                             : how === "home" ? "transform .5s cubic-bezier(.3, 1.4, .5, 1)"
                             : how === "reset" ? "transform .25s ease" : "none";
    picture.style.transform = "translate(" + (view.x + nudge.x) + "px, " + (view.y + nudge.y) + "px) scale(" + view.s + ")";
    badge.textContent = view.s.toFixed(1) + "×";
  }

  // One line per touch: under the picture and in the console
  function tell(text) { say.textContent = text; log(text); }

  // Where the picture's centre is drawn now, also halfway through an animation (px from the stage centre)
  function where() {
    var p = picture.getBoundingClientRect(), r = stage.getBoundingClientRect();
    return { x: p.left + p.width / 2 - (r.left + r.width / 2), y: p.top + p.height / 2 - (r.top + r.height / 2) };
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
    if (!gesture) {
      clearTimeout(homeTimer);
      gesture = { startScale: view.s, x0: e.clientX, y0: e.clientY, t0: Date.now(), moved: false, pinched: false,
                  swipe: view.s === 1, dx: 0, dy: 0, nx: 0, ny: 0 };
      // a swipe only at 1×; a picture still springing back is picked up where it is
      if (gesture.swipe) { nudge = where(); gesture.nx = nudge.x; gesture.ny = nudge.y; draw(""); }
    }
    if (Object.keys(fingers).length > 1) {
      gesture.pinched = true;
      if (gesture.swipe) { gesture.swipe = false; nudge = { x: 0, y: 0 }; draw(""); }   // a second finger: the swipe turns into a pinch
    }
    anchor();
  });

  stage.addEventListener("pointermove", function (e) {
    if (!fingers[e.pointerId]) return;
    fingers[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (Math.abs(e.clientX - gesture.x0) > TAP_MOVE || Math.abs(e.clientY - gesture.y0) > TAP_MOVE) gesture.moved = true;

    // A swipe at 1×: the picture moves only a part of the finger's way
    if (gesture.swipe) {
      gesture.dx = e.clientX - gesture.x0;
      gesture.dy = e.clientY - gesture.y0;
      nudge = { x: gesture.nx + gesture.dx * FOLLOW, y: gesture.ny + gesture.dy * FOLLOW };
      draw("");
      return;
    }

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

    draw("");
  });

  function release(e) {
    if (!fingers[e.pointerId]) return;
    delete fingers[e.pointerId];
    if (Object.keys(fingers).length) { anchor(); return; }    // one finger is still down: it goes on moving the picture

    var g = gesture, now = Date.now();
    gesture = null;

    // A double tap goes back to 1×
    var tap = !g.pinched && !g.moved && now - g.t0 < TAP_TIME;
    var isDouble = tap && lastTap && now - lastTap.t < DOUBLE_TIME &&
                 Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_DIST;
    lastTap = tap && !isDouble ? { t: now, x: e.clientX, y: e.clientY } : null;
    if (isDouble) {
      view = { s: 1, x: 0, y: 0 }; nudge = { x: 0, y: 0 };
      draw("reset");
      tell("double tap: back to 1×");
      return;
    }

    // At 1×: a swipe flies on to 20 % of its length that way, then springs back; anything else only springs back
    if (g.swipe) {
      var across = Math.abs(g.dx) >= Math.abs(g.dy);              // the bigger of the two moves decides
      var dist = across ? Math.abs(g.dx) : Math.abs(g.dy);
      var speed = dist / Math.max(1, now - g.t0);
      var swiped = e.type !== "pointercancel" && (dist >= SWIPE || (dist >= FLICK_MIN && speed > FLICK));
      if (!swiped) {
        nudge = { x: 0, y: 0 }; draw("home");
        tell(tap ? "tap" : g.moved ? "swipe: too short" : "press");
        return;
      }
      var sx = across ? (g.dx < 0 ? -1 : 1) : 0, sy = across ? 0 : (g.dy < 0 ? -1 : 1);
      nudge = { x: g.nx + sx * dist * THROW, y: g.ny + sy * dist * THROW };
      draw("throw");
      homeTimer = setTimeout(function () { nudge = { x: 0, y: 0 }; draw("home"); }, 160);
      tell("swipe: " + (sx < 0 ? "left" : sx > 0 ? "right" : sy < 0 ? "up" : "down"));
      return;
    }

    // Zoomed in, or two fingers
    if (tap) tell("tap");
    else if (g.pinched) tell("zoom: " + view.s.toFixed(1) + "×");
    else if (g.moved) tell("drag");
    else tell("press");
  }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
})();
