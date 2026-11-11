// features/music.js: a soft background loop made in code with Web Audio. No sound file, nothing to license.
//
// The sound: four chords (Fmaj7, Em7, Dm7, Cmaj7) at 72 beats per minute. Each chord is a slow pad,
// a low bass note and a quiet arpeggio, all through a light echo and a low-pass filter.
//
// When it plays:
//   - Browsers and the Android WebView allow sound only after a touch, so the first touch anywhere starts it.
//   - It holds while the app is in the background and goes on when the app comes back (core.js: pause / resume).
//   - In the simulator ⚙ → Volume scales it: sim-bridge.js puts a gain node in front of ctx.destination.
//
// For the other files:
//   Music.toggle()   a music button: on / off; returns the new state (and Demo.emit("music", on) for the buttons)
//   Music.hold(yes)  true = hold (background, a full-screen ad), false = go on
//   Music.isOn()     the button state
(function () {
  "use strict";

  // ===== The tune =====

  var BEAT = 60 / 72 / 2;            // seconds per eighth note
  var CHORDS = [                     // MIDI note numbers (60 = middle C), one chord per bar of 8 eighths
    [53, 57, 60, 64],                // Fmaj7
    [52, 55, 59, 62],                // Em7
    [50, 53, 57, 60],                // Dm7
    [48, 52, 55, 59]                 // Cmaj7
  ];
  var ARP = [0, -1, 2, 3, 1, -1, 2, -1];   // the chord tone each eighth plays, -1 = a rest

  // ===== State =====

  var on = true;          // the music buttons
  var unlocked = false;   // a touch has come, so the browser allows sound
  var held = false;       // the app is in the background
  var ctx = null;         // the AudioContext, made on the first start
  var out = null;         // where every note goes (the mix)
  var timer = 0;          // the scheduler's interval
  var step = 0;           // which eighth note comes next
  var at = 0;             // when it plays (in ctx.currentTime seconds)

  // ===== The sound graph, built once =====
  //
  //   notes → out ─┬───────────────────────→ low-pass → speakers
  //                └→ delay ⟲ feedback → wet ─┘

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { on = false; log("music: this browser has no Web Audio"); return; }
    ctx = new AC();

    out = ctx.createGain();
    out.gain.value = 0.5;

    var lowpass = ctx.createBiquadFilter();   // soft: no sharp highs
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2400;

    var delay = ctx.createDelay(2);           // the echo: a dotted eighth later, fading
    var feedback = ctx.createGain();
    var wet = ctx.createGain();
    delay.delayTime.value = BEAT * 1.5;
    feedback.gain.value = 0.3;
    wet.gain.value = 0.25;

    out.connect(lowpass);
    out.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(lowpass);
    lowpass.connect(ctx.destination);

    at = ctx.currentTime + 0.1;
    log("music: started (a soft loop made in code)");
  }

  // ===== One note =====
  // A fade-in (attack), a steady part (hold) and a fade-out (release), all in seconds from t.

  function voice(type, midi, t, peak, attack, hold, release) {
    var osc = ctx.createOscillator(), env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);

    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(peak, t + attack);
    env.gain.setValueAtTime(peak, t + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);

    osc.connect(env);
    env.connect(out);
    osc.start(t);
    osc.stop(t + attack + hold + release + 0.05);
  }

  // ===== The scheduler =====
  // Every 100 ms: queue the notes of the next 0.3 s. Web Audio plays them at exact times,
  // so the beat stays even when the timer itself is late.

  function tick() {
    while (at < ctx.currentTime + 0.3) {
      var chord = CHORDS[Math.floor(step / 8) % CHORDS.length], i = step % 8;
      if (i === 0) {
        chord.forEach(function (m) { voice("triangle", m, at, 0.03, 0.8, BEAT * 8 - 0.8, 1.6); });   // pad, fades into the next chord
        voice("sine", chord[0] - 12, at, 0.12, 0.02, 0.4, 2.4);                                      // bass
      }
      if (ARP[i] >= 0) voice("sine", chord[ARP[i]] + 12, at, 0.06, 0.01, 0, 1.0);                    // arpeggio
      step++;
      at += BEAT;
    }
  }

  // ===== Play or hold =====
  // Plays when it is on, a touch has come and the app is in front. Otherwise the context is suspended:
  // its clock stops too, so the music goes on later from the same beat.

  function apply() {
    var play = on && unlocked && !held;
    if (play && !ctx) build();
    if (!ctx) return;
    clearInterval(timer);
    if (play) {
      var p = ctx.resume();
      if (p && p.catch) p.catch(function () {});   // no touch yet: the browser keeps it waiting, that is fine
      at = Math.max(at, ctx.currentTime + 0.05);
      tick();
      timer = setInterval(tick, 100);
    } else {
      ctx.suspend();
    }
  }

  // ===== The first touch =====
  // Any touch or key unlocks the sound. A music button decides on its own: its click comes right after,
  // so a first press there turns the music off instead of starting it.

  function unlock(e) {
    if (e.target && e.target.closest && e.target.closest("[data-music]")) return;
    unlocked = true;
    if (on && !held && (!ctx || ctx.state !== "running")) apply();
  }
  ["pointerup", "touchend", "keydown"].forEach(function (type) {
    document.addEventListener(type, unlock, true);
  });

  // ===== For the other files =====

  window.Music = {
    toggle: function () {
      unlocked = true;
      on = !on;
      log("music: " + (on ? "on" : "off"));
      apply();
      Demo.emit("music", on);
      return on;
    },
    hold: function (yes) {
      held = yes;
      apply();
    },
    isOn: function () { return on; }
  };

  // ===== The card =====

  Demo.on("pause", function () { Music.hold(true); log("pause: music held"); });
  Demo.on("resume", function () { Music.hold(false); });

  Demo.add({
    id: "music", group: "feel", title: "Music", hint: "Sound made in code", icon: "music", color: "accent",
    lead: "A soft loop made in code with Web Audio: no sound file, nothing to license.",
    can: [
      ["play", "accent", "On / off", "The button here and [{vol}] on the home screen."],
      ["pointer", "primary", "Starts on the first touch", "Browsers and the Android WebView allow sound only after a touch."],
      ["pause", "secondary", "Holds in the background", "It stops when the app pauses and goes on from the same beat."],
      ["megaphone", "warning", "Holds for an ad", "While a full-screen ad is on, the music waits."]
    ],
    sim: [
      ["vol", "[⚙] → [Volume] changes its volume; the mute button in the top bar silences it."],
      ["circle", "[○ Home] or [⏸]: it holds; back in the app, it goes on."],
      ["terminal", "The console writes when it holds."]
    ],
    tip: ["know", "four chords (Fmaj7, Em7, Dm7, Cmaj7) at 72 bpm: a slow pad, a low bass note and a quiet arpeggio, through a soft echo."],
    foot: "`AudioContext`: no plugin, no sound file.",
    code: [
      { file: "features/music.js", tag: "Web API",
        title: "A tone, after the first touch",
        rows: [
          ["music", "`AudioContext` + an oscillator: one 440 Hz tone (A4). No sound file."],
          ["pointer", "An AudioContext starts suspended: `resume()` it from the first touch."]
        ],
        src:
'var ctx = new AudioContext();\n' +
'var tone = ctx.createOscillator();     // one tone\n' +
'tone.frequency.value = 440;            // A4, in Hz\n' +
'tone.connect(ctx.destination);\n' +
'tone.start();\n' +
'\n' +
'// sound is allowed only after a touch\n' +
'document.addEventListener("pointerup", function () {\n' +
'  ctx.resume();\n' +
'}, { once: true });' },
      { file: "features/music.js", tag: "Web API",
        title: "Pause with the app",
        rows: [
          ["pause", "`document.hidden`: the app went to the background, so `suspend()`."],
          ["play", "`suspend()` stops the clock too, so `resume()` goes on from the same beat."]
        ],
        src:
'document.addEventListener("visibilitychange", function () {\n' +
'  if (document.hidden) ctx.suspend();   // the app went to the background\n' +
'  else ctx.resume();\n' +
'});' }
    ],
    build: function (pane) {
      pane.innerHTML = '<button class="btn w-full justify-between" data-music="label"><span>Music</span><span class="text-xs opacity-60"></span></button>';
      var state = pane.querySelector("[data-music] span + span");
      function show(isOn) { state.textContent = isOn ? "on" : "off"; }
      Demo.on("music", show);
      show(Music.isOn());
    }
  });
})();
