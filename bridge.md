# Bridge reference (v2)

`window.iwalpapper` is how a page talks to iWalpapper. It exists before your first script runs.
Declare `"bridgeVersion": 2` in the manifest.

Write calls as `window.iwalpapper?.settings?.current?.()` so the page also opens in a plain
browser, where there is no bridge.

## What each kind gets in 0.7.0

| Member | Widget | Code wallpaper |
|---|---|---|
| `settings` | yes | yes |
| `time.current()` | yes | yes |
| `time.on("minute")` | yes | no |
| `display`, `palette`, `storage` | yes | no |
| `ready`, `reportError`, `reportDiagnostic` | yes | yes |

Preset packs and shaders have no page, so no bridge. Shaders get uniforms instead
([Wallpapers › Shaders](wallpapers.md#shaders)).

## Events and state

```js
iwalpapper.on("settings", (values, state) => render(values));
iwalpapper.state; // { settings, display, palette, storage }, as last sent
```

`on(name, fn)` takes `settings`, `display`, `palette` or `storage`. The host sends the whole state
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
iwalpapper.display.current(); // { width, height, scale, appearance: "dark" | "light" }
iwalpapper.display.on((d) => document.body.classList.toggle("light", d.appearance === "light"));
```

The display the widget is on, in points, with its scale and the system appearance.

## Palette (widgets)

```js
iwalpapper.palette.current(); // ["#1E3A8A", "#DB2777", ...]
iwalpapper.palette.on((colours) => …);
```

Five `#RRGGBB` colours taken from the wallpaper, the colour at its centre first. It changes when
the wallpaper does: use it to tint your text or accents so the widget fits any wallpaper.

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
| 0.7.1 | `fetch` to declared hosts, system stats, calendar, location | `network`, `systemStats`, `calendar`, `location` |
| 0.7.2 | `nowPlaying` (song, artwork, progress, play/pause/skip) | `nowPlaying` |

Calling a namespace whose permission was revoked fails with `permission`. See
[Permissions](permissions.md).
