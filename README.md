# Making iWalpapper extensions

An extension is a folder with an `extension.json` at its top. It adds a widget, a wallpaper or a
Discover source to iWalpapper. Widgets and wallpapers are web pages (HTML, CSS, JavaScript) that run
in iWalpapper's sandbox; a preset pack or a shader needs no page at all.

| Guide | Read it for |
|---|---|
| [Getting started](getting-started.md) | Your first extension, from an empty folder to the desktop, in ten minutes |
| [Widgets](widgets.md) | `kind: "widget"`: a card placed on a wallpaper, inside a container iWalpapper draws |
| [Wallpapers](wallpapers.md) | `kind: "wallpaper"`: code wallpapers, preset packs, shaders and time-of-day generators |
| [Sources](sources.md) | `kind: "source"`: a Discover source that browses a catalog or a site |
| [Bridge reference](bridge.md) | `window.iwalpapper`: settings, display, palette, time, storage |
| [Permissions](permissions.md) | What a page may reach, and how people are asked |
| [Packaging](packaging.md) | Checking, zipping, versioning and sharing an extension |

Working examples, ready to copy:

| Example | Kind |
|---|---|
| [`DateWidget`](examples/DateWidget) | widget with a setting |
| [`ClockWidget`](examples/ClockWidget) | widget with no container, the lock-screen faces, glass text and a Size slider |
| [`MusicWidget`](examples/MusicWidget) | interactive widget with Now Playing, audio levels, Look and Layout choices and a height it asks for |
| [`GradientWallpaper`](examples/GradientWallpaper) | code wallpaper with colour, choice and slider settings |
| [`MusicWallpaper`](examples/MusicWallpaper) | live code wallpaper with Now Playing, a WebGL gradient and grouped settings, Follow included |
| [`GradientPack`](examples/GradientPack) | preset pack of two gradients |
| [`ShaderWallpaper`](examples/ShaderWallpaper) | GLSL shader |
| [`TimeWallpaper`](examples/TimeWallpaper) | time generator: eight times of day |

`effect` and `bundle` kinds are planned (0.7.5, 0.7.7) and refused for now. Widgets take clicks
when they ask (`"interactive": true`) and can use `network`, `systemStats`, `location` and
`calendar`; Now Playing arrives in 0.7.2.
