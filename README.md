# Phone simulator

Test an HTML mobile app (Capacitor, any Android WebView app) in a desktop browser, inside a phone frame that behaves like a phone.
Plain HTML and JavaScript: no build step, no server, works offline straight from `file://`.

**Live demo:** https://kandelucky.github.io/phone-sim/

## What it simulates

- **Screen sizes**: a list of phones and tablets, or your own width × height. Portrait and landscape.
- **System bars**: status bar, navigation bar (gestures, 3 buttons or hidden) and the camera hole. With `viewport-fit=cover`
  the app is drawn under them and gets the same `--safe-area-inset-*` CSS variables Capacitor 8 sets on a phone.
- **Buttons**: Back (◁) is sent to the app; Home (○) sends it to the background.
- **Background and kill**: pause / resume through `visibilitychange` (`document.hidden` turns true, `requestAnimationFrame` stops).
  Kill gives the app no warning, as on Android; the next start is a cold start.
- **Touch**: the mouse over the screen acts as a finger. The app gets pointer and touch events with `pointerType: "touch"`,
  and a tap gets the mouse events and `click` that Chrome sends on a phone. The mouse wheel is a two-finger pinch.
- **Volume keys**: 0 to 15 steps plus mute. They scale all the app's sound, `<audio>`, `<video>` and Web Audio.
- **Console**: the app's own log lines with the time, uncaught errors in red, and what the simulator did.
- **Themes**: 35 daisyUI themes, sent to the app as `data-theme`.
- English and Georgian interface, and a built-in guide (ⓘ).

## Quick start

1. Download or clone the repository.
2. Open `index.html` (or `sim.html`) in Chrome or Edge. The demo app opens inside the phone.

## Use it with your app

**The quickest way:** on the live demo (or the simulator served by any local server), press **Open app**
(the folder icon, far left of the top bar) → **Choose folder…**, and pick your app's folder (the one with `index.html`, or with `www/` or `dist/` inside). The app opens in the phone
with everything working: `sim-bridge.js` is added by itself, and ↻ shows your edits. The files stay on your computer:
a service worker (`sim-sw.js`) hands them from the folder to the phone. Chrome and Edge only; a page refresh forgets the folder.
No app at hand? The same panel has **Download the demo app** (`demo-app.zip`): unzip it and choose its folder.

**From a file, or to keep it:**

1. Copy `sim-bridge.js` into your app's folder and add one line to the app's `<head>`, before any script that makes sound:
   ```html
   <script src="sim-bridge.js"></script>
   ```
2. Open `sim.html`, then **Open app** (the folder icon). In the panel's field, type or paste where your app is and press Enter:
   - a path from `sim.html`: `myapp/index.html`
   - a file path from Windows: Shift + right-click the file → Copy as path, then paste (the quotes are fine)
   - an address, for example a local dev server: `http://localhost:5173`

   It goes into the address bar as `?app=…`, so a refresh opens it again. An empty field brings back the demo.
   File paths do not work on the live demo (a web page cannot open files from your computer): download the simulator for them.
3. To open your app every time, set it at the top of the script in `sim.html`:
   ```js
   var APP = "myapp/index.html";
   var KEY = "myapp";   // localStorage prefix for the simulator's settings, one per project
   ```

`app.html` is an empty starter that is already wired up. Outside the simulator (opened on its own, or built into an APK)
the bridge does nothing, so the same files run on a phone unchanged.

## The bridge API

| Function | What it does |
|---|---|
| `log("text")` | one line in the console, with the time; HTML is allowed |
| `simScreen("name")` | the console line "snapshot: screen name"; call it when the visible screen changes |
| `onBack(fn)` | `fn` runs on Back. What back means (close a dialog, previous screen, ask to exit) is the app's decision |
| `onPause(fn)` | `fn` runs when the app goes to the background. Save progress here: a killed app gets no warning |
| `onResume(fn)` | `fn` runs when the app comes back |
| `simExit()` | the app's own exit button: in the simulator the app closes, on a phone call Capacitor `App.exitApp()` instead |

```js
onBack(function () { if (dialog.open) dialog.close(); else showPreviousScreen(); });
onPause(function () { localStorage.setItem("progress", JSON.stringify(state)); });
onResume(function () { /* restart timers, music */ });
```

`onPause` and `onResume` hang on `visibilitychange`, so outside the simulator they run on the real event.

## The demo app (`demo/`)

What the simulator opens by default. One file per feature, each starting with a comment that explains how it works:

| File | Shows |
|---|---|
| `index.html` | the screens, markup only |
| `demo.css` | safe-area padding, cards, the zoom grid, the balls |
| `app.js` | screens with a back trail, an "Exit the app?" dialog, pause / resume |
| `music.js` | a soft loop made in code (Web Audio, no sound file): starts on the first touch, stops in the background |
| `swipe.js` | cards: a quarter of the width or a quick flick turns one |
| `zoom.js` | pinch to zoom around the fingers, move with one finger, double tap to reset |
| `drag.js` | balls dragged into a frame, one per finger |

## Tips for apps

- **Safe area.** With `viewport-fit=cover`, pad the content with
  `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))` and the same for bottom, left and right.
  Plain `env()` is 0 in a desktop browser, so content that looks fine with it goes under the bars on a phone.
- **Gestures.** Put `touch-action: none` on what the app drags or pinches. Where panning is allowed, a drag past 10 px
  is taken by the browser (`pointercancel`), on a phone and in the simulator alike.
- **Sound.** Browsers and the Android WebView start sound only after a touch. In the background, stop your own timers
  and sound: the simulator does not stop them, and a phone does not always do it either.
- **Modules.** ES modules do not load from `file://`; use plain `<script>` files.
- **Log, not console.log.** `log()` shows in the simulator's console, where the app's logic is visible without DevTools.

## What it cannot show

- Real bar and camera sizes: 28 / 22 / 44 px and the 28 px camera inset are estimates.
- The phone turned to the right (camera on the right), and the colour of the bars.
- Long press, fling, text selection and native controls (`select`, range sliders) in finger mode: switch to mouse mode for these.
- Feature checks still see the PC: `'ontouchstart' in window`, `navigator.maxTouchPoints`, `(pointer: coarse)`, `:hover`.
- Recents (□) is not simulated.

## Files

| File | Role |
|---|---|
| `index.html` | forwards to `sim.html` |
| `sim.html` | the simulator: phone frame, top bar, settings (⚙), help (ⓘ), console |
| `sim-bridge.js` | the app side: include it in the app |
| `sim-sw.js` | the service worker behind Choose folder |
| `app.html` | an empty starter app |
| `demo/` | the demo app |
| `demo-app.zip` | the demo app as a folder of its own (with its own `lib/` and `sim-bridge.js`), to try Choose folder |
| `GUIDE.html` | the user guide as one page |
| `lib/` | daisyUI 5, Tailwind CSS 4 (browser build), and the licences of the bundled libraries |

## Licence

MIT, see `LICENSE`.

Bundled: [daisyUI](https://daisyui.com) (MIT), [Tailwind CSS](https://tailwindcss.com) (MIT),
icons from [Lucide](https://lucide.dev) (ISC). Their licences are in `lib/`.
