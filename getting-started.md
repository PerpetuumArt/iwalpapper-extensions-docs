# Getting started

You'll make a small widget that shows the time on a glass card, add it to iWalpapper and place it on
a wallpaper. You need iWalpapper and a text editor; nothing to install.

## 1. Make the folder

```
HelloWidget/
  extension.json
  index.html
  style.css
  main.js
```

## 2. Write the manifest

`extension.json` says what the extension is. It is strict JSON: a field iWalpapper doesn't know is
refused, so typos show up at once.

```json
{
  "schemaVersion": 3,
  "id": "com.yourname.hello-widget",
  "version": "0.1.0",
  "kind": "widget",
  "title": "Hello",
  "description": "The time, on a glass card.",
  "author": { "name": "Your Name" },
  "homepage": "https://github.com/yourname/hello-widget",
  "entry": { "path": "index.html", "runtime": "web" },
  "bridgeVersion": 2,
  "widget": { "container": "glass", "cornerRadius": 22, "size": [280, 120] }
}
```

- `id` is yours for good: reverse-domain style, 1-128 of `A-Z a-z 0-9 . - _`. Adding an extension
  with the same `id` replaces the old one.
- `version` is a semantic version (`0.1.0`). Raise it whenever you share a change.
- `kind` is `widget`, `wallpaper` or `source`.
- `homepage` is optional: where people find your extension, its source and its updates (an
  absolute http(s) address).

## 3. Write the page

`index.html`. Styles and scripts go in their own files: inline `<style>`, inline `<script>`,
`style="…"` and `onclick=` are refused when the extension is added.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Hello</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div id="time"></div>
<script src="main.js"></script>
</body>
</html>
```

`style.css`. Keep the background transparent: iWalpapper draws the glass behind your page.

```css
html, body { margin: 0; height: 100%; background: transparent; color: white; font: 300 40px -apple-system, sans-serif; }
body { display: grid; place-content: center; }
```

`main.js`. `window.iwalpapper` is the bridge to the app ([reference](bridge.md)); here it ticks
once a minute.

```js
function render(now = new Date()) {
  time.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
render();
window.iwalpapper?.time?.on("minute", render);
```

Write `window.iwalpapper?.` with the `?.` so the page also opens in a browser, where there is no
bridge. That's the quickest way to work on the look.

## 4. Add it to iWalpapper

1. Open the Library, pick a wallpaper and open its **Widgets** panel.
2. Click **Add widget…** and choose the `HelloWidget` folder (or a `.zip` of it).
3. The sheet lists what the widget can do ([permissions](permissions.md)). Click **Add Widget**.
4. Switch it on under **From extensions**, then **Place on wallpaper** to move it. It shows on the
   desktop over this wallpaper only; switch it on for others the same way.

Wallpapers and sources are added with **Add Extension** in Discover instead.

## 5. Change it

iWalpapper copies the folder when you add it, so editing your files changes nothing on screen.
**After every change, add the folder again** (same `id`): the copy is replaced and the widget
reloads where it is placed.

## Next

- Give it settings people can change: [Widgets › Settings](widgets.md#settings).
- Make a wallpaper instead: [Wallpapers](wallpapers.md).
- Share it: [Packaging](packaging.md).
