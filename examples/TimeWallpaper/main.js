// A sky for any moment of the day. Each loop is recorded with the page's clock at one of the
// manifest's times, so the page reads the hour once; outside iWalpapper it uses the real time.
const now = window.iwalpapper?.time?.current?.() ?? new Date();
const hour = now.getHours() + now.getMinutes() / 60;

// Sky colours through the day (top, middle, horizon), blended between the hours listed.
const skies = [
  [0, "#02030A", "#0A0F24", "#141B3A"],
  [4.5, "#050817", "#111836", "#1E2650"],
  [5.5, "#121B44", "#3A3F78", "#A86A86"],
  [7, "#2D4E8E", "#8BA2C9", "#F6B27A"],
  [10, "#3C7BD0", "#8FBFEA", "#D9ECF8"],
  [13, "#2A6FD1", "#78B4EC", "#CFE6F8"],
  [17, "#3A6CB8", "#A9B8D0", "#F5C98A"],
  [19.5, "#2B2E66", "#B0567A", "#F48C4C"],
  [20.5, "#1A1E4A", "#4A3A72", "#C46A5E"],
  [21, "#0F1636", "#27306A", "#5A4A80"],
  [22.5, "#060A1C", "#0F1530", "#1B2246"],
  [24, "#02030A", "#0A0F24", "#141B3A"],
];
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => "rgb(" + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t)).join(",") + ")";
const clamp = (v) => Math.min(1, Math.max(0, v));

const next = skies.findIndex(([h]) => h > hour);
const [from, to] = [skies[next - 1], skies[next]];
const t = (hour - from[0]) / (to[0] - from[0]);
const style = document.body.style;
["--top", "--middle", "--horizon"].forEach((name, i) => style.setProperty(name, mix(from[i + 1], to[i + 1], t)));

// The sun rises at 6:30 and sets at 20:00, along an arc; low, it is warm.
const day = (hour - 6.5) / 13.5;
const height = Math.sin(Math.PI * clamp(day));
style.setProperty("--sun-x", (8 + clamp(day) * 84) + "%");
style.setProperty("--sun-y", (88 - height * 70) + "%");
style.setProperty("--sun", mix("#FF9A5A", "#FFF6D8", clamp(height * 1.6)));
style.setProperty("--sun-opacity", day > 0 && day < 1 ? clamp(height * 6) : 0);

// Stars fade out at dawn and in at dusk; the same field every time (a seeded random).
style.setProperty("--stars", clamp(Math.max((5.5 - hour) / 1, (hour - 20.5) / 1.5)));
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const field = (count, size, alpha) => Array.from({ length: count }, () =>
  `${(random() * 100).toFixed(2)}vw ${(random() * 75).toFixed(2)}vh 0 ${size}px rgba(255,255,255,${(alpha * (0.4 + random() * 0.6)).toFixed(2)})`).join(",");
style.setProperty("--star-field", field(120, 1, 1));
style.setProperty("--star-field-far", field(220, 0.5, 0.7));
