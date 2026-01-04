import fs from "node:fs";
import path from "node:path";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import { getEleventyImg, getThumbnailOrNull } from "#media/image-lqip.js";
import { compact } from "#utils/array-utils.js";
import { createElement, createHtml, parseHtml } from "#utils/dom-builder.js";
import { loadJSDOM } from "#utils/lazy-jsdom.js";
import { jsonKey, memoize } from "#utils/memoize.js";

const U = {
  DEFAULT_OPTIONS: {
    formats: ["webp", "jpeg"],
    outputDir: ".image-cache",
    urlPath: "/img/",
    svgShortCircuit: true,
    filenameFormat: (_id, src, width, format) => {
      const basename = path.basename(src, path.extname(src));
      return `${basename}-${width}.${format}`;
    },
  },
  DEFAULT_WIDTHS: [240, 480, 900, 1300, "auto"],
  DEFAULT_SIZE: "auto",
  ASPECT_RATIO_ATTRIBUTE: "eleventy:aspectRatio",
  getImageHtml: async (imagePath, widths, alt, sizes, loading, classes) => {
    const imgAttributes = {
      alt: alt || "",
      sizes: sizes || U.DEFAULT_SIZE,
      loading: loading || "lazy",
      decoding: "async",
    };

    const pictureAttributes = classes?.trim() ? { class: classes } : {};

    const { default: Image } = await getEleventyImg();
    return Image(imagePath, {
      ...U.DEFAULT_OPTIONS,
      widths: widths,
      fixOrientation: true,
      returnType: "html",
      htmlOptions: {
        imgAttributes,
        pictureAttributes,
      },
    });
  },
  // Build div HTML using JSDOM for consistency
  makeDivHtml: async (
    classes,
    thumbPromise,
    imageAspectRatio,
    maxWidth,
    innerHTML,
  ) => {
    const bgImage = thumbPromise !== null ? await thumbPromise : null;
    const styles = compact([
      bgImage && `background-image: ${bgImage}`,
      `aspect-ratio: ${imageAspectRatio}`,
      maxWidth && `max-width: min(${maxWidth}px, 100%)`,
    ]);

    return await createHtml(
      "div",
      {
        class: classes ? `image-wrapper ${classes}` : "image-wrapper",
        style: styles.join("; "),
      },
      innerHTML,
    );
  },
  getWidths: (widths) => {
    if (typeof widths === "string") {
      widths = widths.split(",");
    }
    return widths || U.DEFAULT_WIDTHS;
  },
  getPath: (imageName) => {
    const name = imageName.toString();
    if (name.startsWith("/")) {
      return `./src${name}`;
    }
    if (name.startsWith("src/")) {
      return `./${name}`;
    }
    if (name.startsWith("images/")) {
      return `./src/${name}`;
    }
    return `./src/images/${name}`;
  },
};

// Compute wrapped image HTML for local images (memoized)
// Takes only the params that affect the HTML output
const computeWrappedImageHtml = memoize(
  async ({ imageName, alt, classes, sizes, widths, aspectRatio, loading }) => {
    const imagePath = U.getPath(imageName);
    const metadata = await getMetadata(imagePath);
    const finalPath = await cropImage(aspectRatio, imagePath, metadata);

    const innerHTML = await U.getImageHtml(
      finalPath,
      U.getWidths(widths),
      alt,
      sizes,
      loading,
      classes,
    );

    return await U.makeDivHtml(
      classes,
      getThumbnailOrNull(imagePath, metadata),
      getAspectRatio(aspectRatio, metadata),
      metadata.width,
      innerHTML,
    );
  },
  { cacheKey: jsonKey },
);

// Handle external URLs - just return a simple img tag without processing
async function handleExternalUrl(
  imageNameStr,
  alt,
  loading,
  classes,
  returnElement,
  document,
) {
  const attributes = {
    src: imageNameStr,
    alt: alt || "",
    loading: loading || "lazy",
    decoding: "async",
    sizes: "auto",
  };
  if (classes) attributes.class = classes;

  if (returnElement) {
    return await createElement("img", attributes, null, document);
  }
  return await createHtml("img", attributes);
}

// Check if URL is external
const isExternalUrl = (url) =>
  url.startsWith("http://") || url.startsWith("https://");

async function processAndWrapImage({
  logName: _logName,
  imageName,
  alt,
  classes,
  sizes = null,
  widths = null,
  returnElement = false,
  aspectRatio = null,
  loading = null,
  document = null,
}) {
  const imageNameStr = imageName.toString();

  // External URLs get simple img tags (no processing needed)
  if (isExternalUrl(imageNameStr)) {
    return await handleExternalUrl(
      imageNameStr,
      alt,
      loading,
      classes,
      returnElement,
      document,
    );
  }

  // Local images use the memoized HTML computation
  const html = await computeWrappedImageHtml({
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
  });

  return returnElement ? await parseHtml(html, document) : html;
}

const findImageFiles = (patterns = ["src/images/*.jpg"]) => {
  return patterns.flatMap((pattern) => [
    ...new Bun.Glob(pattern).scanSync("."),
  ]);
};

const createImagesCollection = (imageFiles = []) =>
  imageFiles.map((i) => i.split("/")[2]).reverse();

const copyImageCache = () => {
  if (fs.existsSync(".image-cache/")) {
    fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
  }
};

const createImageTransform = () => {
  return async (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    // Skip image processing for feeds - content is already processed
    if (outputPath.includes("/feed.")) return content;
    return await transformImages(content);
  };
};

const configureImages = async (eleventyConfig) => {
  const imageFiles = findImageFiles();

  // Add dev server middleware for on-request image transforms (lazy-loaded)
  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  // Add shortcode
  eleventyConfig.addAsyncShortcode("image", imageShortcode);

  // Add transform
  eleventyConfig.addTransform("processImages", createImageTransform());

  // Add collection
  eleventyConfig.addCollection("images", () =>
    createImagesCollection(imageFiles),
  );

  // Add after event for cache copying
  eleventyConfig.on("eleventy.after", copyImageCache);
};

const imageShortcode = async (
  imageName,
  alt,
  widths,
  classes = null,
  sizes = null,
  aspectRatio = null,
  loading = null,
) => {
  return await processAndWrapImage({
    logName: `imageShortcode: ${imageName}`,
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
    returnElement: false,
  });
};

/**
 * Fix invalid HTML where divs are the sole child of paragraph tags.
 */
const fixDivsInParagraphs = (document) => {
  const invalidParagraphs = Array.from(document.querySelectorAll("p")).filter(
    (p) => p.childNodes.length === 1 && p.firstChild.nodeName === "DIV",
  );
  for (const p of invalidParagraphs) {
    p.parentNode.insertBefore(p.firstChild, p);
    p.parentNode.removeChild(p);
  }
};

const extractImageOptions = (img, document) => {
  const aspectRatio = img.getAttribute(U.ASPECT_RATIO_ATTRIBUTE);
  if (aspectRatio) img.removeAttribute(U.ASPECT_RATIO_ATTRIBUTE);

  return {
    logName: `transformImages: ${img}`,
    imageName: img.getAttribute("src"),
    alt: img.getAttribute("alt"),
    classes: img.getAttribute("class"),
    sizes: img.getAttribute("sizes"),
    widths: img.getAttribute("widths"),
    aspectRatio,
    loading: null,
    returnElement: true,
    document,
  };
};

const processImageElement = async (img, document) => {
  if (img.parentNode.classList.contains("image-wrapper")) return;
  const wrapped = await processAndWrapImage(extractImageOptions(img, document));
  img.parentNode.replaceChild(wrapped, img);
};

const transformImages = async (content) => {
  if (!content || !content.includes("<img")) return content;
  if (!content.includes('src="/images/')) return content;

  const JSDOM = await loadJSDOM();
  const dom = new JSDOM(content);
  const { document } = dom.window;
  const images = document.querySelectorAll('img[src^="/images/"]');

  if (images.length === 0) return content;

  await Promise.all(
    Array.from(images).map((img) => processImageElement(img, document)),
  );

  fixDivsInParagraphs(document);
  return dom.serialize();
};

export {
  findImageFiles,
  createImagesCollection,
  copyImageCache,
  createImageTransform,
  configureImages,
  imageShortcode,
};
