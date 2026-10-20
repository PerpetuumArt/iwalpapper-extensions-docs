// The native Now Playing wallpaper as a live code wallpaper: the gradient from the song's artwork
// colours (`track.palette`), and over it the artwork, the song and the controls, laid out as the native
// `MusicWallpaperLayout` (Music's full-screen player). It runs in the widget host, with `nowPlaying`.
"use strict";

const bridge = window.iwalpapper;
const $ = (id) => document.getElementById(id);
const SAMPLE = { colors: ["#7A3B69", "#D9825B", "#2E3A6E"], background: "#24121F", weights: [0.45, 0.3, 0.25] };
const POSITIONS = { Left: 0.3, Centre: 0.5, Right: 0.7 };
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let settings = {
  position: "Centre", size: 0.32, corners: 0.3, shadow: true, artworkHover: true,
  showTitle: true, showArtist: true, showAlbum: true, textSize: 0.4,
  interactive: true, showProgress: true, lockProgress: true, showPlayPause: true, showSkip: true, showShuffle: true, showRepeat: true,
  fill: "Artwork gradient", speed: 1, movement: 1, swirl: 0.3, grain: 0.3, dim: 0.1, transition: true,
  launcher: true, launcherStyle: "Stamp", follow: { mode: "all", apps: [] },
};
// `undefined` until the bridge answers; `null` when macOS doesn't share Now Playing.
let song, allowed = true, palette = null, noArtwork = null, ticker = null, armedUntil = 0;

// MARK: The gradient

const canvas = $("gradient");
const draw = MusicGradient.renderer(canvas);
let target = null, from = null, transitionStart = 0, phase = 0, lastTick = performance.now(), frame = null;
const options = () => Object.assign({}, settings, { x: POSITIONS[settings.position] ?? 0.5, y: 0.44 });

// Makes `next` the gradient, blending from what shows over 3 s (eased) when asked and allowed.
function show(next, animated) {
  const definition = MusicGradient.definition(next, options());
  const now = performance.now();
  from = animated && target && settings.transition && !reducedMotion.matches ? blended(now) : null;
  transitionStart = now;
  target = definition;
  palette = next;
  stamp();
  tick();
}

const progressOf = (now) => { const s = Math.min(Math.max((now - transitionStart) / 3000, 0), 1); return s * s * (3 - 2 * s); };
// What shows now, as a gradient of its own (for a transition that starts mid-way).
function blended(now) {
  if (!from) return target;
  const t = progressOf(now), mix = (a, b) => a + (b - a) * t, mixC = (a, b) => a.map((c, k) => Math.sqrt(mix(c * c, b[k] * b[k])));
  return Object.assign({}, target, {
    background: mixC(from.background, target.background),
    points: target.points.map((p, i) => Object.assign({}, p, { x: mix(from.points[i].x, p.x), y: mix(from.points[i].y, p.y),
      size: mix(from.points[i].size, p.size), drift: mix(from.points[i].drift, p.drift), color: mixC(from.points[i].color, p.color) })),
  });
}

// At the native pace: 10 frames a second, more for a faster gradient (at most 30), 60 while the colours change.
function tick() {
  clearTimeout(frame);
  if (!draw || !target) return;
  const now = performance.now();
  phase += Math.min(Math.max(now - lastTick, 0), 500) / 1000 / target.loopSeconds;
  lastTick = now;
  if (from && now - transitionStart >= 3000) from = null;
  draw(target, phase, from, progressOf(now));
  // A flat colour holds still between transitions.
  if (settings.fill !== "Artwork gradient" && !from) return;
  const fps = from ? 60 : Math.min(10 * Math.max(1, settings.speed * settings.movement), 30);
  frame = setTimeout(tick, 1000 / fps);
}

// MARK: The song

const follows = (t) => {
  const listed = !!t?.source?.bundleID && (settings.follow?.apps || []).includes(t.source.bundleID);
  return settings.follow?.mode === "only" ? listed : settings.follow?.mode === "except" ? !listed : true;
};
// The song shown: one that plays (a title) from an app it follows.
const playing = () => (song && song.title && follows(song) ? song : null);

function songChanged() {
  // Not followed: keep what shows, as nothing playing.
  if (song && song.title && !follows(song)) return render();
  const colours = song?.palette?.colors?.length ? song.palette : null;
  clearTimeout(noArtwork);
  if (colours) {
    if (JSON.stringify(colours) !== JSON.stringify(palette)) show(colours, true);
  } else if (song?.title && !song.artwork) {
    // A new song comes first without its artwork; only one that stays without gets the neutral colours.
    noArtwork = setTimeout(() => { if (playing() && !song.artwork) show(MusicGradient.NEUTRAL, true); }, 2000);
  }
  render();
}

const time = (seconds) => {
  const total = Math.floor(seconds), pad = (n) => String(n).padStart(2, "0");
  return total >= 3600 ? `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}` : `${Math.floor(total / 60)}:${pad(total % 60)}`;
};
const elapsed = (t) => {
  let now = t.elapsed || 0;
  if (t.playing && t.timestamp) now += (Date.now() - t.timestamp) / 1000 * (t.rate || 1);
  return Math.max(0, t.duration ? Math.min(now, t.duration) : now);
};

function progress() {
  const t = playing();
  if (!t) return;
  const duration = t.duration || 0, played = elapsed(t);
  $("fill").style.width = (duration > 0 ? Math.min(played / duration, 1) * 100 : 0) + "%";
  $("elapsed").textContent = time(played);
  $("remaining").textContent = "-" + time(Math.max(duration - played, 0));
}

// MARK: Layout

function render() {
  const t = playing(), H = innerHeight, W = innerWidth;
  const side = H * settings.size, unit = side / 408 * (0.6 + settings.textSize);
  const root = document.documentElement.style;
  root.setProperty("--side", side + "px");
  root.setProperty("--unit", unit + "px");
  root.setProperty("--radius", side * 0.12 * settings.corners + "px");
  root.setProperty("--x", W * (POSITIONS[settings.position] ?? 0.5) + "px");
  root.setProperty("--y", H * 0.44 + "px");
  root.setProperty("--launcher", Math.max(side * 0.17, 40) + "px");

  const player = $("player");
  player.classList.toggle("hidden", !t);
  player.classList.toggle("shadow", settings.shadow);
  player.classList.toggle("hovers", settings.interactive && settings.artworkHover);
  $("launcher").classList.toggle("hidden", !!t || !settings.launcher || !allowed || song === null);
  $("launcher").classList.toggle("glass", settings.launcherStyle === "Glass");
  $("unavailable").classList.toggle("hidden", song !== null || !allowed);
  clearInterval(ticker);
  if (!t) return;

  if ($("cover").getAttribute("src") !== (t.artwork || null)) t.artwork ? ($("cover").src = t.artwork) : $("cover").removeAttribute("src");
  $("title").textContent = t.title;
  $("title").classList.toggle("hidden", !settings.showTitle);
  const second = [settings.showArtist && t.artist, settings.showAlbum && t.album].filter(Boolean).join(" — ");
  $("second").textContent = second;
  $("second").classList.toggle("hidden", !second);
  const shows = settings.showProgress && (t.duration || 0) > 0;
  $("progress").classList.toggle("hidden", !shows);
  $("progress").classList.toggle("seeks", settings.interactive && !settings.lockProgress);
  const controls = $("controls");
  controls.classList.toggle("hidden", !settings.interactive);
  controls.classList.toggle("playing", !!t.playing);
  controls.querySelector(".toggle").classList.toggle("hidden", !settings.showPlayPause);
  for (const name of ["previous", "next"]) controls.querySelector("." + name).classList.toggle("hidden", !settings.showSkip);
  controls.querySelector(".shuffle").classList.toggle("off", !t.shuffle);
  controls.querySelector(".shuffle").classList.toggle("gone", !settings.showShuffle || t.shuffle == null);
  controls.querySelector(".repeat").classList.toggle("off", !t.repeat);
  controls.querySelector(".repeat").classList.toggle("gone", !settings.showRepeat || t.repeat == null);
  if (!settings.interactive) $("artwork").classList.remove("grown", "armed");
  progress();
  // Ticks once a second only while playing.
  ticker = shows && t.playing ? setInterval(progress, 1000) : null;
}

// The open button's Stamp: the gradient's main colour as it shows, a shade darker.
function stamp() {
  const c = target?.points[0]?.color || [0.2, 0.2, 0.2];
  document.documentElement.style.setProperty("--stamp", `rgb(${c.map((v) => Math.round(v * 0.6 * 255)).join(",")})`);
}

// MARK: Pointer

const call = (name, ...args) => { try { bridge?.nowPlaying?.[name]?.(...args); } catch (e) {} };

for (const button of document.querySelectorAll("#controls button, #launcher")) {
  button.addEventListener("pointerdown", () => button.classList.add("pressed"));
  button.addEventListener("pointerup", () => button.classList.remove("pressed"));
  button.addEventListener("pointerleave", () => button.classList.remove("pressed"));
}
for (const name of ["previous", "next", "shuffle", "repeat"]) {
  document.querySelector("#controls ." + name).addEventListener("click", () => settings.interactive && call(name));
}
document.querySelector("#controls .toggle").addEventListener("click", () => settings.interactive && call("toggle"));
$("launcher").addEventListener("click", () => call("openApp"));
const launcherHover = (on) => $("launcher").classList.toggle("grown", on);
$("launcher").addEventListener("pointerenter", () => launcherHover(true));
$("launcher").addEventListener("pointerleave", () => launcherHover(false));

// The artwork grows under the pointer with a tap of the trackpad; click it, then click again to open the app.
const artwork = $("artwork");
artwork.addEventListener("pointerenter", () => {
  if (!settings.interactive || !settings.artworkHover) return;
  artwork.classList.add("grown");
  bridge?.haptic?.("firm");
});
artwork.addEventListener("pointerleave", () => artwork.classList.remove("grown"));
artwork.addEventListener("click", () => {
  if (!settings.interactive || !settings.artworkHover) return;
  if (Date.now() < armedUntil) {
    armedUntil = 0;
    artwork.classList.remove("armed");
    return call("openApp");
  }
  armedUntil = Date.now() + 2000;
  artwork.classList.add("armed");
  setTimeout(() => { if (Date.now() >= armedUntil) artwork.classList.remove("armed"); }, 2050);
});

// Seeking where the press ended, unless the bar is locked.
$("track").addEventListener("click", (e) => {
  const t = playing();
  if (!t?.duration || !settings.interactive || settings.lockProgress) return;
  const box = $("track").getBoundingClientRect();
  call("seek", Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1) * t.duration);
});

// MARK: Start

addEventListener("resize", render);
bridge?.on?.("settings", (s) => {
  const refollow = JSON.stringify(s.follow) !== JSON.stringify(settings.follow);
  settings = Object.assign(settings, s);
  if (palette) show(palette, false);
  if (refollow) songChanged(); else render();
});
if (bridge?.nowPlaying) {
  try {
    bridge.nowPlaying.on((t) => { song = t; songChanged(); });
    // Null here may only mean nothing has arrived yet; the first delivery says.
    song = bridge.nowPlaying.current() || undefined;
  } catch (e) {
    allowed = false;   // switched off on its Library page: the neutral colours, nothing else
  }
}
// Without the bridge (Discover's picture), the sample colours and the open button.
show(bridge?.nowPlaying ? MusicGradient.NEUTRAL : SAMPLE, false);
if (song !== undefined) songChanged(); else render();
bridge?.ready?.();
