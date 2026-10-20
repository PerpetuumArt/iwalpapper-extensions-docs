# Wallpapers

A wallpaper extension (`"kind": "wallpaper"`) is one of four things:

| Form | You write | Example |
|---|---|---|
| [Code wallpaper](#code-wallpapers) | a web page (`entry`) | [`GradientWallpaper`](examples/GradientWallpaper); live: [`MusicWallpaper`](examples/MusicWallpaper) |
| [Time generator](#time-generators) | a web page that reads the hour, plus `times` | [`TimeWallpaper`](examples/TimeWallpaper) |
| [Preset pack](#preset-packs) | gradient recipes (`wallpaper.presets`), no code | [`GradientPack`](examples/GradientPack) |
| [Shader](#shaders) | one GLSL file (`wallpaper.shader`) | [`ShaderWallpaper`](examples/ShaderWallpaper) |

All four are added with **Add Extension** in Discover. The extension becomes a Discover source:
its card shows a picture, clicking the picture opens a live preview, and **Add & Use** / **Add to
Library** put it in the Library. Removing the extension removes what it added.

**Most wallpapers become videos.** Adding one records it into a 30-second loop (the last second
fades into the first), and only the video goes in the Library. It costs what any video costs, so
it plays all day on a laptop. A page that needs to stay live (it follows the cursor, takes clicks
or shows live data) says `"playback": "live"`.

## Code wallpapers

```json
{
  "schemaVersion": 3,
  "id": "app.iwalpapper.examples.gradient-wallpaper",
  "version": "0.1.1",
  "kind": "wallpaper",
  "title": "Drifting Gradient",
  "description": "Two colours drifting slowly across the screen.",
  "author": { "name": "iWalpapper" },
  "entry": { "path": "index.html", "runtime": "web" },
  "bridgeVersion": 2,
  "settings": [
    { "id": "from", "type": "color", "title": "First colour", "default": "#1E3A8A" },
    { "id": "to", "type": "color", "title": "Second colour", "default": "#DB2777" },
    { "id": "style", "type": "choice", "title": "Direction", "options": ["Diagonal", "Vertical"], "default": "Diagonal" },
    { "id": "speed", "type": "slider", "title": "Speed", "min": 0.25, "max": 4, "step": 0.25, "default": 1 }
  ]
}
```

| Field | Required | Rules |
|---|---|---|
| `entry` | yes | `{ "path": "index.html", "runtime": "web" }`; the path must be `index.html` for now (at most 1 MiB) |
| `bridgeVersion` | yes | `2` |
| `playback` | no | `"video"` (default) or `"live"` |
| `resolution` | no | `"display"` (default) or `"soft"`: recorded 1280 pixels wide in the display's shape, quicker and smaller. Use it for soft shapes (gradients, skies); text and fine lines need `"display"`. Not with `"live"` |
| `times` | no | makes it a [time generator](#time-generators). Not with `"live"` |
| `settings` | no | controls chosen before adding ([below](#settings)) |
| `permissions` | no | live: `nowPlaying`, `audioLevels` ([below](#live-wallpapers)); recorded: only `["location"]`, and only for [sun times](#sunrise-and-sunset). No `network` |

The page follows the same rules as a widget's: CSS and JavaScript in files (no inline `<style>`,
`<script>`, `style="…"` or `on…=`), relative paths, only its own files. It fills the screen and
draws its own background.

**Make it loop.** A video wallpaper is the first 30 seconds of your page, with the end faded into
the start. Motion that repeats every 30 seconds, or every 10 or 15, loops without a seam; slow,
gentle motion hides the fade best.

### Settings

People choose the settings on the Discover preview page, with your page following live, before
adding. Each different choice becomes its own Library item, named after what differs from the
defaults ("Drifting Gradient · Vertical").

The host writes `iwalpapper-settings.js` beside your page and loads it first, so you don't link it.
Read the values with:

```js
window.iwalpapper?.on?.("settings", (s) => {
  const style = document.body.style;
  style.setProperty("--from", s.from);
  style.setProperty("--to", s.to);
  style.setProperty("--angle", s.style === "Vertical" ? "180deg" : "135deg");
  for (const animation of document.getAnimations()) animation.updatePlaybackRate(s.speed);
});
```

`settings.current()` returns the same values at any time. A recorded wallpaper gets only `settings`
and `time.current()` from the bridge; a [live one](#live-wallpapers) gets most of it.

**A speed setting changes the rate, never the length of the loop.** Values arrive while the slider
is dragged. A page that sets a new `animation-duration`, or draws from `time * speed`, jumps to
another point of its loop at every step. Keep the position and change how fast it moves:
`animation.updatePlaybackRate(speed)` for CSS and Web Animations, or a phase advanced by
`delta * speed` each frame.

### Live wallpapers

With `"playback": "live"`, the page itself goes in the Library and runs on the desktop, as one
full-screen frame of the widget host (0.7.2): it gets the bridge as a widget does (`display`,
`storage`, `time.on("minute")`, clicks and hover, `haptic`; the table is in
[Bridge reference](bridge.md#what-each-kind-gets)), and may ask for `nowPlaying` and `audioLevels`.
Clicks reach it only on the bare desktop, and moves without a press arrive as hover events.
Paused, a still of the page stands in for it; released, the still stays and the page goes.

Its settings stay changeable on its Library page, under their `group` headings, and reach the
running page through `on("settings")` without a reload. An `apps` setting is picked there too
(Discover starts it at All).

- **Without permissions:** a video version is recorded too, for the lock screen and Convert to
  Video. iWalpapper asks "Run …?" when it is set as the wallpaper, until the person turns that off.
- **With permissions:** Add & Use and Add to Library show what it may do, once, in place of "Run …?";
  its Library page and Settings › Privacy have a switch for each. It isn't recorded (what it shows
  is live data), so it has no video version and doesn't play on the lock screen. Handle a permission
  switched off: its calls throw `Error("permission")`.

[`MusicWallpaper`](examples/MusicWallpaper) is the native Now Playing wallpaper made this
way: the artwork's colours as a WebGL gradient drawn small and stretched at 10 frames a second, and
the artwork, song and controls over it.

## Time generators

A time generator is a code wallpaper that looks different through the day. Declare 2-8 times,
earliest first:

```json
"times": ["00:00", "05:30", "07:00", "10:00", "13:00", "17:00", "19:30", "21:00"],
"resolution": "soft"
```

Adding it records one loop per time, with the page's clock set to that hour: `Date` and
`iwalpapper.time.current()` both read it. The loops go in the Library as one item that plays the
loop whose time came last and fades to the next over 5 seconds when its time comes. People can move
or switch off times on its Library page.

Read the hour once, at load:

```js
const now = window.iwalpapper?.time?.current?.() ?? new Date();
const hour = now.getHours() + now.getMinutes() / 60;
```

In the Discover preview the page runs at the real time, so check each of your times by changing
your Mac's clock, or by temporarily replacing `now` with a fixed `new Date()` in a browser.

### Sunrise and sunset

A time can be `"sunrise"` or `"sunset"`, with the `location` permission:

```json
"times": ["sunrise", "12:00", "sunset", "22:00"],
"permissions": ["location"]
```

iWalpapper works out the day's sunrise and sunset from the Mac's approximate location and plays
those loops then, moving them each day. They're recorded at that day's times, and your page never
gets the location (it's recorded, not live). For the order, and until the location is known (or
where the sun doesn't rise or set that day), sunrise counts as 06:00 and sunset as 18:00, so
`["05:00", "sunrise"]` is fine and `["06:00", "sunrise"]` is refused. A sun time can't pass its
neighbours: a 04:50 sunrise after a `"05:00"` plays at 05:01.

## Preset packs

A preset pack is a set of animated gradients drawn by iWalpapper's own mesh renderer. No page, no
code: each preset is a small JSON recipe.

```json
{
  "schemaVersion": 3,
  "id": "app.iwalpapper.examples.gradient-pack",
  "version": "0.1.0",
  "kind": "wallpaper",
  "title": "Seaside Gradients",
  "description": "Two gradients in sea colours.",
  "author": { "name": "iWalpapper" },
  "wallpaper": {
    "presets": [
      { "id": "tide-pool", "title": "Tide Pool", "description": "Teal and sand, drifting slowly.", "mesh": "gradients/tide-pool.json" },
      { "id": "harbour-night", "title": "Harbour Night", "mesh": "gradients/harbour-night.json" }
    ]
  }
}
```

A pack has no `entry`, `bridgeVersion`, `permissions`, `network`, `settings` or `playback`.
`presets` holds 1-64 gradients, each with:

| Field | Rules |
|---|---|
| `id` | 1-64 of `a-z 0-9 -`, different in the pack; `<extension id>.<preset id>` is at most 128 characters |
| `title` | 1-80 characters |
| `description` | optional |
| `mesh` | relative path to a `.json` recipe, checked when the pack is added |

Discover shows each preset as its own card; adding one records it into a video.

### The recipe

```json
{
  "background": "#0F3D3E",
  "loopSeconds": 120,
  "swirl": 0.2,
  "grain": 0.3,
  "points": [
    { "x": 0.2, "y": 0.3, "color": "#1F8A84", "size": 0.7, "drift": 0.18, "cyclesX": 1, "cyclesY": 1, "phase": 0 },
    { "x": 0.8, "y": 0.7, "color": "#E8D5A9", "size": 0.55, "drift": 0.2, "cyclesX": 1, "cyclesY": 2, "phase": 0.4 }
  ]
}
```

| Field | Default | Meaning |
|---|---|---|
| `background` | required | `#RRGGBB`, shown where no point reaches |
| `points` | required | 1-12 coloured points |
| `loopSeconds` | 60 | seconds per loop, 10-600 |
| `swirl` | 0 | 0-1, how much the whole sheet ripples |
| `grain` | 0.3 | 0-1, fine grain on the picture |

Each point: `x`, `y` (0-1 of the display), `color` (`#RRGGBB`), `size` (reach as a fraction of the
display's height, 0.1-1.5), `drift` (how far it wanders, 0-0.5), `cyclesX`, `cyclesY` (whole turns
per loop, 1-4) and `phase` (0-1, where on its path it starts). Every motion is a whole number of
turns per loop, so recipes always loop seamlessly. Out-of-range values are clamped; a recipe is at
most 16 KiB.

## Shaders

A shader wallpaper is one GLSL file, written as on Shadertoy:

```json
"wallpaper": { "shader": "main.frag" }
```

Like a pack, it has no `entry`, `bridgeVersion`, `permissions`, `network`, `settings` or
`playback`. The file is `.frag` or `.glsl`, UTF-8, at most 1 MiB, and defines:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
```

| Uniform | Type | Value |
|---|---|---|
| `iResolution` | `vec3` | the size in pixels |
| `iTime`, `iTimeDelta` | `float` | seconds since the start, and since the last frame |
| `iFrame` | `int` | frame number |
| `iMouse` | `vec4` | always zero (the shader is recorded) |
| `iDate` | `vec4` | year, month (0-11), day, seconds into the day |

It is GLSL ES 3.00 in WebGL 2. Leave out the `#version` line and the uniform declarations; the host
adds them, and errors still name your file's own line numbers. There are no `iChannel` textures and
alpha is ignored. A shader that doesn't compile shows its error log in the preview instead of a
picture. Shaders take no settings yet.

Shaders are always recorded into a 30-second loop, so a motion that repeats every 30 seconds loops
cleanly (use `iTime * 2.0 * 3.14159265 / 30.0` as an angle).

## Checklist

1. Pick the form: recipe, shader, page (recorded or live), or page with `times`.
2. Page: CSS and JS in files; fills the screen; loops in 30 seconds.
3. Speed settings change the rate, not the loop length.
4. Add it with **Add Extension** in Discover; after each change, add the folder again.
