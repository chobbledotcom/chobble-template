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

(() => {
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
  const state = { fcpDone: false, initialized: false };

  function elemWidth(elem) {
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
    const sizes = elemWidth(img) ?? elemWidth(img.parentElement);
    if (sizes) {
      img.sizes = sizes;
    }
  }

  // Check if image has auto sizes and lazy loading
  const hasAutoSizesLazy = (img) =>
    (img.getAttribute("sizes") || "").trim().startsWith("auto") &&
    img.getAttribute("loading") === "lazy";

  // Check if src is a local URL (not external http/https)
  const isLocalSrc = (img) => {
    const src = img.getAttribute("src") || "";
    return !src.startsWith("http://") && !src.startsWith("https://");
  };

  // Check if image should be processed by the polyfill
  const shouldProcessImage = (img) =>
    !img.complete && hasAutoSizesLazy(img) && isLocalSrc(img);

  // Store original attributes and remove them to prevent loading
  function storeAndRemoveAttributes(img) {
    for (const attribute of attributes) {
      if (img.hasAttribute(attribute)) {
        img.setAttribute(`${prefix}${attribute}`, img.getAttribute(attribute));
        img.removeAttribute(attribute);
      }
    }
  }

  // Process a single image for deferred loading
  const processImageForDefer = (img) => {
    if (!shouldProcessImage(img)) return;
    if (state.fcpDone) {
      calculateAndSetSizes(img);
    } else {
      storeAndRemoveAttributes(img);
    }
  };

  // Store the original src and srcset attributes, and remove them to prevent loading before
  // we've calculated the sizes attribute
  const deferImages = (images) => {
    for (const img of images) {
      processImageForDefer(img);
    }
  };

  // Restore stored attributes back to their original names
  const restoreStoredAttributes = (img) => {
    for (const attribute of attributes) {
      const tempAttribute = `${prefix}${attribute}`;
      if (!img.hasAttribute(tempAttribute)) continue;
      img.setAttribute(attribute, img.getAttribute(tempAttribute));
      img.removeAttribute(tempAttribute);
    }
  };

  // Set the sizes attribute to the computed width in pixels and restore original src and srcset
  const restoreImageAttributes = () => {
    const images = document.querySelectorAll(
      `img[${prefix}src], img[${prefix}srcset]`,
    );

    for (const img of images) {
      calculateAndSetSizes(img);
      restoreStoredAttributes(img);
    }
  };

  // Collect images from added nodes
  const collectImagesFromNodes = (addedNodes) =>
    Array.from(addedNodes).flatMap((node) => [
      ...(node.nodeName === "IMG" ? [node] : []),
      ...(node.querySelectorAll
        ? Array.from(node.querySelectorAll("img"))
        : []),
    ]);

  // Check if mutation is a relevant attribute change on an image
  const WATCHED_ATTRS = ["sizes", "loading", "src", "srcset"];
  function isImageAttributeMutation(mutation) {
    return (
      mutation.type === "attributes" &&
      mutation.target.nodeName === "IMG" &&
      WATCHED_ATTRS.includes(mutation.attributeName)
    );
  }

  // Collect images from a mutation
  const collectImagesFromMutation = (mutation) =>
    mutation.type === "childList"
      ? collectImagesFromNodes(mutation.addedNodes)
      : isImageAttributeMutation(mutation)
        ? [mutation.target]
        : [];

  // Set up mutation observer to detect new images
  const observer = new MutationObserver((mutations) => {
    const newImages = mutations.flatMap(collectImagesFromMutation);
    if (newImages.length > 0) deferImages(newImages);
  });

  function initAutosizes() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    // Start observing the document
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["sizes", "loading"],
    });

    // Prevent the load of any existing images when the polyfill loads.
    deferImages(
      document.querySelectorAll('img[sizes^="auto"][loading="lazy"]'),
    );

    new PerformanceObserver((entries, perfObserver) => {
      for (const _ of entries.getEntriesByName("first-contentful-paint")) {
        state.fcpDone = true;
        setTimeout(restoreImageAttributes, 0);
        perfObserver.disconnect();
      }
    }).observe({ type: "paint", buffered: true });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutosizes);
  } else {
    initAutosizes();
  }
})();
