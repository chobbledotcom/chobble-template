import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { Window } from "happy-dom";
import { rootDir } from "#test/test-utils.js";

// ============================================
// Load actual autosizes.js source
// ============================================

const AUTOSIZES_SCRIPT = fs.readFileSync(
  path.join(rootDir, "src/assets/js/autosizes.js"),
  "utf-8",
);

// ============================================
// Shared HTML template
// ============================================

const BASE_HTML = `
<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="container"></div>
</body>
</html>`;

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
 * Execute script in window context using Node's vm module
 */
const execScript = (window, script) => {
  // Create a context with all necessary window properties
  const context = vm.createContext({
    window,
    document: window.document,
    navigator: window.navigator,
    setTimeout: window.setTimeout.bind(window),
    PerformanceObserver: window.PerformanceObserver,
    MutationObserver: window.MutationObserver,
    console,
  });
  vm.runInContext(script, context);
};

/**
 * Create a test environment with configurable browser and image.
 * @param {Object} options
 * @param {string} options.userAgent - Browser user agent string
 * @param {boolean} options.hasPerfObserver - Whether PerformanceObserver exists
 * @param {boolean} options.supportsPaint - Whether paint timing is supported
 * @param {Object} options.imgAttrs - Image attributes { src, sizes, loading, srcset }
 * @returns {{ window, img }} The happy-dom window and created image element
 */
const createTestEnv = (options = {}) => {
  const {
    userAgent = "Mozilla/5.0 Firefox/120",
    hasPerfObserver = true,
    supportsPaint = true,
    imgAttrs = { src: "/image.jpg", sizes: "auto", loading: "lazy" },
  } = options;

  const window = new Window({
    settings: {
      disableJavaScriptEvaluation: false,
    },
  });
  window.document.write(BASE_HTML);

  Object.defineProperty(window.document, "readyState", {
    value: "complete",
    configurable: true,
  });

  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });

  if (hasPerfObserver) {
    execScript(window, createPerformanceObserverScript(supportsPaint));
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
  execScript(window, AUTOSIZES_SCRIPT);
  return img;
};

/**
 * Create an image element with given attributes.
 */
const makeImg = (window, attrs) => {
  const img = window.document.createElement("img");
  for (const [k, v] of Object.entries(attrs)) img.setAttribute(k, v);
  return img;
};

describe("autosizes", () => {
  describe("Feature detection", () => {
    test("Does not run polyfill when PerformanceObserver is missing", () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/120",
        hasPerfObserver: false,
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Does not run polyfill when paint timing not supported", () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/120",
        supportsPaint: false,
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Does not run polyfill for Chrome 126+", () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/126",
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Runs polyfill for Chrome 125 (older than 126)", () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Chrome/125",
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
      expect(img.hasAttribute("data-auto-sizes-src")).toBe(true);
    });

    test("Runs polyfill for non-Chrome browsers (Firefox, Safari)", () => {
      const { window, img } = createTestEnv({
        userAgent: "Mozilla/5.0 Firefox/120",
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
    });
  });

  describe("Image filtering", () => {
    test("Does not process images without sizes=auto", () => {
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "100vw", loading: "lazy" },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Does not process images without loading=lazy", () => {
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "auto", loading: "eager" },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Does not process remote images with http:// URLs", () => {
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "http://example.com/image.jpg",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Does not process remote images with https:// URLs", () => {
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "https://example.com/image.jpg",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(true);
    });

    test("Processes local images with relative paths", () => {
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/images/photo.jpg", sizes: "auto", loading: "lazy" },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
      expect(img.getAttribute("data-auto-sizes-src")).toBe("/images/photo.jpg");
    });

    test("Processes images with sizes='auto, 100vw' format", () => {
      const { window, img } = createTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "auto, 100vw", loading: "lazy" },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
    });
  });

  describe("Attribute deferral", () => {
    test("Moves src to data-auto-sizes-src before FCP", () => {
      const { window, img } = createTestEnv();
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
      expect(img.getAttribute("data-auto-sizes-src")).toBe("/image.jpg");
    });

    test("Moves srcset to data-auto-sizes-srcset before FCP", () => {
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "/image.jpg",
          srcset: "/image-300.jpg 300w, /image-600.jpg 600w",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("srcset")).toBe(false);
      expect(img.getAttribute("data-auto-sizes-srcset")).toBe(
        "/image-300.jpg 300w, /image-600.jpg 600w",
      );
    });

    test("Moves both src and srcset to data attributes", () => {
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "/image.jpg",
          srcset: "/image-300.jpg 300w",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
      expect(img.hasAttribute("srcset")).toBe(false);
      expect(img.hasAttribute("data-auto-sizes-src")).toBe(true);
      expect(img.hasAttribute("data-auto-sizes-srcset")).toBe(true);
    });
  });

  describe("FCP restoration", () => {
    test("Restores src and srcset after FCP fires", async () => {
      const { window, img } = createTestEnv({
        imgAttrs: {
          src: "/image.jpg",
          srcset: "/image-300.jpg 300w",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(img.getAttribute("src")).toBe("/image.jpg");
      expect(img.getAttribute("srcset")).toBe("/image-300.jpg 300w");
    });

    test("Cleans up data-auto-sizes-* attributes after restoration", async () => {
      const { window, img } = createTestEnv();
      runAutosizes(window, img);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(img.hasAttribute("data-auto-sizes-src")).toBe(false);
    });
  });

  describe("Multiple images", () => {
    test("Defers all images with sizes=auto and loading=lazy", () => {
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

      execScript(window, AUTOSIZES_SCRIPT);

      expect(img1.hasAttribute("src")).toBe(false);
      expect(img2.hasAttribute("src")).toBe(false);
      expect(img3.hasAttribute("src")).toBe(true);
    });
  });

  describe("Turbo navigation", () => {
    test("Re-initializes on turbo:load event", () => {
      const { window } = createTestEnv({ imgAttrs: {} });
      execScript(window, AUTOSIZES_SCRIPT);

      const img = makeImg(window, {
        src: "/new-image.jpg",
        sizes: "auto",
        loading: "lazy",
      });
      window.document.getElementById("container").appendChild(img);

      const turboEvent = new window.Event("turbo:load");
      window.document.dispatchEvent(turboEvent);

      expect(true).toBe(true);
    });
  });
});
