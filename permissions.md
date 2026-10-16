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
exactly when the list has `network`: 1-8 lowercase domains the page may `fetch` over https, and
nothing else.

| Name | Gives | The person sees | Ready in |
|---|---|---|---|
| (none) | `settings`, `time`, `display`, `palette`, `storage` | nothing to approve | 0.7.0 |
| `network` | `fetch` to the listed hosts, https only | "Can reach api.open-meteo.com" | 0.7.1 |
| `systemStats` | battery, CPU, memory, network speed | "Can see battery, CPU, memory and network speed" | 0.7.1 |
| `calendar` | upcoming events, read only | "Can read your upcoming events", then the macOS prompt | 0.7.1 |
| `location` | coarse location | "Can use your approximate location", then the macOS prompt | 0.7.1 |
| `nowPlaying` | song, artwork, progress, play/pause/skip | "Can see and control what's playing" | 0.7.2 |

The install sheet always ends with "Can't read your files or other apps". Ask only for
what you use: every line is one more reason for someone to click Cancel.

## Updates and revoking

- An update that adds a permission asks again; one that keeps or drops them doesn't.
- Revoking a permission keeps the extension installed. Its calls to that namespace fail with
  `permission`, so handle that and show something useful (the last stored value, a hint) instead of
  an empty card.
- There's no code review for widgets and wallpapers: the sandbox, not a review, keeps them safe.

## Sources are different

Catalog sources run unsandboxed, with the person's own permissions. They don't use this list;
they're reviewed and approved before they run, and again after any change. See
[Sources › Trust](sources.md#trust). Site sources and preset packs run nothing.
