// swipe.js: cards you swipe left and right, like photos in a gallery.
//
// How it works:
//   - The finger drags the whole strip of cards (#swStrip) while it is down.
//   - On release the card turns if the finger went a quarter of the width, or flicked fast.
//     Otherwise the strip slides back.
//   - At the first and the last card the strip gives only a third of the move: there is nothing that way.
//   - One finger at a time; a second one is ignored.
//
// touch-action: pan-y on #swView (index.html): a sideways drag belongs to the app, a vertical one to the browser.
// When the browser takes a finger it sends pointercancel. The simulator does the same, so the console shows it.
(function () {
  "use strict";

  var view = document.getElementById("swView");
  var strip = document.getElementById("swStrip");
  var dots = document.getElementById("swDots");
  var count = strip.children.length;

  var TURN_PART = 1 / 4;    // of the width: a slow drag this far turns the card
  var FLICK = 0.5;          // px per ms: a flick this fast turns it after only 30 px

  var index = 0;            // the card in view (0 = the first)
  var drag = null;          // the finger now: { id, x0, t0, dx }

  // One dot per card
  dots.innerHTML = new Array(count + 1).join("<i></i>");

  // Draw: the card in view, moved by dx px; anim = slide there (on release) or follow the finger (while dragging)
  function draw(dx, anim) {
    strip.style.transition = anim ? "transform .3s ease" : "none";
    strip.style.transform = "translateX(calc(" + (-index * 100) + "% + " + dx + "px))";
    Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === index); });
  }

  view.addEventListener("pointerdown", function (e) {
    if (drag) return;
    try { view.setPointerCapture(e.pointerId); } catch (er) {}   // a mouse needs it to keep the moves; a touch is captured anyway
    drag = { id: e.pointerId, x0: e.clientX, t0: Date.now(), dx: 0 };
  });

  view.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0;
    var noCardThatWay = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    if (noCardThatWay) dx /= 3;
    drag.dx = dx;
    draw(dx, false);
  });

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = drag.dx;
    var speed = dx / Math.max(1, Date.now() - drag.t0);
    var far = Math.abs(dx) > view.clientWidth * TURN_PART || (Math.abs(dx) > 30 && Math.abs(speed) > FLICK);
    drag = null;

    if (e.type === "pointercancel") log("swipe: a vertical drag, the browser took the finger");
    else if (far && dx < 0 && index < count - 1) { index++; log("swipe: left, card " + (index + 1) + " of " + count); }
    else if (far && dx > 0 && index > 0)         { index--; log("swipe: right, card " + (index + 1) + " of " + count); }
    else if (far) log("swipe: no more cards that way");

    draw(0, true);
  }
  view.addEventListener("pointerup", release);
  view.addEventListener("pointercancel", release);

  draw(0, false);
})();
