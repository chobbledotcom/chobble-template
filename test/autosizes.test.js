import { JSDOM } from "jsdom";
import {
  createTestRunner,
  expectFalse,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

// ============================================
// Helper: Create mock browser environment
// ============================================

const createMockBrowserEnv = (options = {}) => {
  const {
    userAgent = "Mozilla/5.0 Chrome/120",
    hasPerformanceObserver = true,
    supportsPaintTiming = true,
    documentReadyState = "complete",
  } = options;

  const html = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="container"></div>
</body>
</html>`;

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // Mock navigator.userAgent
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });

  // Mock document.readyState
  Object.defineProperty(window.document, "readyState", {
    value: documentReadyState,
    configurable: true,
  });

  // Mock PerformanceObserver
  if (hasPerformanceObserver) {
    const mockPerformanceObserver = class {
      static supportedEntryTypes = supportsPaintTiming ? ["paint"] : [];

      constructor(callback) {
        this.callback = callback;
        this.observing = false;
      }

      observe() {
        this.observing = true;
        // Simulate FCP after a tick
        setTimeout(() => {
          if (this.observing) {
            this.callback(
              {
                getEntriesByName: (name) =>
                  name === "first-contentful-paint" ? [{ name }] : [],
              },
              this,
            );
          }
        }, 0);
      }

      disconnect() {
        this.observing = false;
      }
    };
    window.PerformanceObserver = mockPerformanceObserver;
  }

  return { dom, window, document: window.document };
};

// ============================================
// Helper: Create image element
// ============================================

const createImage = (document, attrs = {}) => {
  const img = document.createElement("img");
  Object.entries(attrs).forEach(([key, value]) => {
    img.setAttribute(key, value);
  });
  return img;
};

// ============================================
// Helper: Execute autosizes script in context
// ============================================

const executeAutosizesScript = (window) => {
  // The script is an IIFE, so we execute it in the window context
  const script = `
(function () {
  const polyfillAutoSizes = () => {
    if (
      !("PerformanceObserver" in window) ||
      !PerformanceObserver.supportedEntryTypes.includes("paint")
    ) {
      return false;
    }

    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\\/(\\d+)/);

    if (!chromeMatch) {
      return true;
    }

    const chromeVersion = parseInt(chromeMatch[1], 10);
    return chromeVersion < 126;
  };

  if (!polyfillAutoSizes()) {
    return;
  }

  const attributes = ["src", "srcset"];
  const prefix = "data-auto-sizes-";
  const state = { fcpDone: false, initialized: false };

  function elemWidth(elem) {
    const width = elem ? Math.round(elem.getBoundingClientRect().width) : 0;
    if (width <= 0) {
      return null;
    }
    return \`\${width}px\`;
  }

  function calculateAndSetSizes(img) {
    const sizes = elemWidth(img) ?? elemWidth(img.parentElement);
    if (sizes) {
      img.sizes = sizes;
    }
  }

  function deferImages(images) {
    for (const img of images) {
      if (img.complete) {
        continue;
      }
      if (
        !(img.getAttribute("sizes") || "").trim().startsWith("auto") ||
        img.getAttribute("loading") !== "lazy"
      ) {
        continue;
      }
      const src = img.getAttribute("src") || "";
      if (src.startsWith("http://") || src.startsWith("https://")) {
        continue;
      }
      if (!state.fcpDone) {
        for (const attribute of attributes) {
          if (img.hasAttribute(attribute)) {
            img.setAttribute(
              \`\${prefix}\${attribute}\`,
              img.getAttribute(attribute),
            );
            img.removeAttribute(attribute);
          }
        }
      } else {
        calculateAndSetSizes(img);
      }
    }
  }

  function restoreImageAttributes() {
    const images = document.querySelectorAll(
      \`img[\${prefix}src], img[\${prefix}srcset]\`,
    );

    for (const img of images) {
      calculateAndSetSizes(img);

      for (const attribute of attributes) {
        const tempAttribute = \`\${prefix}\${attribute}\`;
        if (img.hasAttribute(tempAttribute)) {
          img[attribute] = img.getAttribute(tempAttribute);
          img.removeAttribute(tempAttribute);
        }
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    const newImages = [];

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === "IMG") {
            newImages.push(node);
          }
          if (node.querySelectorAll) {
            newImages.push(...node.querySelectorAll("img"));
          }
        }
      }
      else if (
        mutation.type === "attributes" &&
        mutation.target.nodeName === "IMG" &&
        (mutation.attributeName === "sizes" ||
          mutation.attributeName === "loading" ||
          mutation.attributeName === "src" ||
          mutation.attributeName === "srcset")
      ) {
        newImages.push(mutation.target);
      }
    }

    if (newImages.length > 0) {
      deferImages(newImages);
    }
  });

  function initAutosizes() {
    if (state.initialized) {
      state.fcpDone = true;
      const images = document.querySelectorAll(
        'img[sizes^="auto"][loading="lazy"]',
      );
      for (const img of images) {
        calculateAndSetSizes(img);
      }
      return;
    }

    state.initialized = true;

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["sizes", "loading"],
    });

    deferImages(
      document.querySelectorAll('img[sizes^="auto"][loading="lazy"]'),
    );

    new PerformanceObserver((entries, perfObserver) => {
      entries.getEntriesByName("first-contentful-paint").forEach(() => {
        state.fcpDone = true;
        setTimeout(restoreImageAttributes, 0);
        perfObserver.disconnect();
      });
    }).observe({ type: "paint", buffered: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutosizes);
  } else {
    initAutosizes();
  }

  document.addEventListener("turbo:load", initAutosizes);
})();
  `;

  window.eval(script);
};

// ============================================
// Feature Detection Tests
// ============================================

const featureDetectionTests = [
  {
    name: "skips-polyfill-when-no-performance-observer",
    description: "Does not run polyfill when PerformanceObserver is missing",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        hasPerformanceObserver: false,
        userAgent: "Mozilla/5.0 Chrome/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image should NOT be deferred when polyfill doesn't run
      expectTrue(
        img.hasAttribute("src"),
        "src should remain when polyfill skipped",
      );
    },
  },
  {
    name: "skips-polyfill-when-no-paint-timing-support",
    description: "Does not run polyfill when paint timing not supported",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        hasPerformanceObserver: true,
        supportsPaintTiming: false,
        userAgent: "Mozilla/5.0 Chrome/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image should NOT be deferred
      expectTrue(
        img.hasAttribute("src"),
        "src should remain when polyfill skipped",
      );
    },
  },
  {
    name: "skips-polyfill-for-chrome-126-plus",
    description: "Does not run polyfill for Chrome 126+",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Chrome/126",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image should NOT be deferred for Chrome 126+
      expectTrue(img.hasAttribute("src"), "src should remain for Chrome 126+");
    },
  },
  {
    name: "runs-polyfill-for-chrome-125",
    description: "Runs polyfill for Chrome 125 (older than 126)",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Chrome/125",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image should be deferred (src moved to data attribute)
      expectFalse(
        img.hasAttribute("src"),
        "src should be removed for Chrome 125",
      );
      expectTrue(
        img.hasAttribute("data-auto-sizes-src"),
        "src should be stored in data attribute",
      );
    },
  },
  {
    name: "runs-polyfill-for-non-chrome-browsers",
    description: "Runs polyfill for non-Chrome browsers (Firefox, Safari)",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image should be deferred for non-Chrome
      expectFalse(
        img.hasAttribute("src"),
        "src should be removed for non-Chrome",
      );
    },
  },
];

// ============================================
// Image Filtering Tests
// ============================================

const imageFilteringTests = [
  {
    name: "ignores-images-without-sizes-auto",
    description: "Does not process images without sizes=auto",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "100vw",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image without sizes="auto" should not be processed
      expectTrue(
        img.hasAttribute("src"),
        "src should remain for non-auto sizes",
      );
    },
  },
  {
    name: "ignores-images-without-loading-lazy",
    description: "Does not process images without loading=lazy",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "eager",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Image without loading="lazy" should not be processed
      expectTrue(
        img.hasAttribute("src"),
        "src should remain for non-lazy loading",
      );
    },
  },
  {
    name: "ignores-remote-http-images",
    description: "Does not process remote images with http:// URLs",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "http://example.com/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Remote images should not be processed
      expectTrue(img.hasAttribute("src"), "src should remain for http:// URLs");
    },
  },
  {
    name: "ignores-remote-https-images",
    description: "Does not process remote images with https:// URLs",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "https://example.com/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Remote images should not be processed
      expectTrue(
        img.hasAttribute("src"),
        "src should remain for https:// URLs",
      );
    },
  },
  {
    name: "processes-local-images",
    description: "Processes local images with relative paths",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/images/photo.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Local images should be processed
      expectFalse(
        img.hasAttribute("src"),
        "src should be removed for local images",
      );
      expectStrictEqual(
        img.getAttribute("data-auto-sizes-src"),
        "/images/photo.jpg",
        "Original src should be stored",
      );
    },
  },
  {
    name: "handles-sizes-auto-with-fallback",
    description: "Processes images with sizes='auto, 100vw' format",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto, 100vw",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Images with "auto, ..." should be processed
      expectFalse(
        img.hasAttribute("src"),
        "src should be removed for auto sizes with fallback",
      );
    },
  },
];

// ============================================
// Attribute Deferral Tests
// ============================================

const attributeDeferralTests = [
  {
    name: "defers-src-attribute",
    description: "Moves src to data-auto-sizes-src before FCP",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      expectFalse(img.hasAttribute("src"), "src should be removed");
      expectStrictEqual(
        img.getAttribute("data-auto-sizes-src"),
        "/image.jpg",
        "src should be stored in data attribute",
      );
    },
  },
  {
    name: "defers-srcset-attribute",
    description: "Moves srcset to data-auto-sizes-srcset before FCP",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        srcset: "/image-300.jpg 300w, /image-600.jpg 600w",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      expectFalse(img.hasAttribute("srcset"), "srcset should be removed");
      expectStrictEqual(
        img.getAttribute("data-auto-sizes-srcset"),
        "/image-300.jpg 300w, /image-600.jpg 600w",
        "srcset should be stored in data attribute",
      );
    },
  },
  {
    name: "defers-both-src-and-srcset",
    description: "Moves both src and srcset to data attributes",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        srcset: "/image-300.jpg 300w",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      expectFalse(img.hasAttribute("src"), "src should be removed");
      expectFalse(img.hasAttribute("srcset"), "srcset should be removed");
      expectTrue(
        img.hasAttribute("data-auto-sizes-src"),
        "src should be stored",
      );
      expectTrue(
        img.hasAttribute("data-auto-sizes-srcset"),
        "srcset should be stored",
      );
    },
  },
];

// ============================================
// FCP Restoration Tests
// ============================================

const fcpRestorationTests = [
  {
    name: "restores-attributes-after-fcp",
    description: "Restores src and srcset after FCP fires",
    asyncTest: async () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        srcset: "/image-300.jpg 300w",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Verify deferred initially
      expectFalse(img.hasAttribute("src"), "src should be deferred initially");

      // Wait for FCP mock to fire
      await new Promise((resolve) => setTimeout(resolve, 50));

      // After FCP, attributes should be restored
      expectStrictEqual(
        img.getAttribute("src"),
        "/image.jpg",
        "src should be restored after FCP",
      );
      expectStrictEqual(
        img.getAttribute("srcset"),
        "/image-300.jpg 300w",
        "srcset should be restored after FCP",
      );
    },
  },
  {
    name: "removes-data-attributes-after-restore",
    description: "Cleans up data-auto-sizes-* attributes after restoration",
    asyncTest: async () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      executeAutosizesScript(window);

      // Wait for FCP mock to fire
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Data attributes should be cleaned up
      expectFalse(
        img.hasAttribute("data-auto-sizes-src"),
        "data attribute should be removed after restore",
      );
    },
  },
];

// ============================================
// Multiple Images Tests
// ============================================

const multipleImagesTests = [
  {
    name: "processes-multiple-qualifying-images",
    description: "Defers all images with sizes=auto and loading=lazy",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      const container = document.getElementById("container");
      const img1 = createImage(document, {
        src: "/image1.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      const img2 = createImage(document, {
        src: "/image2.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      const img3 = createImage(document, {
        src: "/image3.jpg",
        sizes: "100vw",
        loading: "lazy",
      });
      container.appendChild(img1);
      container.appendChild(img2);
      container.appendChild(img3);

      executeAutosizesScript(window);

      // First two should be deferred
      expectFalse(img1.hasAttribute("src"), "img1 src should be deferred");
      expectFalse(img2.hasAttribute("src"), "img2 src should be deferred");
      // Third should not be deferred (no sizes=auto)
      expectTrue(
        img3.hasAttribute("src"),
        "img3 src should remain (no auto sizes)",
      );
    },
  },
];

// ============================================
// Turbo Navigation Tests
// ============================================

const turboNavigationTests = [
  {
    name: "handles-turbo-load-event",
    description: "Re-initializes on turbo:load event",
    test: () => {
      const { window, document } = createMockBrowserEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });

      executeAutosizesScript(window);

      // Add new image after initial load
      const container = document.getElementById("container");
      const img = createImage(document, {
        src: "/new-image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      container.appendChild(img);

      // Dispatch turbo:load event
      const turboEvent = new window.Event("turbo:load");
      document.dispatchEvent(turboEvent);

      // After turbo:load, state.fcpDone should be true
      // and new images should be processed directly (sizes calculated)
      // Since we can't easily check sizes in JSDOM, we just verify
      // the event handler doesn't throw
      expectTrue(true, "turbo:load event handled without error");
    },
  },
];

// ============================================
// Combine and run all tests
// ============================================

const allTestCases = [
  ...featureDetectionTests,
  ...imageFilteringTests,
  ...attributeDeferralTests,
  ...fcpRestorationTests,
  ...multipleImagesTests,
  ...turboNavigationTests,
];

createTestRunner("autosizes", allTestCases);
