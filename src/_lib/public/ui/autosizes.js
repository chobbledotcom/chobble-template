/**
 * Autosizes polyfill for browsers that don't support sizes="auto"
 *
 * Source: https://github.com/Shopify/autosizes/blob/main/src/autosizes.js
 *
 * Copyright 2025, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Algorithm:
 * 1. polyfillAutoSizes(): Uses UA sniffing to detect Chrome < 126 (no native support).
 *    Avoids polyfilling if browser is too old (no PerformanceObserver/paint timing).
 * 2. Before FCP: Store src/srcset in data attributes and remove originals to prevent loading.
 * 3. After FCP: Calculate displayed width via getBoundingClientRect() and set sizes attribute,
 *    then restore original src/srcset to trigger loading with correct sizes value.
 * 4. MutationObserver watches for new images with sizes="auto" and loading="lazy".
 */
(() => {
  const polyfillAutoSizes = () => {
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
  const FCP_ATTR = "data-autosizes-fcp";

  function elemWidth(elem) {
    const width = elem ? Math.round(elem.getBoundingClientRect().width) : 0;
    if (width <= 0) {
      return null;
    }
    return `${width}px`;
  }

  function calculateAndSetSizes(img) {
    const sizes = elemWidth(img) ?? elemWidth(img.parentElement);
    if (sizes) {
      img.sizes = sizes;
    }
  }

  const hasAutoSizesLazy = (img) =>
    (img.getAttribute("sizes") || "").trim().startsWith("auto") &&
    img.getAttribute("loading") === "lazy";

  const isLocalSrc = (img) => {
    const src = img.getAttribute("src") || "";
    return !src.startsWith("http://") && !src.startsWith("https://");
  };

  const shouldProcessImage = (img) =>
    !img.complete && hasAutoSizesLazy(img) && isLocalSrc(img);

  function storeAndRemoveAttributes(img) {
    for (const attribute of attributes) {
      if (img.hasAttribute(attribute)) {
        img.setAttribute(`${prefix}${attribute}`, img.getAttribute(attribute));
        img.removeAttribute(attribute);
      }
    }
  }

  const processImageForDefer = (img) => {
    if (!shouldProcessImage(img)) return;
    if (document.documentElement.hasAttribute(FCP_ATTR)) {
      calculateAndSetSizes(img);
    } else {
      storeAndRemoveAttributes(img);
    }
  };

  const deferImages = (images) => {
    for (const img of images) {
      processImageForDefer(img);
    }
  };

  const restoreStoredAttributes = (img) => {
    for (const attribute of attributes) {
      const tempAttribute = `${prefix}${attribute}`;
      if (!img.hasAttribute(tempAttribute)) continue;
      img.setAttribute(attribute, img.getAttribute(tempAttribute));
      img.removeAttribute(tempAttribute);
    }
  };

  const restoreImageAttributes = () => {
    const images = document.querySelectorAll(
      `img[${prefix}src], img[${prefix}srcset]`,
    );

    for (const img of images) {
      calculateAndSetSizes(img);
      restoreStoredAttributes(img);
    }
  };

  const collectImagesFromNodes = (addedNodes) =>
    Array.from(addedNodes).flatMap((node) => [
      ...(node.nodeName === "IMG" ? [node] : []),
      ...(node.querySelectorAll
        ? Array.from(node.querySelectorAll("img"))
        : []),
    ]);

  const WATCHED_ATTRS = ["sizes", "loading", "src", "srcset"];
  function isImageAttributeMutation(mutation) {
    return (
      mutation.type === "attributes" &&
      mutation.target.nodeName === "IMG" &&
      WATCHED_ATTRS.includes(mutation.attributeName)
    );
  }

  const collectImagesFromMutation = (mutation) =>
    mutation.type === "childList"
      ? collectImagesFromNodes(mutation.addedNodes)
      : isImageAttributeMutation(mutation)
        ? [mutation.target]
        : [];

  const observer = new MutationObserver((mutations) => {
    const newImages = mutations.flatMap(collectImagesFromMutation);
    if (newImages.length > 0) deferImages(newImages);
  });

  function initAutosizes() {
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
      for (const _ of entries.getEntriesByName("first-contentful-paint")) {
        document.documentElement.setAttribute(FCP_ATTR, "");
        setTimeout(restoreImageAttributes, 0);
        perfObserver.disconnect();
      }
    }).observe({ type: "paint", buffered: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutosizes);
  } else {
    initAutosizes();
  }
})();
