// The native Clock widget (ClockWidgetLayer) as a page: the same faces, sizes, spacing and inks,
// laid out by each line's ink, as the native one lays out glyph outlines.
const bridge = window.iwalpapper;
const W = 640, H = 300;
// Room for the shadow, which would otherwise be cut off at the page's edge.
const PAD = 18;
const DEFAULTS = { font: "System", weight: 0.8, date: true, hours: "System", colour: "System", brightness: 0.7 };
const FACES = { "SF Pro": "standard", Rounded: "rounded", "New York": "serif", Slab: "slab", Soft: "soft", Rail: "rail", Stencil: "stencil" };
// The date is in the system font in the face's design (the lock-screen faces hold only digits).
const DESIGN = { rounded: "ui-rounded", soft: "ui-rounded", serif: "ui-serif", slab: "ui-serif" };

const $ = (id) => document.getElementById(id);
const measure = document.createElement("canvas").getContext("2d");
let settings = DEFAULTS, renders = 0;

// As the lock screen: 9:41 or 18:06, never 9:41 AM; "Sat 17 Oct", without commas. The Mac's region and
// 24-hour setting come from the host (WebKit's own locale is US English).
const mac = () => (bridge && bridge.lockScreen.current()) || {};
const locales = () => mac().locale ? [mac().locale] : [];
const timeText = (now, hours) => {
  const h24 = hours === "24-hour" || hours !== "12-hour" && !!mac().hour24;
  return new Intl.DateTimeFormat(locales(), { hour: h24 ? "2-digit" : "numeric", minute: "2-digit", hourCycle: h24 ? "h23" : "h12" })
    .formatToParts(now).filter((p) => p.type !== "dayPeriod").map((p) => p.value).join("").trim();
};
// The fields in the native clock's order (`dateFormat`, Unicode patterns), since `Intl` lacks some regions.
const dateText = (now) => {
  const part = (o) => now.toLocaleDateString(locales(), o);
  const field = {
    E: (n) => part({ weekday: n > 3 ? "long" : "short" }),
    M: (n) => part({ month: n > 3 ? "long" : n === 3 ? "short" : n === 2 ? "2-digit" : "numeric" }),
    d: (n) => part({ day: n === 2 ? "2-digit" : "numeric" }),
  };
  field.c = field.E; field.L = field.M;
  const pattern = mac().dateFormat;
  if (!pattern) return part({ weekday: "short", month: "short", day: "numeric" }).replace(/,/g, "");
  return pattern.replace(/'([^']*)'|([EcMLd])\2*/g, (m, literal, f) => literal !== undefined ? literal : field[f](m.length));
};

// `ClockWidgetLayer.lockInk`: the backdrop lifted toward white; white when it isn't known.
const hex = (c) => c && /^#[0-9a-f]{6}$/i.test(c) ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) : null;
const lockInk = (backdrop, lift) => {
  const rgb = (backdrop || [1 - lift, 1 - lift, 1 - lift]).map((v) => Math.round(Math.min(1, v + lift) * 255));
  return `rgb(${rgb.join(",")})`;
};

function style() {
  const s = Object.assign({}, DEFAULTS, settings);
  const lock = s.font === "System" && bridge ? bridge.lockScreen.current() : null;
  const name = lock ? lock.face : FACES[s.font] || "standard";
  const face = bridge?.faces[name] || bridge?.faces.standard;
  const [lo, hi] = face ? face.weight : [100, 900];
  const weight = Math.min(hi, Math.max(lo, lock && lock.weight != null ? lock.weight : lo + (hi - lo) * Number(s.weight)));
  const family = face ? `"${face.family}", system-ui` : "system-ui";
  return { s, name, weight, family, dateFamily: DESIGN[name] || "system-ui" };
}

// Each line's ink box at the baseline origin, as `CGPath.boundingBox` gives the native layer.
function ink(text, font) {
  measure.font = font;
  const m = measure.measureText(text);
  return { left: -m.actualBoundingBoxLeft, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
           ascent: m.actualBoundingBoxAscent, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
}

async function render() {
  const { s, name, weight, family, dateFamily } = style();
  const now = new Date();
  // The native clock's size: 13.9% of the display's height (`ClockWidgetMetrics`, size 0.4), smaller only when
  // the widest digits wouldn't fit, so it never jumps a minute later; the host's Size slider scales the whole page.
  const n = ++renders;
  await document.fonts.load(`${weight} 100px ${family}`, "0123456789:").catch(() => {});
  if (s.date) await document.fonts.load(`600 20px ${dateFamily}`).catch(() => {});
  // A later render (a slider being dragged) has taken over.
  if (n !== renders) return;
  const wide = ink("88:88", `${weight} 100px ${family}`).width;
  const native = 0.1391 * (bridge?.display.current()?.height || 1080);
  const fs = wide ? Math.min(native, 100 * (W - 2 * PAD) / wide) : native;
  const lines = [{ el: $("time"), text: timeText(now, s.hours), family, weight, size: fs, lift: 0.35, isTime: true }];
  // Semibold at a fifth of the time's size, as measured on the lock screen.
  if (s.date) lines.unshift({ el: $("date"), text: dateText(now), family: dateFamily, weight: 600, size: fs * 0.2, lift: 0.4 });
  $("date").style.display = s.date ? "" : "none";

  const backdrop = hex(bridge?.backdrop.current());
  const luminance = backdrop ? 0.299 * backdrop[0] + 0.587 * backdrop[1] + 0.114 * backdrop[2] : 0;
  const light = s.colour === "White" || (s.colour === "Adaptive" || s.colour === "System") && luminance < 0.55;
  const lockLook = s.colour === "Glass" || s.colour === "System" && light;
  const canGlass = !!bridge?.display.current()?.glass;
  const brightness = Number(s.brightness);

  const gap = fs * 0.139;   // the lock screen's, date ink to time ink
  const boxes = lines.map((l) => ink(l.text, `${l.weight} ${l.size}px ${l.family}`));
  const blockH = boxes.reduce((h, b) => h + b.height, 0) + gap * (lines.length - 1);
  let top = (H - blockH) / 2;
  const runs = [];
  lines.forEach((l, i) => {
    const b = boxes[i];
    const x = (W - b.width) / 2, glass = lockLook && canGlass && (l.isTime || s.colour === "Glass");
    l.el.textContent = l.text;
    l.el.setAttribute("x", x - b.left);
    l.el.setAttribute("y", top + b.ascent);
    l.el.setAttribute("font-family", l.family);
    l.el.setAttribute("font-size", l.size);
    l.el.setAttribute("font-weight", l.weight);
    l.el.setAttribute("fill", lockLook ? lockInk(backdrop, l.lift + 0.35 * brightness) : light ? "#fff" : "#000");
    // Brightness dims the flat ink; the host's glass takes it itself.
    l.el.setAttribute("opacity", 0.4 + 0.6 * brightness);
    l.el.classList.toggle("shadow", !lockLook);
    l.el.style.visibility = glass ? "hidden" : "visible";
    if (glass) runs.push({ text: l.text, face: name, weight: l.weight, size: l.size, box: { x, y: top, width: b.width, height: b.height }, system: !l.isTime });
    top += b.height + gap;
  });
  if (bridge) runs.length ? bridge.glass.text(runs, { brightness }) : bridge.glass.clear();
}

function minute() {
  render();
  setTimeout(minute, 60000 - Date.now() % 60000 + 5);
}

if (bridge) {
  bridge.on("settings", (s) => { settings = s; render(); });
  for (const name of ["lockScreen", "backdrop", "display"]) bridge[name].on(render);
  settings = bridge.settings.current() || DEFAULTS;
}
minute();
bridge?.ready();
