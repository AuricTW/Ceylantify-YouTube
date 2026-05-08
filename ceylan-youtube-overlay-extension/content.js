(() => {
  const OVERLAY_COUNT = 20;
  const OVERLAY_CLASS = "ceylan-thumbnail-overlay";
  const HOST_CLASS = "ceylan-thumbnail-host";
  const PREVIEWING_CLASS = "ceylan-thumbnail-previewing";
  const APPLIED_ATTR = "data-ceylan-overlay-applied";
  const POSITION_ATTR = "data-ceylan-position-applied";
  const HOVER_LISTENERS_ATTR = "data-ceylan-hover-listeners";
  const THUMBNAIL_CONTAINER_SELECTOR = [
    "ytd-thumbnail",
    "ytd-playlist-thumbnail",
    "yt-thumbnail-view-model",
    ".yt-thumbnail-view-model",
    ".yt-lockup-view-model-wiz__content-image"
  ].join(",");

  const SHORTS_THUMBNAIL_SELECTOR = [
    "a#thumbnail[href*='/shorts']",
    "a[href*='/shorts/']",
    "a.shortsLockupViewModelHostEndpoint"
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
  let pointerX = null;
  let pointerY = null;
  let activePreviewHost = null;

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

  function rememberPointerPosition(event) {
    pointerX = event.clientX;
    pointerY = event.clientY;
  }

  function isPointerInside(element) {
    if (pointerX === null || pointerY === null) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return pointerX >= rect.left && pointerX <= rect.right && pointerY >= rect.top && pointerY <= rect.bottom;
  }

  function shouldHideOverlay(host) {
    return host.matches(":hover") || host.matches(":focus-within") || isPointerInside(host);
  }

  function setPreviewHost(host) {
    if (activePreviewHost && activePreviewHost !== host) {
      activePreviewHost.classList.remove(PREVIEWING_CLASS);
    }

    activePreviewHost = host;

    if (activePreviewHost) {
      activePreviewHost.classList.add(PREVIEWING_CLASS);
    }
  }

  function updatePointerPreviewHost(event) {
    rememberPointerPosition(event);

    const pointedElement = document.elementFromPoint(pointerX, pointerY);
    let host = pointedElement instanceof Element ? pointedElement.closest(`.${HOST_CLASS}`) : null;

    if (!(host instanceof HTMLElement) && activePreviewHost && isPointerInside(activePreviewHost)) {
      host = activePreviewHost;
    }

    setPreviewHost(host instanceof HTMLElement ? host : null);
  }

  function clearPointerPreviewHost() {
    pointerX = null;
    pointerY = null;
    setPreviewHost(null);
  }

  function attachHoverListeners(host) {
    if (host.hasAttribute(HOVER_LISTENERS_ATTR)) {
      return;
    }

    host.setAttribute(HOVER_LISTENERS_ATTR, "true");

    host.addEventListener("pointerenter", () => setPreviewHost(host), { passive: true });
    host.addEventListener("mouseenter", () => setPreviewHost(host), { passive: true });
    host.addEventListener("focusin", () => setPreviewHost(host));

    const maybeClearPreviewHost = (event) => {
      if ("clientX" in event && "clientY" in event) {
        rememberPointerPosition(event);
      }

      requestAnimationFrame(() => {
        if (activePreviewHost === host && !shouldHideOverlay(host)) {
          setPreviewHost(null);
        }
      });
    };

    host.addEventListener("pointerleave", maybeClearPreviewHost, { passive: true });
    host.addEventListener("mouseleave", maybeClearPreviewHost, { passive: true });
    host.addEventListener("focusout", maybeClearPreviewHost);
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

    if (isShortsThumbnail(element)) {
      return false;
    }

    return true;
  }

  function isShortsThumbnail(element) {
    return Boolean(
      element.matches(SHORTS_THUMBNAIL_SELECTOR) ||
      element.closest(SHORTS_THUMBNAIL_SELECTOR) ||
      element.querySelector(SHORTS_THUMBNAIL_SELECTOR)
    );
  }

  function prepareHost(host) {
    host.classList.add(HOST_CLASS);
    attachHoverListeners(host);

    if (getComputedStyle(host).position === "static") {
      host.style.setProperty("position", "relative", "important");
      host.setAttribute(POSITION_ATTR, "true");
    }

    if (shouldHideOverlay(host)) {
      setPreviewHost(host);
    }
  }

  function removeOverlayFromHost(host) {
    host.querySelector(`.${OVERLAY_CLASS}`)?.remove();
    host.classList.remove(HOST_CLASS);
    host.classList.remove(PREVIEWING_CLASS);
    host.removeAttribute(APPLIED_ATTR);

    if (host.hasAttribute(POSITION_ATTR)) {
      host.style.removeProperty("position");
      host.removeAttribute(POSITION_ATTR);
    }
  }

  function applyOverlay(candidate) {
    const host = resolveHost(candidate);

    if (!host) {
      return false;
    }

    if (!isThumbnailTarget(host)) {
      removeOverlayFromHost(host);
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
    const shouldStartHidden = shouldHideOverlay(host);

    if (shouldStartHidden) {
      host.classList.add(PREVIEWING_CLASS);
      overlay.style.setProperty("opacity", "0", "important");
    }

    overlay.className = OVERLAY_CLASS;
    overlay.src = randomOverlayUrl();
    overlay.alt = "";
    overlay.decoding = "async";
    overlay.draggable = false;
    overlay.setAttribute("aria-hidden", "true");

    host.appendChild(overlay);

    if (shouldStartHidden) {
      requestAnimationFrame(() => overlay.style.removeProperty("opacity"));
    }

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
        removeOverlayFromHost(host);
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

  function observePointer() {
    document.addEventListener("pointermove", updatePointerPreviewHost, { capture: true, passive: true });
    document.addEventListener("mousemove", updatePointerPreviewHost, { capture: true, passive: true });
    document.addEventListener("mouseleave", clearPointerPreviewHost, { capture: true, passive: true });
    window.addEventListener("blur", clearPointerPreviewHost, true);
  }

  function boot() {
    clearExistingOverlays();
    observePointer();
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
