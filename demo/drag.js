// drag.js: balls you drag into a frame.
//
// How it works:
//   - Each finger holds its own ball (pointerId → ball), so two fingers can carry two balls at once.
//   - The ball keeps the spot where the finger took it: the offset is measured on pointerdown.
//   - A ball's place is stored as --fx / --fy, a fraction (0 to 1) of the free space (demo.css),
//     so the balls keep their places when the phone turns.
//   - On release the badge counts the balls whose centre is inside the frame.
//
// touch-action: none on #dArea (index.html): the browser never scrolls under a dragged ball.
(function () {
  "use strict";

  var area = document.getElementById("dArea");
  var frame = document.getElementById("dFrame");
  var badge = document.getElementById("dCount");
  var balls = area.querySelectorAll(".ball");

  var SIZE = 56;            // px, the ball (the same as in demo.css)
  var TAP_MOVE = 10;        // px: a ball moved less than this was only touched

  var held = {};            // pointerId → { ball, ox, oy, x0, y0, moved }

  // Is the ball's centre inside the frame?
  function inFrame(ball) {
    var b = ball.getBoundingClientRect(), f = frame.getBoundingClientRect();
    var x = b.left + b.width / 2, y = b.top + b.height / 2;
    return x > f.left && x < f.right && y > f.top && y < f.bottom;
  }

  area.addEventListener("pointerdown", function (e) {
    var ball = e.target.closest(".ball");
    if (!ball || ball.classList.contains("held")) return;      // not a ball, or another finger has it
    var r = ball.getBoundingClientRect();                       // measured before .held makes it bigger
    try { ball.setPointerCapture(e.pointerId); } catch (er) {}  // a mouse needs it to keep the moves; a touch is captured anyway
    held[e.pointerId] = { ball: ball, ox: e.clientX - r.left, oy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
    ball.classList.add("held");
  });

  area.addEventListener("pointermove", function (e) {
    var h = held[e.pointerId];
    if (!h) return;
    if (Math.abs(e.clientX - h.x0) > TAP_MOVE || Math.abs(e.clientY - h.y0) > TAP_MOVE) h.moved = true;

    // The ball's new top-left corner, as a fraction of the free space, kept inside the area
    var a = area.getBoundingClientRect();
    var fx = (e.clientX - h.ox - a.left) / (a.width - SIZE);
    var fy = (e.clientY - h.oy - a.top) / (a.height - SIZE);
    h.ball.style.setProperty("--fx", Math.max(0, Math.min(1, fx)));
    h.ball.style.setProperty("--fy", Math.max(0, Math.min(1, fy)));
  });

  function release(e) {
    var h = held[e.pointerId];
    if (!h) return;
    delete held[e.pointerId];
    h.ball.classList.remove("held");

    // Count the balls in the frame; data-in remembers where this one was before
    var wasIn = h.ball.dataset.in === "1", isIn = inFrame(h.ball);
    var n = Array.prototype.filter.call(balls, inFrame).length;
    h.ball.dataset.in = isIn ? "1" : "";

    badge.textContent = n + " / " + balls.length;
    frame.classList.toggle("got", n === balls.length);
    frame.textContent = n === balls.length ? "All in" : "Drop here";

    var name = "ball " + h.ball.textContent;
    if (isIn && !wasIn) log("drag: " + name + " into the frame (" + n + " / " + balls.length + ")");
    else if (!isIn && wasIn) log("drag: " + name + " out of the frame (" + n + " / " + balls.length + ")");
    else if (h.moved) log("drag: " + name + " moved");
  }
  area.addEventListener("pointerup", release);
  area.addEventListener("pointercancel", release);
})();
