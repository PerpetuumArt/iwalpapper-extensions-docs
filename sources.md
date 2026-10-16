# Sources

A source (`"kind": "source"`) adds a place to Discover where people browse wallpapers and add them
as videos. There are two forms:

| Form | You write | Runs on the Mac |
|---|---|---|
| [Catalog source](#catalog-sources) | a program (Python 3 or an executable) that lists items and fetches one | yes, **unsandboxed**, after the person approves it |
| [Site source](#site-sources) | the address of a website, plus what to block and hide | nothing |

A static JSON index over https (no code at all) arrives in 0.7.3.

Sources are added with **Add Extension** in Discover. `schemaVersion` may be `2` or `3`; a schema 2
manifest is always a source, so `kind` is only written with `3`.

## Catalog sources

```json
{
  "schemaVersion": 3,
  "id": "app.iwalpapper.demo",
  "version": "0.1.0",
  "kind": "source",
  "title": "Gradient Lab",
  "description": "A demo source: animated gradients rendered on this Mac with ffmpeg.",
  "author": { "name": "iWalpapper" },
  "entry": { "path": "main.py", "runtime": "python3" }
}
```

`entry.runtime` is `python3` (Homebrew's Python if present, else `/usr/bin/python3`) or
`executable` (the file itself, which must be executable). `entry.path` is at most 1 MiB.

### Trust

A catalog source runs with the person's own permissions: it can read their files and use the
network. So before it runs, iWalpapper shows a review screen saying so, and the person approves it.
The approval is bound to the exact files: before **every** run they are hashed again, and any
change (a new version, an edited file, a different Python) sends the source back to review.

### How it runs

One request per process. iWalpapper starts your program with no arguments, writes one JSON line on
stdin and closes it. You answer with JSON lines on stdout, each with `"protocolVersion": 2` and a
`"type"`. stderr is for diagnostics; its last line is shown if you exit with an error.

| Environment | Value |
|---|---|
| `PATH` | `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin` |
| `HOME` | the extension's own folder, kept across runs (logins, caches), removed with the extension |
| `XDG_CACHE_HOME` | `$HOME/cache` |
| `TMPDIR` | this run's temporary folder |
| `IWALPAPPER_OUTPUT` | this run's output folder; the working directory |

**Requests:**

```json
{"protocolVersion":2,"type":"catalog","category":"popular","query":"","page":1}
{"protocolVersion":2,"type":"fetch","itemID":"ember"}
```

`category` is missing for "All". `page` starts at 1. A catalog request may run 120 s, a fetch
1800 s; a new catalog request cancels the one before.

**Answers:**

| `type` | When | Fields |
|---|---|---|
| `category` | catalog | `id` (1-64 of `A-Z a-z 0-9 . _ : -`), `title` (1-120). At most 50; send them on every page |
| `item` | catalog | `id` (1-256), `title` (1-200), optional `summary` (≤300), `category`, `preview` (an https image) |
| `page` | catalog | optional `next`: there is another page |
| `progress` | any | `fraction` 0-1, optional `message` |
| `log` | any | `level`, `message` |
| `result` | fetch, once | `file` (relative to `IWALPAPPER_OUTPUT`), `title`, optional `creator`, `sourcePageURL` (https) |
| `error` | any | `message` (1-500), shown to the person; ends the run |

```python
import json, os, sys

def send(type, **fields):
    print(json.dumps({"protocolVersion": 2, "type": type, **fields}), flush=True)

request = json.loads(sys.stdin.readline())
if request["type"] == "catalog":
    send("category", id="warm", title="Warm")
    send("item", id="ember", title="Ember", category="warm")
else:
    path = os.path.join(os.environ["IWALPAPPER_OUTPUT"], "ember.mp4")
    # ... write the video to path ...
    send("result", file="ember.mp4", title="Ember")
```

Rules: one JSON object per line, at most 16 KiB a line, 4096 lines and 4 MiB per run. Unknown types
and unknown fields are refused. The video goes through the Library's own importer; the run folder is
deleted afterwards. A fetch that exits without a `result` added nothing.

## Site sources

A site source shows a website inside Discover; its own download links put videos in the Library.
Nothing runs on the Mac, so there is no review.

```json
{
  "schemaVersion": 3,
  "id": "com.example.walls",
  "version": "0.1.0",
  "kind": "source",
  "title": "Example Walls",
  "description": "Browse example.com's wallpapers inside iWalpapper.",
  "author": { "name": "Example" },
  "homepage": "https://example.com/",
  "site": {
    "start": "https://example.com/",
    "hosts": ["example.com"],
    "block": ["doubleclick.net"],
    "hide": [".ad-banner"]
  }
}
```

| Field | Rules |
|---|---|
| `site.hosts` | 1-8 lowercase domains; each covers its subdomains |
| `site.start` | an https address on one of `hosts` |
| `site.block` | optional, up to 64 domains whose requests are blocked |
| `site.hide` | optional, up to 32 CSS selectors hidden on every page (no `{`, `}` or `\`) |

Links off `hosts` open in the default browser. A download (an attachment, a `video/*` page, a link
marked `download`) of up to 2 GiB goes into the Library, with the page it came from as its
provenance. Each site source keeps its own cookies, removed with it.

## Services that need a login

You may write a source for a service that needs an account. iWalpapper provides generic pieces
(secure login prompts in 0.7.4, video import); it doesn't name, promote or link to such services,
and a source that uses one is its author's responsibility under that service's terms. Only add
wallpapers people are allowed to download.
