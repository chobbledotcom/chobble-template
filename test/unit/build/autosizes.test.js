import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { noop, rootDir } from "#test/test-utils.js";
import { loadDOM } from "#utils/lazy-dom.js";

const fixtureWindows = vi.fn(noop);

beforeEach(() => vi.useFakeTimers());

afterEach(async () => {
  try {
    await Promise.all(
      fixtureWindows.mock.calls.map(([window]) => window.happyDOM.close()),
    );
  } finally {
    fixtureWindows.mockClear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});

// ============================================
// Load actual autosizes.js source
// ============================================

const AUTOSIZES_SCRIPT = fs.readFileSync(
  path.join(rootDir, "src/_lib/public/ui/autosizes.js"),
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
// Test Setup Helper
// ============================================

/**
 * Execute script in window context using Node's vm module
 */
const execScript = (window, script) => {
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
 * @returns {Promise<{ window, img, fireFCP }>} Fixture with explicit paint delivery
 */
const createAutosizesTestEnv = async (options = {}) => {
  const {
    userAgent = "Mozilla/5.0 Firefox/120",
    hasPerfObserver = true,
    supportsPaint = true,
    imgAttrs = { src: "/image.jpg", sizes: "auto", loading: "lazy" },
  } = options;

  const { window } = await loadDOM(BASE_HTML, {
    settings: {
      disableJavaScriptEvaluation: false,
    },
  });
  fixtureWindows(window);
  // The VM binds this separate Window's timer, not Vitest's global timer.
  vi.spyOn(window, "setTimeout").mockImplementation(globalThis.setTimeout);

  Object.defineProperty(window.document, "readyState", {
    value: "complete",
    configurable: true,
  });

  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });

  const observePaint = vi.fn(noop);
  if (hasPerfObserver) {
    window.PerformanceObserver = class {
      static supportedEntryTypes = supportsPaint ? ["paint"] : [];
      constructor(callback) {
        this.observe = () => observePaint(callback, this);
        this.disconnect = noop;
      }
    };
  }

  const fireFCP = () => {
    expect(observePaint).toHaveBeenCalledTimes(1);
    const [callback, observer] = observePaint.mock.calls[0];
    callback(
      {
        getEntriesByName: (name) =>
          name === "first-contentful-paint" ? [{ name }] : [],
      },
      observer,
    );
  };

  const img = window.document.createElement("img");
  markNotLoaded(img);
  for (const [attr, val] of Object.entries(imgAttrs)) {
    if (val !== undefined) img.setAttribute(attr, val);
  }
  window.document.getElementById("container").appendChild(img);

  return { window, img, fireFCP };
};

/**
 * Model an image that has not finished loading. The polyfill skips images
 * with `complete === true`; happy-dom marks every image complete because it
 * never actually loads them, so the tests pin the pre-load state.
 */
const markNotLoaded = (img) => {
  Object.defineProperty(img, "complete", { value: false, configurable: true });
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
  markNotLoaded(img);
  for (const [k, v] of Object.entries(attrs)) img.setAttribute(k, v);
  return img;
};

// Shared test configuration for src+srcset scenarios
const SRC_SRCSET_ATTRS = {
  src: "/image.jpg",
  srcset: "/image-300.jpg 300w",
  sizes: "auto",
  loading: "lazy",
};

/**
 * Setup test environment with imgAttrs and run autosizes.
 * Returns the fixture and explicit paint driver for assertions.
 */
const setupAndRun = async (imgAttrs) => {
  const env = await createAutosizesTestEnv({ imgAttrs });
  runAutosizes(env.window, env.img);
  return env;
};

const runAndCheckDeferred = (window, img, expectedSrc) => {
  runAutosizes(window, img);
  expect(img.hasAttribute("src")).toBe(false);
  expect(img.getAttribute("data-auto-sizes-src")).toBe(expectedSrc);
};

const runAndExpectSrc = (window, img, expected) => {
  runAutosizes(window, img);
  expect(img.hasAttribute("src")).toBe(expected);
};

const expectAttributePresence = (element, attributes, present) => {
  for (const attribute of attributes) {
    expect(element.hasAttribute(attribute), attribute).toBe(present);
  }
};

describe("autosizes", () => {
  describe("Feature detection", () => {
    test("Does not run polyfill when PerformanceObserver is missing", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Chrome/120",
        hasPerfObserver: false,
      });
      runAndExpectSrc(window, img, true);
    });

    test("Does not run polyfill when paint timing not supported", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Chrome/120",
        supportsPaint: false,
      });
      runAndExpectSrc(window, img, true);
    });

    test("Does not run polyfill for Chrome 126+", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Chrome/126",
      });
      runAndExpectSrc(window, img, true);
    });

    test("Runs polyfill for Chrome 125 (older than 126)", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Chrome/125",
      });
      runAutosizes(window, img);
      expect(img.hasAttribute("src")).toBe(false);
      expect(img.hasAttribute("data-auto-sizes-src")).toBe(true);
    });

    test("Does not run polyfill for Firefox 150+", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Firefox/150",
      });
      runAndExpectSrc(window, img, true);
    });

    test("Runs polyfill for Firefox 149 (older than 150)", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Firefox/149",
      });
      runAndExpectSrc(window, img, false);
    });

    test("Runs polyfill for Safari", async () => {
      const { window, img } = await createAutosizesTestEnv({
        userAgent: "Mozilla/5.0 Version/18.5 Safari/605.1.15",
      });
      runAndExpectSrc(window, img, false);
    });
  });

  describe("Image filtering", () => {
    const createWithImgAttrs = (src, sizes = "auto") =>
      createAutosizesTestEnv({ imgAttrs: { src, sizes, loading: "lazy" } });

    const testRemoteUrlNotProcessed = async (url) => {
      const { window, img } = await createWithImgAttrs(url);
      runAndExpectSrc(window, img, true);
    };

    test("Does not process images without sizes=auto", async () => {
      const { window, img } = await createAutosizesTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "100vw", loading: "lazy" },
      });
      runAndExpectSrc(window, img, true);
    });

    test("Does not process images without loading=lazy", async () => {
      const { window, img } = await createAutosizesTestEnv({
        imgAttrs: { src: "/image.jpg", sizes: "auto", loading: "eager" },
      });
      runAndExpectSrc(window, img, true);
    });

    test("Does not process remote images with http:// URLs", async () => {
      await testRemoteUrlNotProcessed("http://example.com/image.jpg");
    });

    test("Does not process remote images with https:// URLs", async () => {
      await testRemoteUrlNotProcessed("https://example.com/image.jpg");
    });

    test("Processes local images with relative paths", async () => {
      const { window, img } = await createAutosizesTestEnv({
        imgAttrs: {
          src: "/images/photo.jpg",
          sizes: "auto",
          loading: "lazy",
        },
      });
      runAndCheckDeferred(window, img, "/images/photo.jpg");
    });

    test("Processes images with sizes='auto, 100vw' format", async () => {
      const { window, img } = await createWithImgAttrs(
        "/image.jpg",
        "auto, 100vw",
      );
      runAndExpectSrc(window, img, false);
    });
  });

  describe("Attribute deferral", () => {
    test("Moves src to data-auto-sizes-src before FCP", async () => {
      const { window, img } = await createAutosizesTestEnv();
      runAndCheckDeferred(window, img, "/image.jpg");
    });

    test("Moves srcset to data-auto-sizes-srcset before FCP", async () => {
      const { window, img } = await createAutosizesTestEnv({
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

    test("Moves both src and srcset to data attributes", async () => {
      const { img } = await setupAndRun(SRC_SRCSET_ATTRS);
      expectAttributePresence(img, ["src", "srcset"], false);
      expectAttributePresence(
        img,
        ["data-auto-sizes-src", "data-auto-sizes-srcset"],
        true,
      );
    });
  });

  describe("FCP restoration", () => {
    test("Restores src and srcset after FCP fires", async () => {
      const fcp = await setupAndRun(SRC_SRCSET_ATTRS);
      expect(fcp.img.hasAttribute("src")).toBe(false);

      vi.runOnlyPendingTimers();
      expectAttributePresence(fcp.img, ["src", "srcset"], false);

      fcp.fireFCP();
      expectAttributePresence(fcp.img, ["src", "srcset"], false);
      vi.runOnlyPendingTimers();
      expect(fcp.img.getAttribute("src")).toBe("/image.jpg");
      expect(fcp.img.getAttribute("srcset")).toBe("/image-300.jpg 300w");
    });

    test("Cleans up data-auto-sizes-* attributes after restoration", async () => {
      const { window, img, fireFCP } = await createAutosizesTestEnv({
        imgAttrs: SRC_SRCSET_ATTRS,
      });
      runAutosizes(window, img);
      const deferredAttributes = [
        "data-auto-sizes-src",
        "data-auto-sizes-srcset",
      ];
      expectAttributePresence(img, deferredAttributes, true);
      fireFCP();
      vi.runOnlyPendingTimers();
      expectAttributePresence(img, deferredAttributes, false);
    });
  });

  describe("Picture source handling", () => {
    const setupPictureTest = async (sourceSrcset) => {
      const { window, img, fireFCP } = await createAutosizesTestEnv({
        imgAttrs: { ...SRC_SRCSET_ATTRS },
      });
      const picture = window.document.createElement("picture");
      const source = window.document.createElement("source");
      source.setAttribute("type", "image/webp");
      source.setAttribute("srcset", sourceSrcset);
      source.setAttribute("sizes", "auto");
      picture.appendChild(source);
      img.parentElement.replaceChild(picture, img);
      picture.appendChild(img);
      return { window, img, source, fireFCP };
    };

    const setupAndRunPicture = async (srcset) => {
      const { window, img, source, fireFCP } = await setupPictureTest(srcset);
      runAutosizes(window, img);
      expect(source.hasAttribute("srcset")).toBe(false);
      return { source, fireFCP };
    };

    test("Strips srcset from source elements inside picture before FCP", async () => {
      const srcset = "/img-300.webp 300w, /img-600.webp 600w";
      const { source } = await setupAndRunPicture(srcset);
      expect(source.getAttribute("data-auto-sizes-srcset")).toBe(srcset);
    });

    test("Restores source srcset after FCP", async () => {
      const srcset = "/img-300.webp 300w";
      const { source, fireFCP } = await setupAndRunPicture(srcset);

      fireFCP();
      expect(source.hasAttribute("srcset")).toBe(false);
      vi.runOnlyPendingTimers();
      expect(source.getAttribute("srcset")).toBe(srcset);
      expect(source.hasAttribute("data-auto-sizes-srcset")).toBe(false);
    });
  });

  describe("Multiple images", () => {
    test("Defers all images with sizes=auto and loading=lazy", async () => {
      const { window } = await createAutosizesTestEnv({ imgAttrs: {} });
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
});
