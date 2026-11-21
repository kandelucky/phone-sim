// build-guide.js: writes GUIDE-short.html and GUIDE.html, the ⓘ guide (short and full) as shareable pages,
// from the short / help parts of lang/en.js and the icons in sim.html.
// After changing them run: node build-guide.js [folder]   (default: this script's folder)
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.resolve(process.argv[2] || __dirname);
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
function lang(code) {
  const w = {};
  vm.runInNewContext(read("lang/" + code + ".js"), { window: w });
  return w.SIM_LANG[code];
}
const en = lang("en");
const m = read("sim.html").match(/var ICON = (\{[\s\S]*?\n  \});/);
if (!m) throw new Error("sim.html: var ICON = { … } not found");
const ICON = vm.runInNewContext("(" + m[1] + ")");

const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
function ic(n) {
  return '<span class="btn">' + (ICON[n] ? SVG + ICON[n] + "</svg>" : n === "dot" ? '<span class="dot"></span>' : '<span class="txt">' + n + "</span>") + "</span>";
}

// open = add the "Open it" section first (the full guide; the short one has its own Start tab); other = a link to the other page
function page(file, title, data, open, other) {
  const first = open ? 2 : 1;
  const tabs = data.map((t, n) => `
<h2 id="${t.id}">${n + first}. ${t.name}</h2>
<p>${t.intro}</p>
<table>
${t.items.map((it) => `  <tr><td class="ic">${ic(it[0])}</td>
      <td class="nm"><b>${it[1]}</b></td>
      <td>${it[2]}</td></tr>`).join("\n")}
</table>`).join("\n");
  const toc = (open ? ['  <li><a href="#open">Open it</a></li>'] : []).concat(data.map((t) => `  <li><a href="#${t.id}">${t.name}</a></li>`)).join("\n");
  const openIt = open ? `
<h2 id="open">1. Open it</h2>
<p>Double-click <code>sim.html</code>. It opens in your browser (Chrome or Edge work best).
You see a phone with the app inside it and the console, a list of what the app is doing (see Console panel below).
Hold the mouse over any button to see its name and a short hint.</p>
` : "";

  const html = `<!doctype html>
<!-- Made by build-guide.js from lang/en.js: change that file, then run  node build-guide.js -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Phone simulator: ${title}</title>
<style>
  :root { --ink: #1f2328; --soft: #57606a; --line: #d0d7de; --bg: #f6f7f9; }
  body { font: 16px/1.6 "Segoe UI", system-ui, Sylfaen, sans-serif; color: var(--ink); background: var(--bg); margin: 0; }
  main { max-width: 860px; margin: 0 auto; padding: 32px 24px 64px; background: #fff; min-height: 100vh; box-sizing: border-box; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 21px; margin: 40px 0 10px; padding-top: 8px; border-top: 1px solid var(--line); }
  .sub { color: var(--soft); margin: 0 0 24px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  td { text-align: left; vertical-align: top; padding: 10px 12px; border-bottom: 1px solid var(--line); }
  td.ic { width: 34px; padding-right: 0; }
  td.nm { width: 150px; }
  .btn { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: #eef1f4; color: var(--ink); }
  .btn svg { width: 20px; height: 20px; }
  .btn .txt { font-size: 12px; font-weight: 600; }
  .btn .dot { width: 12px; height: 12px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1.5px #57606a; }
  .note { background: #fff8e6; border: 1px solid #f0d68a; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
  code { font: 14px Consolas, monospace; background: #eef1f4; padding: 1px 5px; border-radius: 4px; }
  .eg { font: 14px Consolas, monospace; background: #1d232a; color: #d0d4da; padding: 6px 12px; border-radius: 8px; display: inline-block; margin: 6px 0; }
  .toc { columns: 2; margin: 0; padding-left: 20px; }
  small { color: var(--soft); }
  @media print { body { background: #fff; } main { padding: 0; } h2 { break-after: avoid; } }
</style>
</head>
<body>
<main>

<h1>Phone simulator: ${title}</h1>
<p class="sub">A phone on your computer screen, for trying out an app before it becomes a real Android app.
No installation, no internet needed.</p>
<div class="note">The simulator speaks other languages too: ⚙ → <b>Language</b> (on first start it follows your browser's language).
The <b>Info</b> button (ⓘ) shows this same guide inside the simulator, in that language. ${other}</div>

<ol class="toc">
${toc}
</ol>
${openIt}${tabs}

<p><small>Phone simulator · icons: Lucide (ISC licence), the rotate icons are our own.</small></p>
</main>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, file), html);
  console.log(file + ": " + data.length + " sections, " + data.reduce((a, t) => a + t.items.length, 0) + " rows");
}
page("GUIDE-short.html", "short guide", en.short, false, 'Every button in detail: the <a href="GUIDE.html">full version</a>.');
page("GUIDE.html", "user guide", en.help, true, 'For people who only test an app: the <a href="GUIDE-short.html">short version</a>.');
