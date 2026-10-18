# Widgets

A widget is a small web page placed on a wallpaper: a clock, the date, the weather. iWalpapper draws
the card (the container) and lays your page over it, so the page draws only its content on a
transparent background.

Examples: [`Examples/DateWidget`](examples/DateWidget); [`Examples/ClockWidget`](examples/ClockWidget), the clock port (no container, lock-screen faces, glass text, `resizable`).

## Manifest

```json
{
  "schemaVersion": 3,
  "id": "app.iwalpapper.examples.date-widget",
  "version": "0.1.0",
  "kind": "widget",
  "title": "Date",
  "description": "Today's date and time on a glass card.",
  "author": { "name": "iWalpapper" },
  "entry": { "path": "index.html", "runtime": "web" },
  "bridgeVersion": 2,
  "widget": { "container": "glass", "cornerRadius": 22, "size": [320, 160], "resizable": false },
  "settings": [
    { "id": "seconds", "type": "toggle", "title": "Show seconds", "default": false }
  ]
}
```

| Field | Required | Rules |
|---|---|---|
| `entry` | yes | `path`: a relative `.html`/`.htm` file of at most 1 MiB; `runtime`: `"web"` |
| `bridgeVersion` | yes | `2` |
| `widget.container` | yes | `glass`, `clear`, `frosted`, `solid` or `none` (below) |
| `widget.cornerRadius` | no | 0-100 points, default 22 |
| `widget.size` | yes | `[width, height]` in whole points, each 32-4096 |
| `widget.resizable` | no | default `false`; `true` lets people make it larger or smaller (0.7.1, below) |
| `widget.interactive` | no | default `false`; `true` to take clicks ([below](#the-page)) |
| `settings` | no | controls people can change ([below](#settings)) |
| `permissions`, `network` | no | see [Permissions](permissions.md) |

The common fields (`id`, `version`, `title`, `description`, `author`, `homepage`, `icon`) are
described in [Packaging](packaging.md#manifest-fields-every-kind-has).

## The container

| `container` | What iWalpapper draws |
|---|---|
| `glass` | A clear glass card with a lit edge and a soft shadow, like the Music widget's Clear look |
| `clear` | macOS clear Liquid Glass |
| `frosted` | macOS regular (frosted) Liquid Glass |
| `solid` | A dark, almost opaque card |
| `none` | Nothing: no card, shadow or light; your page sits on the wallpaper as it is (0.7.1) |

Before macOS 26, `clear` and `frosted` fall back to a blurred material.

A `resizable` widget can be drawn from half to three times its `size`, with the Size slider in its row. Your page still lays out at
`size`, in its own points, and iWalpapper scales the whole of it, card and clicks included: draw
for `size` and it stays sharp at any scale.

People can switch a glass widget's shadow off in its Widgets panel row. Don't draw your own card,
border or shadow: CSS `backdrop-filter` can't see the wallpaper behind the page, so it blurs nothing,
and a second card would sit inside iWalpapper's.

Your page:

- keeps `html` and `body` transparent;
- fills the widget's size (`height: 100%`), which is the `size` you declared;
- uses light text: every container is dark or see-through, and the wallpaper can be anything, so a
  little `text-shadow` helps on `glass` and `clear`.

## The page

All widgets on a display share one web view, each in its own frame and origin
(`iwalpapper-widget://<key>/`). A widget can't see another widget's page or storage.

- **No inline code.** The page runs under `script-src 'self'; style-src 'self'`: put CSS and
  JavaScript in files. `<style>`, a `<script>` without `src`, `style="…"` and `onclick=` attributes
  are refused when the extension is added.
- **Only your own files and the bridge.** No other origin is reachable unless you declare the
  `network` permission; then `fetch` reaches its hosts over https ([Permissions › Network](permissions.md#network)).
- **Clicks only if you ask.** With `"interactive": true` in `widget`, a press inside your card
  reaches your page as `pointerdown`, `mousedown`, `pointermove` while held, `pointerup`, `mouseup`
  and `click` on the element under it, so `button.addEventListener("click", …)` just works. Only
  presses on the bare desktop come through (not through a window), there's no hover and no
  keyboard, and the events are synthetic (`isTrusted` is false). Without it, clicks go through to
  the desktop; ask only if the widget does something when clicked.
- **Be cheap.** Redraw on `time.on("minute")` rather than every second where you can. When the
  wallpaper is paused, iWalpapper shows a still of your widget and hides the web view; when it is
  released, the web view goes. Your page starts again from scratch when it comes back, so keep
  anything you need in [`storage`](bridge.md#storage-widgets).

## Settings

Declare controls in `settings`; iWalpapper draws them in the widget's row of the Widgets panel and
keeps the values per wallpaper. Your page gets them through the bridge:

```js
window.iwalpapper?.on?.("settings", (s) => {
  seconds = s.seconds;
  render();
});
```

`on("settings")` runs once the page has loaded, with every value (the chosen one, else the
default), and again each time someone changes one. The control types are in
[Bridge reference › Settings](bridge.md#settings-declared).

## Checklist

1. Transparent `html, body`; content fits `size`.
2. CSS and JS in files, linked with relative paths.
3. `window.iwalpapper?.` everywhere, so the page also opens in a browser.
4. Read settings in `on("settings")`; don't cache them elsewhere.
5. After each change, add the folder again (the app works on its own copy).
