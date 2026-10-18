# Bridge reference (v2)

`window.iwalpapper` is how a page talks to iWalpapper. It exists before your first script runs.
Declare `"bridgeVersion": 2` in the manifest.

Write calls as `window.iwalpapper?.settings?.current?.()` so the page also opens in a plain
browser, where there is no bridge.

## What each kind gets

| Member | Widget | Code wallpaper |
|---|---|---|
| `settings` | yes | yes |
| `time.current()` | yes | yes |
| `time.on("minute")` | yes | no |
| `display`, `palette`, `backdrop`, `storage` | yes | no |
| `ready`, `reportError`, `reportDiagnostic` | yes | yes |
| `fetch` to `network.hosts` | with `network` | no |
| `system` | with `systemStats` | no |
| `location` | with `location` | no |
| `calendar` | with `calendar` | no |
| `lockScreen`, `faces`, `glass` | yes | no |

Preset packs and shaders have no page, so no bridge. Shaders get uniforms instead
([Wallpapers › Shaders](wallpapers.md#shaders)).

## Events and state

```js
iwalpapper.on("settings", (values, state) => render(values));
iwalpapper.state; // { settings, display, palette, storage }, as last sent
```

`on(name, fn)` takes `settings`, `display`, `palette`, `storage`, `system`, `location` or `calendar`. The host sends the whole state
once the page has loaded, and again whenever something changes; values never arrive before your
first script, so draw a sensible default first and redraw in the callback. Each namespace also has
its own `on(fn)`, the same as `on("<name>", fn)`.

## Settings (declared)

```js
iwalpapper.settings.current();      // { seconds: false, units: "°C", ... }
iwalpapper.settings.on((values) => …);
```

The values by `id`: the one chosen, else the default. Controls are declared in the manifest's
`settings` (at most 32), and iWalpapper draws them:

| `type` | Extra fields | `default` | Your page gets |
|---|---|---|---|
| `toggle` | none | `true` / `false` | a boolean |
| `choice` | `options`: 1-24 different strings (1-100 characters) | one of `options` | the chosen string |
| `slider` | `min` < `max`, optional `step` (default a hundredth of the range) | a number in range | a number |
| `color` | none | `#RRGGBB` | a `#RRGGBB` string |
| `place` | none; widgets only | optional `{ "name", "latitude", "longitude" }` | that object, or `null` until a place is chosen |

A `place` setting is a search field in the widget's row, with suggestions from macOS as the
person types: `{ "id": "city", "type": "place", "title": "City" }`. The lookup is iWalpapper's, so
it needs no permission; your page gets the name and coordinates (4 decimals) and fetches the rest.

Every control has an `id` (1-64 of `A-Z a-z 0-9 . _ -`, letter or digit first, different from the
others) and a `title` (1-80).

```json
"settings": [
  { "id": "units", "type": "choice", "title": "Units", "options": ["°C", "°F"], "default": "°C" },
  { "id": "seconds", "type": "toggle", "title": "Show seconds", "default": false },
  { "id": "speed", "type": "slider", "title": "Speed", "min": 0.25, "max": 4, "step": 0.25, "default": 1 },
  { "id": "tint", "type": "color", "title": "Tint", "default": "#DB2777" }
]
```

## Time

```js
iwalpapper.time.current();                  // a Date
iwalpapper.time.on("minute", (date) => …);  // at each minute boundary (widgets)
```

In a [time generator](wallpapers.md#time-generators) being recorded, `current()` (and `Date`) read
the time of the loop being recorded.

## Display (widgets)

```js
iwalpapper.display.current(); // { width, height, scale, appearance: "dark" | "light", glass: true }
iwalpapper.display.on((d) => document.body.classList.toggle("light", d.appearance === "light"));
```

The display the widget is on, in points, with its scale and the system appearance. `glass` says
whether iWalpapper can draw [glass text](#glass-text-widgets) here (macOS 26 and later).

## Palette (widgets)

```js
iwalpapper.palette.current(); // ["#1E3A8A", "#DB2777", ...]
iwalpapper.palette.on((colours) => …);
```

Five `#RRGGBB` colours taken from the wallpaper, the colour at its centre first. It changes when
the wallpaper does: use it to tint your text or accents so the widget fits any wallpaper.

```js
iwalpapper.backdrop.current(); // "#203040", or null
iwalpapper.backdrop.on((colour) => …);
```

`backdrop` is the wallpaper's colour under the widget's centre, as the native clock reads it for
its Adaptive colour: light text on a dark one, dark on a light one. It changes when the wallpaper
does or the widget moves.

## Storage (widgets)

```js
iwalpapper.storage.get("lastCity");          // a string, or null
iwalpapper.storage.set("lastCity", "Lisbon");
iwalpapper.storage.remove("lastCity");
iwalpapper.on("storage", (all) => …);
```

`get` reads the state the host sent, so it returns `null` until the page has loaded: read in
`on("storage")`. Strings only (use `JSON.stringify` for more), per extension, kept across launches and shared by
all the places the widget is on. At most 128 keys of 1-64 characters and 64 KiB in all; a write
over that is dropped. Removing the extension removes its storage.

## System (widgets, `systemStats`)

```js
iwalpapper.system.on((s) => {
  if (!s) return;  // nothing sampled yet
  cpu.textContent = Math.round(s.cpu * 100) + "%";
});
iwalpapper.system.current();
// { cpu: 0.12, memory: 0.64, network: { in: 52000, out: 3100 },
//   battery: { level: 81, pluggedIn: false } }   battery is null on a Mac without one
```

`cpu` and `memory` are shares from 0 to 1 (CPU across every core, memory in use: active, wired and
compressed). `network` is bytes a second over every interface but loopback. `battery.level` is a
percentage. The first values come about a second after the page loads, then every 5 seconds, and
only while the widget runs (paused, nothing is sampled). Without the permission, `current()` and
`on()` throw an `Error` whose message is `"permission"`.

## Location (widgets, `location`)

```js
iwalpapper.location.on((place) => {
  if (!place) return showHint("Allow location in System Settings");
  load(place.latitude, place.longitude);
});
iwalpapper.location.current(); // { latitude: 38.72, longitude: -9.14, name: "Lisbon" }, or null
```

Approximate: rounded to 2 decimals (about 1 km). `name` is the town or city there, from macOS, or
`null` when macOS can't say (offline, open sea). macOS asks the person the first time a widget
with `location` runs; until they allow it, and if they don't, the value is `null`. It is read
when the widget starts and at most once an hour after. Without the permission, `current()` and
`on()` throw an `Error` whose message is `"permission"`. For a place the person picks instead of
where they are, use a `place` setting, which needs no permission.

## Calendar (widgets, `calendar`)

```js
iwalpapper.calendar.on((events) => {
  if (!events) return showHint("Allow calendars in System Settings");
  render(events.slice(0, 3));
});
// [{ title: "Standup", start: "2026-10-17T09:30:00+03:00", end: "2026-10-17T09:45:00+03:00",
//    allDay: false, color: "#1BADF8" }, ...]
```

The next 7 days from every calendar, soonest first, at most 20, read only: title, `start` and
`end` (ISO 8601 with the offset), `allDay` and the calendar's colour. No notes, places or people.
macOS asks the person the first time a widget with `calendar` runs; until they allow it, and if
they don't, the value is `null`. It updates when the calendars change, and every 15 minutes.
Without the permission, `current()` and `on()` throw an `Error` whose message is `"permission"`.

## Lock screen and its faces (widgets)

```js
iwalpapper.lockScreen.on((style) => {
  if (!style) return;
  const face = iwalpapper.faces[style.face];          // { family: "iWalpapper Rail", weight: [1, 400] }
  time.style.fontFamily = `"${face.family}", system-ui`;
  time.style.fontWeight = style.weight ?? face.weight[1];
});
// { face: "rail", weight: 300 }
```

`lockScreen` is the clock style set in System Settings (Wallpaper › Clock Appearance): `face`
is `standard`, `rounded`, `serif`, `slab`, `soft`, `rail` or `stencil`, and `weight` is in that
face's own units (a CSS `font-weight`), or `null` when the Mac hasn't set one. `hour24` and `locale`
(a BCP 47 tag such as `en-RO`) are the Mac's 24-hour setting and region; your page's `Intl` follows
neither, so pass them on: `new Intl.DateTimeFormat([style.locale], { hourCycle: style.hour24 ? "h23" : "h12", … })`.
`Intl` has no data for some regions (`en-RO` gives the US order), so `dateFormat` is the Mac's own
pattern for a short date, as the native clock shows it (`"EEE d MMM"`, Unicode date fields). It arrives when the
widget starts and again when it changes (read each minute). No permission is needed.

`faces` names the lock screen's own clock faces, which every widget may use: `standard` (SF Pro),
`rounded`, `serif` (New York), `slab`, `soft`, `rail` and `stencil`, each with its CSS `family`
and the `weight` range it has. They're digit faces: `0`-`9` and `:`; letters fall back to the
next family in your `font-family`, so set one (`system-ui`, `ui-rounded`, `ui-serif`). They load
only when the page uses them.

## Glass text (widgets)

```js
const box = time.getBoundingClientRect();
if (iwalpapper.display.current()?.glass) {
  iwalpapper.glass.text([{ text: "09:41", face: "rail", weight: 300, size: 160, box }], { brightness: 0.6 });
  time.style.visibility = "hidden";   // iWalpapper draws it now
}
iwalpapper.glass.clear();
```

A page can't make Liquid Glass on the desktop, so iWalpapper draws the text for you, as the
lock-screen clock's glass digits. Give up to 4 runs: each is the `text` (1-64 characters), a
`face` from `faces`, a `weight` (1-1000, in that face's range), a `size` in points and the `box`
it sits in (your page's points, top-left; a `DOMRect` will do). Its ink is centred in the box.
The faces hold only digits: for words (a date), add `system: true` and the run is drawn in the
system font in that face's design (rounded, serif or plain), as the lock screen's date.
`brightness` (0-1) is how much light the glass carries. Each call replaces the last; `clear()`
removes it. The glass is tinted by the wallpaper under the widget and stays while the widget is
paused. `display.glass` is `false` before macOS 26: there, draw the text yourself.

## Reporting

```js
iwalpapper.ready();
iwalpapper.reportError("Couldn't parse the forecast");
iwalpapper.reportDiagnostic("drew 12 tiles");   // at most 512 characters
```

These go into iWalpapper's diagnostics, not on screen.

## Coming later

| Release | Namespace | Needs |
|---|---|---|
| 0.7.2 | `nowPlaying` (song, artwork, progress, play/pause/skip) | `nowPlaying` |

Calling a namespace whose permission was revoked fails with `permission`. See
[Permissions](permissions.md).
