// Autosizes polyfill for browsers that don't support sizes="auto"
// Source: https://github.com/Shopify/autosizes/blob/main/src/autosizes.js
//
// Copyright 2025, Shopify Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function () {
  // Check if the browser already supports sizes="auto"
  // We're using UA sniffing here, as there's no way to detect browser
  // support without a forced layout, which would make things slower for everyone.
  const polyfillAutoSizes = () => {
    // Avoid polyfilling if the browser is too old and doesn't support performance observer and paint timing
    if (
      !("PerformanceObserver" in window) ||
      !PerformanceObserver.supportedEntryTypes.includes("paint")
    ) {
      return false;
    }

    const userAgent = navigator.userAgent;
    const chromeMatch = userAgent.match(/Chrome\/(\d+)/);

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
  let didFirstContentfulPaintRun = false;
  let initialized = false;

  function getSizesValueFromElement(elem) {
    const width = elem ? Math.round(elem.getBoundingClientRect().width) : 0;
    if (width <= 0) {
      return null;
    }
    // Set the sizes attribute to the computed width in pixels
    return `${width}px`;
  }

  function calculateAndSetSizes(img) {
    // Calculate the displayed width of the image
    // getBoundingClientRect() forces layout, but this is running right after FCP,
    // so hopefully the DOM is not dirty.
    let sizes = getSizesValueFromElement(img);
    if (!sizes) {
      // If we get no width for the image, use the parent's width
      sizes = getSizesValueFromElement(img.parentElement);
    }
    if (sizes) {
      img.sizes = sizes;
    }
  }

  // Store the original src and srcset attributes, and remove them to prevent loading before
  // we've calculated the sizes attribute
  function preventNonAutoImageLoad(images) {
    for (const img of images) {
      if (img.complete) {
        // Don't do any of this if the image is already loaded
        continue;
      }
      // Only process images with sizes attribute starting with "auto" and loading="lazy"
      if (
        !(img.getAttribute("sizes") || "").trim().startsWith("auto") ||
        img.getAttribute("loading") !== "lazy"
      ) {
        continue;
      }
      // Skip remote images (http/https URLs) - only process local images
      const src = img.getAttribute("src") || "";
      if (src.startsWith("http://") || src.startsWith("https://")) {
        continue;
      }
      if (!didFirstContentfulPaintRun) {
        for (const attribute of attributes) {
          if (img.hasAttribute(attribute)) {
            // Store original src and srcset
            img.setAttribute(
              `${prefix}${attribute}`,
              img.getAttribute(attribute),
            );
            // Remove src and srcset to prevent loading
            img.removeAttribute(attribute);
          }
        }
      } else {
        // Calculate sizes without removing src and srcset
        calculateAndSetSizes(img);
      }
    }
  }

  // Set the sizes attribute to the computed width in pixels and restore original src and srcset
  function restoreImageAttributes() {
    const images = document.querySelectorAll(
      `img[${prefix}src], img[${prefix}srcset]`,
    );

    for (const img of images) {
      calculateAndSetSizes(img);

      for (const attribute of attributes) {
        const tempAttribute = `${prefix}${attribute}`;
        if (img.hasAttribute(tempAttribute)) {
          img[attribute] = img.getAttribute(tempAttribute);
          img.removeAttribute(tempAttribute);
        }
      }
    }
  }

  // Set up mutation observer to detect new images
  const observer = new MutationObserver((mutations) => {
    const newImages = [];

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === "IMG") {
            newImages.push(node);
          }
          // Add all images within added nodes
          if (node.querySelectorAll) {
            newImages.push(...node.querySelectorAll("img"));
          }
        }
      }
      // Check for attribute changes on images
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
      preventNonAutoImageLoad(newImages);
    }
  });

  function initAutosizes() {
    // On Turbo navigations, FCP has already happened, so process images directly
    if (initialized) {
      didFirstContentfulPaintRun = true;
      const images = document.querySelectorAll(
        'img[sizes^="auto"][loading="lazy"]',
      );
      for (const img of images) {
        calculateAndSetSizes(img);
      }
      return;
    }

    initialized = true;

    // Start observing the document
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["sizes", "loading"],
    });

    // Prevent the load of any existing images when the polyfill loads.
    preventNonAutoImageLoad(
      document.querySelectorAll('img[sizes^="auto"][loading="lazy"]'),
    );

    new PerformanceObserver((entries, perfObserver) => {
      entries.getEntriesByName("first-contentful-paint").forEach(() => {
        didFirstContentfulPaintRun = true;
        setTimeout(restoreImageAttributes, 0);
        perfObserver.disconnect();
      });
    }).observe({ type: "paint", buffered: true });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutosizes);
  } else {
    initAutosizes();
  }

  // Re-initialize on Turbo navigation (for SPA-like page transitions)
  document.addEventListener("turbo:load", initAutosizes);
})();
