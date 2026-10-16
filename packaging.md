# Packaging

An extension is shared as a `.zip` of its folder. A folder works too, while you're working on it.

## Manifest fields every kind has

| Field | Rules |
|---|---|
| `schemaVersion` | `3` (`2` still works, always as a source) |
| `id` | 1-128 of `A-Z a-z 0-9 . - _`, letter or digit at both ends. Reverse-domain style (`com.yourname.weather`). Never change it: the same `id` replaces the installed extension |
| `version` | a semantic version (`1.2.0`), at most 64 characters |
| `kind` | `widget`, `wallpaper` or `source` |
| `title` | 1-120 characters |
| `description` | 1-1024 characters |
| `author` | `{ "name": "…" }`, 1-120 characters. Shown as stated by you, not verified |
| `homepage` | optional, an absolute http(s) address |
| `icon` | optional, a relative `.png`/`.jpg`/`.jpeg` of at most 10 MiB |

`extension.json` is strict JSON: no comments, no trailing commas, and **an unknown field is
refused**, including a field that belongs to another kind (`widget` in a wallpaper, say). The
error names the field. The manifest is at most 64 KiB.

## Folder rules

- `extension.json` at the top of the folder.
- Relative paths only, inside the folder. No symbolic links, hard links or special files.
- At most 4096 files, 16 folders deep, 2 GiB per file and 4 GiB in all.
- Pages (widgets, code wallpapers): HTML in UTF-8, CSS and JavaScript in their own files, no inline
  `<style>`, `<script>`, `style="…"` or `on…=`. Leave out data files the page would `fetch`: only
  HTML, CSS, JavaScript, images and fonts are served to the page.
- Leave out build tools, `node_modules`, `.git` and test files: everything in the folder is copied.

## Check it

Adding the folder to iWalpapper is the check: a manifest or page that breaks a rule is refused
with a message naming what's wrong. For a widget use its wallpaper's **Widgets** panel; for
anything else, **Add Extension** in Discover. iWalpapper works on its own copy, so add the folder
again after each change.

Then try it as people will:

- **Widget:** on a light and a dark wallpaper; with the Mac in light and dark mode.
- **Code wallpaper:** each setting at its ends; the recorded video loops without a jump.
- **Time generator:** the card in Discover shows four times; check each loop in the Library.
- **Preset pack / shader:** each card's picture and preview.

## Zip it

The zip must hold the folder itself, so it unpacks to one folder with `extension.json` inside.
With the app's repository:

```sh
bash scripts/package-extension.sh path/to/HelloWidget   # → build/extensions/HelloWidget.zip
```

Without it, on a Mac:

```sh
ditto -c -k --norsrc --noextattr --keepParent HelloWidget HelloWidget.zip
```

Finder's **Compress** works too, but adds `.DS_Store` files; they're harmless.

## Versions and updates

- Raise `version` with every change you share.
- Keep `id` the same: adding the new zip replaces the old version in place, keeping where the
  widget is placed, its settings and its storage.
- An update that adds a permission asks the person again ([Permissions](permissions.md)).
- A catalog source goes back to review after any change ([Sources › Trust](sources.md#trust)).

## Sharing

Put the zip anywhere people can download it: a GitHub release, your website. People add it with
**Add Extension** (or **Add widget…**) and a `.zip` or folder. Say in your README what the extension
does, which permissions it asks for and why, and the licence of anything you didn't make.
