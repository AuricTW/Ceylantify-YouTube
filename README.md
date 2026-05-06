<div align="center">

<h1>Ceylantify-YouTube</h1>

<p><strong>Your YouTube doesn't need more plugins. It needs Ceylan.</strong></p>

<p>
  Are your YouTube thumbnails too normal?<br>
  Ceylantify YouTube adds random transparent Ceylan overlays to thumbnails across YouTube.
</p>

<p>
  <a href="https://chromewebstore.google.com/detail/ceylantify-youtube/lhmecnaopjkaogbmgmcmmgecmfmdllga">
    <img alt="Install on Chrome" src="https://img.shields.io/badge/Chrome-Install-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white">
  </a>
</p>

<p>
  <a href="README.md">English</a> |
  <a href="README.zh-TW.md">繁體中文</a>
</p>

</div>

---

Ceylantify YouTube is a Chrome Manifest V3 extension that adds random transparent Ceylan PNG overlays to YouTube thumbnails. It is available on the Chrome Web Store and can also be loaded locally for development.

## Features

- Chrome Manifest V3 extension.
- Content script scans YouTube thumbnail containers.
- Adds one random transparent Ceylan PNG overlay to each thumbnail.
- Uses `MutationObserver` to handle YouTube dynamic loading.
- Targets common YouTube surfaces such as home feed, search results, video sidebars, and infinite scrolling.
- Keeps thumbnail clicks working by setting overlays to `pointer-events: none`.

## Install

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/ceylantify-youtube/lhmecnaopjkaogbmgmcmmgecmfmdllga).

## Project Structure

```text
.
|-- ceylan-youtube-overlay-extension/
|   |-- manifest.json
|   |-- content.js
|   |-- content.css
|   `-- assets/
|       `-- overlays/
|           |-- 001.png
|           |-- 002.png
|           `-- ...
|-- data/
|   |-- Ceylan_AI_Transparent/
|   |-- Ceylan_Cleaning/
|   `-- Ceylan_Cover/
`-- download_ceylan_thumbnails.py
```

## Local Development Installation

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this folder:

```text
ceylan-youtube-overlay-extension
```

5. Open or refresh YouTube.

If the extension was already loaded, click the refresh icon on the extension card, then reload YouTube with `Ctrl + F5`.

## Development

The extension entry point is:

```text
ceylan-youtube-overlay-extension/content.js
```

Static styles are in:

```text
ceylan-youtube-overlay-extension/content.css
```

Overlay assets are copied into:

```text
ceylan-youtube-overlay-extension/assets/overlays
```

Basic syntax check:

```bash
node --check ceylan-youtube-overlay-extension/content.js
```

## Debugging

Open YouTube DevTools Console and look for:

```text
[Ceylan Overlay] applied ... thumbnail overlays
```

If this appears but the overlay is invisible, the issue is likely CSS stacking or thumbnail layout.

If it does not appear, the current YouTube DOM structure may need an additional selector in `content.js`.

## Inspiration

This project was inspired by [MagicJinn/MrBeastify-Youtube](https://github.com/MagicJinn/MrBeastify-Youtube).

## Privacy

This extension does not collect, store, or transmit user data. It only runs locally on YouTube pages and loads bundled PNG assets from the extension package.

## Roadmap

- Add an enable/disable popup toggle.
- Add overlay density or probability settings.
- Add asset selection modes.
- Improve selectors for more YouTube layouts.

## Status

Published on the Chrome Web Store. Local development remains available through unpacked extension loading.
