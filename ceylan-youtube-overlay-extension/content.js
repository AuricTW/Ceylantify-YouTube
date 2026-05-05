(() => {
  const OVERLAY_COUNT = 13;
  const OVERLAY_CLASS = "ceylan-thumbnail-overlay";
  const HOST_CLASS = "ceylan-thumbnail-host";
  const APPLIED_ATTR = "data-ceylan-overlay-applied";
  const POSITION_ATTR = "data-ceylan-position-applied";
  const THUMBNAIL_CONTAINER_SELECTOR = [
    "ytd-thumbnail",
    "ytd-playlist-thumbnail",
    "yt-thumbnail-view-model",
    ".yt-thumbnail-view-model",
    ".yt-lockup-view-model-wiz__content-image"
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

  function hasThumbnailShape(element) {
    const rect = element.getBoundingClientRect();

    if (rect.height === 0) {
      return false;
    }

    const ratio = rect.width / rect.height;
    return ratio >= 0.5 && ratio <= 2.6;
  }

  function resolveHost(element) {
    if (!(element instanceof HTMLElement)) {
      return null;
    }

    if (element.matches("a#thumbnail") && hasUsefulSize(element) && hasThumbnailShape(element)) {
      return element;
    }

    const container = element.closest(THUMBNAIL_CONTAINER_SELECTOR);

    if (container instanceof HTMLElement) {
      const thumbnailLink = container.querySelector("a#thumbnail");

      if (thumbnailLink instanceof HTMLElement && hasUsefulSize(thumbnailLink) && hasThumbnailShape(thumbnailLink)) {
        return thumbnailLink;
      }

      if (hasUsefulSize(container) && hasThumbnailShape(container)) {
        return container;
      }
    }

    if (hasUsefulSize(element) && hasThumbnailShape(element)) {
      return element;
    }

    return null;
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

    if (!hasThumbnailShape(element)) {
      return false;
    }

    return true;
  }

  function prepareHost(host) {
    host.classList.add(HOST_CLASS);

    if (getComputedStyle(host).position === "static") {
      host.style.setProperty("position", "relative", "important");
      host.setAttribute(POSITION_ATTR, "true");
    }
  }

  function applyOverlay(candidate) {
    const host = resolveHost(candidate);

    if (!host || !isThumbnailTarget(host)) {
      return false;
    }

    if (host.querySelector(`.${OVERLAY_CLASS}`)) {
      host.setAttribute(APPLIED_ATTR, "true");
      prepareHost(host);
      return false;
    }

    host.setAttribute(APPLIED_ATTR, "true");
    prepareHost(host);

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

  function clearExistingOverlays() {
    for (const overlay of document.querySelectorAll(`.${OVERLAY_CLASS}`)) {
      const host = overlay.parentElement;
      overlay.remove();

      if (host instanceof HTMLElement) {
        host.classList.remove(HOST_CLASS);
        host.removeAttribute(APPLIED_ATTR);

        if (host.hasAttribute(POSITION_ATTR)) {
          host.style.removeProperty("position");
          host.removeAttribute(POSITION_ATTR);
        }
      }
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
    clearExistingOverlays();
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
