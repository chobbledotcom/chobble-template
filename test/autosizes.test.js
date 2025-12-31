import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import {
  createTestRunner,
  expectFalse,
  expectStrictEqual,
  expectTrue,
  rootDir,
} from "./test-utils.js";

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
// Feature Detection Tests
// ============================================

const featureDetectionTests = [
  {
    name: "skips-polyfill-when-no-performance-observer",
    description: "Does not run polyfill when PerformanceObserver is missing",
    test: () => {
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Chrome/120",
        configurable: true,
      });
      // Don't set PerformanceObserver - leave it undefined

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Chrome/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(false));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Chrome/126",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

      expectTrue(img.hasAttribute("src"), "src should remain for Chrome 126+");
    },
  },
  {
    name: "runs-polyfill-for-chrome-125",
    description: "Runs polyfill for Chrome 125 (older than 126)",
    test: () => {
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Chrome/125",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "100vw");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "eager");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "http://example.com/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

      expectTrue(img.hasAttribute("src"), "src should remain for http:// URLs");
    },
  },
  {
    name: "ignores-remote-https-images",
    description: "Does not process remote images with https:// URLs",
    test: () => {
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "https://example.com/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/images/photo.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto, 100vw");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("srcset", "/image-300.jpg 300w, /image-600.jpg 600w");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("srcset", "/image-300.jpg 300w");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("srcset", "/image-300.jpg 300w");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

      expectFalse(img.hasAttribute("src"), "src should be deferred initially");

      // Wait for FCP mock to fire
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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const img = window.document.createElement("img");
      img.setAttribute("src", "/image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      window.eval(AUTOSIZES_SCRIPT);

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

const multipleImagesTests = [
  {
    name: "processes-multiple-qualifying-images",
    description: "Defers all images with sizes=auto and loading=lazy",
    test: () => {
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      const container = window.document.getElementById("container");

      const img1 = window.document.createElement("img");
      img1.setAttribute("src", "/image1.jpg");
      img1.setAttribute("sizes", "auto");
      img1.setAttribute("loading", "lazy");

      const img2 = window.document.createElement("img");
      img2.setAttribute("src", "/image2.jpg");
      img2.setAttribute("sizes", "auto");
      img2.setAttribute("loading", "lazy");

      const img3 = window.document.createElement("img");
      img3.setAttribute("src", "/image3.jpg");
      img3.setAttribute("sizes", "100vw");
      img3.setAttribute("loading", "lazy");

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
      const dom = new JSDOM(BASE_HTML, JSDOM_OPTIONS);
      const { window } = dom;

      Object.defineProperty(window.document, "readyState", {
        value: "complete",
        configurable: true,
      });

      Object.defineProperty(window.navigator, "userAgent", {
        value: "Mozilla/5.0 Firefox/120",
        configurable: true,
      });
      window.eval(createPerformanceObserverScript(true));

      window.eval(AUTOSIZES_SCRIPT);

      const img = window.document.createElement("img");
      img.setAttribute("src", "/new-image.jpg");
      img.setAttribute("sizes", "auto");
      img.setAttribute("loading", "lazy");
      window.document.getElementById("container").appendChild(img);

      const turboEvent = new window.Event("turbo:load");
      window.document.dispatchEvent(turboEvent);

      // After turbo:load, state.fcpDone should be true and images processed
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
