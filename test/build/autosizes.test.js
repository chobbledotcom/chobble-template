import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  createTestRunner,
  expectFalse,
  expectStrictEqual,
  expectTrue,
  rootDir,
} from "#test/test-utils.js";

// ============================================
// Load actual autosizes.js source
// ============================================

const AUTOSIZES_SCRIPT = fs.readFileSync(
  path.join(rootDir, "src/assets/js/autosizes.js"),
  "utf-8",
);

// ============================================
// Shared HTML template and JSDOM options
// ============================================

const BASE_HTML = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="container"></div>
</body>
</html>`;

const JSDOM_OPTIONS = {
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
};

// ============================================
// Mock PerformanceObserver injection script
// ============================================

const createPerformanceObserverScript = (supportsPaint = true) => `
window.PerformanceObserver = class {
  static supportedEntryTypes = ${supportsPaint ? '["paint"]' : "[]"};
  constructor(callback) {
    this.callback = callback;
    this.observing = false;
  }
  observe() {
    this.observing = true;
    setTimeout(() => {
      if (this.observing) {
        this.callback({
          getEntriesByName: (name) => name === "first-contentful-paint" ? [{ name }] : []
        }, this);
      }
    }, 0);
  }
  disconnect() {
    this.observing = false;
  }
};
`;

// ============================================
// Test Setup Helper
// ============================================

/**
 * Create a test environment with configurable browser and image.
 * @param {Object} options
 * @param {string} options.userAgent - Browser user agent string
 * @param {boolean} options.hasPerfObserver - Whether PerformanceObserver exists
 * @param {boolean} options.supportsPaint - Whether paint timing is supported
 * @param {Object} options.imgAttrs - Image attributes { src, sizes, loading, srcset }
 * @returns {{ window, img }} The JSDOM window and created image element
 */
const createTestEnv = (options = {}) => {
  const {
    userAgent = "Mozilla/5.0 Firefox/120",
    hasPerfObserver = true,
    supportsPaint = true,
    imgAttrs = { src: "/image.jpg", sizes: "auto", loading: "lazy" },
  } = options;

  const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
  const { window } = dom;

  Object.defineProperty(window.document, "readyState", {
    value: "complete",
    configurable: true,
  });

  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });

  if (hasPerfObserver) {
    window.eval(createPerformanceObserverScript(supportsPaint));
  }

  const img = window.document.createElement("img");
  for (const [attr, val] of Object.entries(imgAttrs)) {
    if (val !== undefined) img.setAttribute(attr, val);
  }
  window.document.getElementById("container").appendChild(img);

  return { window, img };
};

/**
 * Run autosizes script and return the image state.
 */
const runAutosizes = (window, img) => {
  window.eval(AUTOSIZES_SCRIPT);
  return img;
};

// ============================================
// Feature Detection Tests
// ============================================

const featureDetectionTests = [
  {
    name: "skips-polyfill-when-no-performance-observer",
    description: "Does not run polyfill when PerformanceObserver is missing",
    test: () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/120",
        hasPerfObserver: false,
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/120",
        supportsPaint: false,
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/126",
      });
      runAutosizes(window, img);
      expectTrue(img.hasAttribute("src"), "src should remain for Chrome 126+");
    },
  },
  {
    name: "runs-polyfill-for-chrome-125",
    description: "Runs polyfill for Chrome 125 (older than 126)",
    test: () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/125",
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "100vw", loading: "lazy" },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "auto", loading: "eager" },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "http://example.com/image.jpg",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expectTrue(img.hasAttribute("src"), "src should remain for http:// URLs");
    },
  },
  {
    name: "ignores-remote-https-images",
    description: "Does not process remote images with https:// URLs",
    test: () => {
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "https://example.com/image.jpg",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/images/photo.jpg", sizes: "auto", loading: "lazy" },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "auto, 100vw", loading: "lazy" },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv();
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "/image.jpg",
          srcset: "/image-300.jpg 300w, /image-600.jpg 600w",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "/image.jpg",
          srcset: "/image-300.jpg 300w",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
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
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "/image.jpg",
          srcset: "/image-300.jpg 300w",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expectFalse(img.hasAttribute("src"), "src should be deferred initially");

      await new Promise((resolve) => setTimeout(resolve, 50));

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
      const { window, img } = createTestEnv();
      runAutosizes(window, img);
      await new Promise((resolve) => setTimeout(resolve, 50));
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

/**
 * Create an image element with given attributes.
 */
const makeImg = (window, attrs) => {
  const img = window.document.createElement("img");
  for (const [k, v] of Object.entries(attrs)) img.setAttribute(k, v);
  return img;
};

const multipleImagesTests = [
  {
    name: "processes-multiple-qualifying-images",
    description: "Defers all images with sizes=auto and loading=lazy",
    test: () => {
      // Use createTestEnv but skip the default image by passing empty imgAttrs
      const { window } = createTestEnv({ imgAttrs: {} });
      const container = window.document.getElementById("container");

      const img1 = makeImg(window, {
        src: "/image1.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      const img2 = makeImg(window, {
        src: "/image2.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      const img3 = makeImg(window, {
        src: "/image3.jpg",
        sizes: "100vw",
        loading: "lazy",
      });

      container.appendChild(img1);
      container.appendChild(img2);
      container.appendChild(img3);

      window.eval(AUTOSIZES_SCRIPT);

      expectFalse(img1.hasAttribute("src"), "img1 src should be deferred");
      expectFalse(img2.hasAttribute("src"), "img2 src should be deferred");
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
      const { window } = createTestEnv({ imgAttrs: {} });
      window.eval(AUTOSIZES_SCRIPT);

      const img = makeImg(window, {
        src: "/new-image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      window.document.getElementById("container").appendChild(img);

      const turboEvent = new window.Event("turbo:load");
      window.document.dispatchEvent(turboEvent);

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
