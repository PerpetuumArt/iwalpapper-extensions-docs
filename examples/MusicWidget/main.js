// The native Music widget as a widget extension: the song from `nowPlaying`, its artwork served in
// this widget's own origin, the waveform from `audioLevels`, and the controls through the bridge.
const bridge = window.iwalpapper;
const $ = (id) => document.getElementById(id);
const widget = $("widget");
let settings = { controls: true, artwork: true, source: true, progress: true, waveform: false,
                 playPause: true, skip: true, lockProgress: true, haptic: "Firm", layout: "card", look: "glass" };
let song = null, levels = null, ticker = null, armedUntil = 0, preview = false, cardShown = true;

// Controls: the same three buttons in the card's row and beside the compact song.
for (const row of [$("controls"), $("miniControls")]) {
  row.append($("buttons").content.cloneNode(true));
  for (const name of ["previous", "toggle", "next"]) {
    const button = row.querySelector("." + name);
    button.addEventListener("pointerdown", () => button.classList.add("pressed"));
    button.addEventListener("pointerup", () => button.classList.remove("pressed"));
    button.addEventListener("pointerleave", () => button.classList.remove("pressed"));
    button.addEventListener("click", () => bridge?.nowPlaying?.[name]?.());
  }
}

// 24 bars, as the native waveform.
for (const wave of [$("wave"), $("miniWave")]) {
  for (let i = 0; i < 24; i++) wave.append(document.createElement("span"));
}

// The artwork grows under the pointer with a tap of the trackpad; click it, then click again to open the app.
const artwork = $("artwork");
artwork.addEventListener("pointerenter", () => {
  if (!settings.controls || !song?.title) return;
  artwork.classList.add("grown");
  if (settings.haptic !== "Off") bridge?.haptic?.(settings.haptic === "Soft" ? "soft" : "firm");
});
artwork.addEventListener("pointerleave", () => artwork.classList.remove("grown"));
artwork.addEventListener("click", () => {
  if (!settings.controls || !song) return;
  if (Date.now() < armedUntil) {
    armedUntil = 0;
    artwork.classList.remove("armed");
    return bridge?.nowPlaying?.openApp?.();
  }
  armedUntil = Date.now() + 2000;
  artwork.classList.add("armed", "grown");
  setTimeout(() => { if (Date.now() >= armedUntil) artwork.classList.remove("armed"); }, 2050);
});

// Seeking on release, where the press ended, unless the bar is locked.
for (const bar of [$("track"), $("miniProgress")]) {
  bar.addEventListener("click", (e) => {
    if (settings.lockProgress || !settings.controls || !song?.duration) return;
    const box = bar.getBoundingClientRect();
    bridge?.nowPlaying?.seek?.(Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1) * song.duration);
  });
}

const time = (seconds) => {
  const total = Math.floor(seconds);
  const pad = (n) => String(n).padStart(2, "0");
  return total >= 3600 ? `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
                       : `${Math.floor(total / 60)}:${pad(total % 60)}`;
};

// Seconds played now: from the last report, moved on while playing.
const elapsed = () => {
  if (!song || song.elapsed == null) return 0;
  let now = song.elapsed;
  if (song.playing && song.timestamp) now += (Date.now() - song.timestamp) / 1000 * (song.rate || 1);
  return Math.max(0, song.duration ? Math.min(now, song.duration) : now);
};

function progress() {
  const duration = song?.duration || 0;
  const played = elapsed();
  const share = duration > 0 ? played / duration * 100 + "%" : "0%";
  for (const fill of document.querySelectorAll(".bar .fill")) fill.style.width = share;
  $("elapsed").textContent = time(played);
  $("remaining").textContent = "-" + time(Math.max(duration - played, 0));
}

function render() {
  const t = song;
  const compact = settings.layout === "compact";
  const idle = !t || !t.title;
  // On the desktop the widget leaves while nothing plays, card and all, as the native one does; the
  // app's previews keep it, dimmed, so there is something to place.
  const gone = idle && !preview;
  widget.className = (compact ? "compact" : "card") + (settings.look === "glass" ? " glass" : "") + (idle ? " idle" : "")
    + (t?.playing ? " playing" : "") + (gone ? " gone" : "");
  if (cardShown === gone) { cardShown = !gone; bridge?.setVisible?.(cardShown); }
  $("title").textContent = !t ? "Now Playing is not available" : t.title || "Nothing playing";
  $("artist").textContent = !t ? "This version of macOS does not share it"
    : t.title ? (t.artist || t.album || "") : "Play something in Music, Spotify or a browser";

  $("artwork").classList.toggle("hidden", !settings.artwork);
  const cover = t?.title && t.artwork ? t.artwork : null;
  if (cover) { if ($("cover").getAttribute("src") !== cover) $("cover").src = cover; } else $("cover").removeAttribute("src");
  const icon = settings.source && t?.source?.icon ? t.source.icon : null;
  for (const img of [$("icon"), $("badge")]) icon ? (img.getAttribute("src") !== icon && (img.src = icon)) : img.removeAttribute("src");

  const playing = !idle;
  const waves = settings.waveform && playing && levels !== null;
  $("wave").classList.toggle("hidden", !waves);
  $("miniWave").classList.toggle("on", waves);
  const shows = settings.progress && playing && (t.duration || 0) > 0;
  $("progress").classList.toggle("hidden", !shows);
  $("miniProgress").classList.toggle("on", shows);
  const controls = settings.controls && playing && (settings.playPause || settings.skip);
  $("controls").classList.toggle("hidden", !controls);
  $("miniControls").classList.toggle("on", controls);
  for (const row of [$("controls"), $("miniControls")]) {
    row.querySelector(".toggle").classList.toggle("hidden", !settings.playPause);
    for (const name of ["previous", "next"]) row.querySelector("." + name).classList.toggle("hidden", !settings.skip);
  }
  if (!settings.controls) artwork.classList.remove("grown", "armed");

  progress();
  fit(compact);
  // Ticks once a second only while playing; paused, it is drawn once.
  clearInterval(ticker);
  ticker = shows && t.playing ? setInterval(progress, 1000) : null;
}

// Card: the card as tall as its rows, as the native one, which shrinks when a row is off; Compact: its layout's height.
let asked = 0;
function fit(compact) {
  requestAnimationFrame(() => {
    const height = compact ? 9999 : Math.ceil(widget.getBoundingClientRect().height);
    if (height !== asked) { asked = height; bridge?.setHeight?.(height); }
  });
}

function wave() {
  for (const bars of [$("wave"), $("miniWave")]) {
    const height = bars.id === "wave" ? 34 : 12;
    [...bars.children].forEach((bar, i) => { bar.style.height = Math.max(3, height * ((levels && levels[i]) || 0)) + "px"; });
  }
}

if (bridge) {
  bridge.on("settings", (s) => { settings = Object.assign(settings, s); render(); });
  bridge.display.on((d) => { preview = !!d?.preview; render(); });
  try {
    bridge.nowPlaying.on((t) => { song = t; render(); });
    song = bridge.nowPlaying.current();
  } catch (e) { song = null; }   // switched off in the row: "not available"
  try {
    bridge.audioLevels.on((l) => { const was = levels === null; levels = l; if (was !== (l === null)) render(); wave(); });
  } catch (e) { levels = null; }   // switched off in the row
  bridge.ready();
}
render();
wave();
