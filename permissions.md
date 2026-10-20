# Permissions

Widgets and code wallpapers run in iWalpapper's web sandbox: they can't read files, start programs
or reach the network. What more a page may do is declared in the manifest, listed in plain words
when the extension is added, and can be revoked later.

## Declaring

```json
"permissions": ["network", "location"],
"network": { "hosts": ["api.open-meteo.com"] }
```

`permissions` is a list of different names from the table below. `network` (the object) is present
exactly when the list has `network`: 1-8 lowercase domains the page may `fetch` over https
(subdomains included), and nothing else. Widgets may have any of them. A live wallpaper
(`"playback": "live"`, 0.7.2) may have `nowPlaying` and `audioLevels`; a recorded one none, except
`location` for a time generator's `"sunrise"` and `"sunset"`
([Wallpapers › Sunrise and sunset](wallpapers.md#sunrise-and-sunset)). Anything else is refused
when the extension is added.

| Name | Gives | The person sees | Ready in |
|---|---|---|---|
| (none) | `settings`, `time`, `display`, `palette`, `storage` | nothing to approve | 0.7.0 |
| `network` | `fetch` to the listed hosts, https only | "Can reach api.open-meteo.com" | 0.7.1 |
| `systemStats` | battery, CPU, memory, network speed | "Can see battery, CPU, memory and network speed" | 0.7.1 |
| `calendar` | upcoming events, read only | "Can read your upcoming events", then the macOS prompt | 0.7.1 |
| `location` | coarse location | "Can use your approximate location", then the macOS prompt | 0.7.1 |
| `nowPlaying` | song, artwork and its colours, progress, play/pause/skip/seek, opening the app | "Can see and control what's playing" | 0.7.2 |
| `audioLevels` | how loud the music is, in 24 bands, never the sound | "Can see how loud the music is", then the macOS prompt | 0.7.2 |

### Network

`fetch` (and `XMLHttpRequest`, `WebSocket`, `EventSource`) reaches `https://<host>/…` and
`https://<sub>.<host>/…` for the listed hosts. Everything else, plain `http` included, is blocked
twice: by the page's security policy (`connect-src`) and by iWalpapper's own block list for that
widget's frame. Your page's origin is `iwalpapper-widget://…`, so the server has to allow
cross-origin requests (`Access-Control-Allow-Origin: *`, as most public APIs send). A failed fetch
rejects like any other: show the last value you kept in [`storage`](bridge.md#storage-widgets).

### System stats

`iwalpapper.system` gives battery, CPU, memory and network speed, sampled every 5 seconds while the
widget runs ([Bridge › System](bridge.md#system-widgets-systemstats)).

### Location

`iwalpapper.location` gives `{ latitude, longitude }` to 2 decimals, or `null` until the person
allows it in the macOS prompt ([Bridge › Location](bridge.md#location-widgets-location)).

### Calendar

`iwalpapper.calendar` gives the next week's events (title, times, all day, colour), or `null`
until the person allows it in the macOS prompt ([Bridge › Calendar](bridge.md#calendar-widgets-calendar)).

Until a permission's release, a folder that asks for it is refused when it is added or checked
(Validate and the live preview say which release brings it), so no install sheet promises what the
sandbox still blocks.

The install sheet always ends with "Can't read your files or other apps". Ask only for
what you use: every line is one more reason for someone to click Cancel.

## Updates and revoking

- An update that adds a permission asks again; one that keeps or drops them doesn't.
- People switch each permission off and on in the widget's row of the Widgets panel, on a live
  wallpaper's Library page, and in Settings › Privacy (What each extension may do). Switching
  one off keeps the extension installed; its calls to that namespace fail with `permission` (and
  with `network` off, every fetch is refused), so handle that and show something useful (the last stored value, a hint) instead of
  an empty card.
- There's no code review for widgets and wallpapers: the sandbox, not a review, keeps them safe.

## Sources are different

Catalog sources run unsandboxed, with the person's own permissions. They don't use this list;
they're reviewed and approved before they run, and again after any change. See
[Sources › Trust](sources.md#trust). Site sources and preset packs run nothing.
