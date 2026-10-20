# Widgets

A widget is a small web page placed on a wallpaper: a clock, the date, the weather. iWalpapper draws
the card (the container) and lays your page over it, so the page draws only its content on a
transparent background.

Examples: [`Examples/DateWidget`](examples/DateWidget); [`Examples/ClockWidget`](examples/ClockWidget), the clock port (no container, lock-screen faces, glass text, `resizable`); [`Examples/MusicWidget`](examples/MusicWidget), the music port (Now Playing, audio levels, layouts, looks, hover, `setVisible`).

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
| `widget.containers` | no | the containers people may pick in the row's Look, `container` (the default) among them: `["glass", "frosted", "solid"]`. Your page gets the chosen one as `settings.look` |
| `widget.layouts` | no | named sizes people pick in the row's Layout, in place of `size`: `[{ "id": "card", "title": "Card", "size": [320, 360], "cornerRadius": 26 }, …]` (`cornerRadius` optional), the first the default. Your page gets the chosen `id` as `settings.layout` |
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

A widget with nothing to show (a music widget while nothing plays) can call
`iwalpapper.setVisible(false)`: iWalpapper fades its card out and lets clicks through there, and
your page clears its own content; `setVisible(true)` brings it back. `display.preview` is `true`
in the app's own previews (the wallpaper page, Create Extension), where people still need to see
the widget to place it: show your empty state there instead.

A card that needs less room for a while (the music card with its waveform off) can call
`iwalpapper.setHeight(points)` (0.7.2): iWalpapper makes the card that many of your page's points
tall, from 32 up to the layout's height (never taller), keeping its centre, and your page lays out
at that height. Measure your content (`getBoundingClientRect().height`) and call it again when that
changes; it is forgotten when the page starts again.

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
  presses on the bare desktop come through (not through a window). With the pointer over your card
  and no press (0.7.2), the element under it gets `pointerover`, `pointerenter`, `pointermove`,
  `pointerout` and `pointerleave` (and the `mouse…` ones), about 30 moves a second, never while a
  window covers the card. CSS `:hover` doesn't follow them: toggle a class in `pointerenter` and
  `pointerleave`. `iwalpapper.haptic("firm" | "soft")` taps the trackpad, only while the pointer is
  over your widget. No keyboard, and the events are synthetic (`isTrusted` is false). Without it, clicks go through to
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
