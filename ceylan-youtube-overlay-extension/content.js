(() => {
  const OVERLAY_COUNT = 13;
  const OVERLAY_CLASS = "ceylan-thumbnail-overlay";
  const HOST_CLASS = "ceylan-thumbnail-host";
  const APPLIED_ATTR = "data-ceylan-overlay-applied";
  const THUMBNAIL_SELECTOR = [
    "ytd-thumbnail",
    "ytd-playlist-thumbnail",
    "yt-thumbnail-view-model",
    ".yt-thumbnail-view-model",
    ".yt-lockup-view-model-wiz__content-image",
    "a#thumbnail"
  ].join(",");

  const overlayUrls = Array.from({ length: OVERLAY_COUNT }, (_, index) => {
    const fileName = `${String(index + 1).padStart(3, "0")}.png`;
    return chrome.runtime.getURL(`assets/overlays/${fileName}`);
  });

  const thumbnailSelectors = [
    "ytd-thumbnail",
    "ytd-playlist-thumbnail",
    "yt-thumbnail-view-model",
    ".yt-thumbnail-view-model",
    ".yt-lockup-view-model-wiz__content-image",
    "ytd-thumbnail a#thumbnail",
    "ytd-playlist-thumbnail a#thumbnail",
    "ytd-rich-grid-media a#thumbnail",
    "ytd-compact-video-renderer a#thumbnail",
    "ytd-video-renderer a#thumbnail",
    "ytd-grid-video-renderer a#thumbnail",
    "a#thumbnail[href*='/watch']",
    "a#thumbnail[href*='/shorts']",
    "yt-thumbnail-view-model a",
    "a.shortsLockupViewModelHostEndpoint"
  ];

  const ignoredAncestors = [
    "#movie_player",
    "#player",
    "ytd-player",
    "ytd-miniplayer",
    "tp-yt-paper-dialog",
    "ytd-popup-container"
  ].join(",");

  let scanTimer = 0;
  let bootScanCount = 0;
  let scrollScanTimer = 0;

  function randomOverlayUrl() {
    return overlayUrls[Math.floor(Math.random() * overlayUrls.length)];
  }

  function hasUsefulSize(element) {
    const rect = element.getBoundingClientRect();
    return rect.width >= 80 && rect.height >= 45;
  }

  function resolveHost(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const host = element.closest(THUMBNAIL_SELECTOR);

    return host instanceof HTMLElement ? host : element;
  }

  function isThumbnailTarget(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    if (element.closest(ignoredAncestors)) {
      return false;
    }

    if (!hasUsefulSize(element)) {
      return false;
    }

    return true;
  }

  function applyOverlay(candidate) {
    const host = resolveHost(candidate);

    if (!host || !isThumbnailTarget(host)) {
      return false;
    }

    if (host.querySelector(`.${OVERLAY_CLASS}`)) {
      host.setAttribute(APPLIED_ATTR, "true");
      host.classList.add(HOST_CLASS);
      return false;
    }

    host.setAttribute(APPLIED_ATTR, "true");
    host.classList.add(HOST_CLASS);

    const overlay = document.createElement("img");
    overlay.className = OVERLAY_CLASS;
    overlay.src = randomOverlayUrl();
    overlay.alt = "";
    overlay.decoding = "async";
    overlay.draggable = false;
    overlay.setAttribute("aria-hidden", "true");

    host.appendChild(overlay);
    return true;
  }

  function scanThumbnails(root = document) {
    const scope = root instanceof Document ? root : root.ownerDocument || document;
    const candidates = [];
    const hosts = new Set();

    if (root instanceof Element && root.matches(thumbnailSelectors.join(","))) {
      candidates.push(root);
    }

    const queryRoot = root instanceof Element || root instanceof Document ? root : scope;
    candidates.push(...queryRoot.querySelectorAll(thumbnailSelectors.join(",")));

    let applied = 0;

    for (const candidate of candidates) {
      const host = resolveHost(candidate);

      if (host) {
        hosts.add(host);
      }
    }

    for (const host of hosts) {
      if (applyOverlay(host)) {
        applied += 1;
      }
    }

    if (applied > 0) {
      console.info(`[Ceylan Overlay] applied ${applied} thumbnail overlays`);
    }
  }

  function scheduleScan(root = document) {
    if (scanTimer) {
      clearTimeout(scanTimer);
    }

    scanTimer = setTimeout(() => {
      scanTimer = 0;
      scanThumbnails(root);
    }, 120);
  }

  function observeMutations() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scheduleScan();
            return;
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function observeScroll() {
    const queueScrollScan = () => {
      if (scrollScanTimer) {
        return;
      }

      scrollScanTimer = setTimeout(() => {
        scrollScanTimer = 0;
        scanThumbnails();
      }, 250);
    };

    window.addEventListener("scroll", queueScrollScan, { capture: true, passive: true });
    document.addEventListener("scroll", queueScrollScan, { capture: true, passive: true });
    window.addEventListener("wheel", queueScrollScan, { passive: true });
  }

  function boot() {
    scanThumbnails();
    observeMutations();
    observeScroll();

    window.addEventListener("yt-navigate-finish", () => scheduleScan(), true);
    window.addEventListener("yt-page-data-updated", () => scheduleScan(), true);
    window.addEventListener("popstate", () => scheduleScan(), true);

    const bootScanner = setInterval(() => {
      bootScanCount += 1;
      scanThumbnails();

      if (bootScanCount >= 10) {
        clearInterval(bootScanner);
      }
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
