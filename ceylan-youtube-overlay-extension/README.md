# Ceylan YouTube Overlay

Local Chrome Manifest V3 extension that adds a random transparent Ceylan PNG overlay to YouTube thumbnails.

## Load Locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this folder:
   `D:\SideProject\Your YouTube doesn't need plugins\ceylan-youtube-overlay-extension`
5. Open or refresh YouTube.

The content script watches YouTube's dynamic page updates with `MutationObserver`, so homepage feeds, search results, infinite scroll, and video sidebars should receive overlays as they load.
