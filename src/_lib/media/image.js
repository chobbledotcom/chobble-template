import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createElement, createHtml, parseHtml } from "#utils/dom-builder.js";
import { loadJSDOM } from "#utils/lazy-jsdom.js";
import { memoize } from "#utils/memoize.js";

// Lazy-load heavy image processing modules
let sharpModule = null;
const getSharp = async () => {
  if (!sharpModule) sharpModule = (await import("sharp")).default;
  return sharpModule;
};

let eleventyImgModule = null;
const getEleventyImg = async () => {
  if (!eleventyImgModule)
    eleventyImgModule = await import("@11ty/eleventy-img");
  return eleventyImgModule;
};

const CROP_CACHE_DIR = ".image-cache";

const generateCropHash = (sourcePath, aspectRatio) => {
  return crypto
    .createHash("md5")
    .update(`${sourcePath}:${aspectRatio}`)
    .digest("hex")
    .slice(0, 8);
};

const buildCropCachePath = (sourcePath, aspectRatio) => {
  const hash = generateCropHash(sourcePath, aspectRatio);
  const basename = path.basename(sourcePath, path.extname(sourcePath));
  return path.join(CROP_CACHE_DIR, `${basename}-crop-${hash}.jpeg`);
};

const parseCropDimensions = (aspectRatio, metadata) => {
  const dimensions = aspectRatio.split("/").map((s) => Number.parseFloat(s));
  const aspectFraction = dimensions[0] / dimensions[1];
  return {
    width: metadata.width,
    height: Math.round(metadata.width / aspectFraction),
  };
};

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
  makeThumbnail: memoize(async (imagePath) => {
    const { default: Image } = await getEleventyImg();
    const thumbnails = await Image(imagePath, {
      ...U.DEFAULT_OPTIONS,
      widths: [32],
      formats: ["webp"],
    });
    const [thumbnail] = thumbnails.webp;
    const file = fs.readFileSync(thumbnail.outputPath);
    const base64 = file.toString("base64");
    return `url('data:image/webp;base64,${base64}')`;
  }),
  getAspectRatio: (aspectRatio, metadata) => {
    if (aspectRatio) return aspectRatio;
    let gcd = function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    };
    gcd = gcd(metadata.width, metadata.height);
    return `${metadata.width / gcd}/${metadata.height / gcd}`;
  },
  cropImage: memoize(
    async (aspectRatio, sourcePath, metadata) => {
      if (aspectRatio === null || aspectRatio === undefined) return sourcePath;

      const cachedPath = buildCropCachePath(sourcePath, aspectRatio);
      if (fs.existsSync(cachedPath)) return cachedPath;

      const { width, height } = parseCropDimensions(aspectRatio, metadata);
      fs.mkdirSync(CROP_CACHE_DIR, { recursive: true });
      const sharp = await getSharp();
      await sharp(sourcePath)
        .resize(width, height, { fit: "cover" })
        .toFile(cachedPath);

      return cachedPath;
    },
    { cacheKey: (args) => `${args[0]}:${args[1]}` },
  ),
  // Build div HTML using JSDOM for consistency
  makeDivHtml: async (
    classes,
    thumbPromise,
    imageAspectRatio,
    maxWidth,
    innerHTML,
  ) => {
    const styles = [];

    if (thumbPromise !== null) {
      const bgImage = await thumbPromise;
      if (bgImage) styles.push(`background-image: ${bgImage}`);
    }

    styles.push(`aspect-ratio: ${imageAspectRatio}`);

    if (maxWidth) styles.push(`max-width: min(${maxWidth}px, 100%)`);

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
  // Memoize sharp metadata reads (just the metadata, not the sharp instance)
  getMetadata: memoize(async (path) => {
    const sharp = await getSharp();
    return await sharp(path).metadata();
  }),
  // Memoize file size checks
  getFileSize: memoize((path) => fs.statSync(path).size),
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

// Cache for processAndWrapImage results (HTML strings only, not elements)
const imageHtmlCache = new Map();

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
  document = null, // Optional: reuse existing JSDOM document
}) {
  // Create cache key from params that affect the output HTML
  const cacheKey = JSON.stringify({
    imageName: imageName?.toString(),
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
  });

  // Use cache for HTML output, or when we have a document to create element from cached HTML
  if (imageHtmlCache.has(cacheKey)) {
    const cachedHtml = imageHtmlCache.get(cacheKey);
    if (!returnElement) {
      return cachedHtml;
    }
    // Convert cached HTML to element using provided document
    if (document) {
      return await parseHtml(cachedHtml, document);
    }
  }
  // Handle external URLs - just return a simple img tag without processing
  const imageNameStr = imageName.toString();
  if (
    imageNameStr.startsWith("http://") ||
    imageNameStr.startsWith("https://")
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

  const imagePath = U.getPath(imageName);
  const metadata = await U.getMetadata(imagePath);

  // Check if we should skip base64 placeholder for SVG or images under 5KB
  const isSvg = metadata.format === "svg";
  const fileSize = U.getFileSize(imagePath);
  const isUnder5KB = fileSize < 5 * 1024;
  const shouldSkipPlaceholder = isSvg || isUnder5KB;

  const thumbPromise = shouldSkipPlaceholder
    ? null
    : U.makeThumbnail(imagePath);
  const imageAspectRatio = U.getAspectRatio(aspectRatio, metadata);
  const croppedPathOrNull = await U.cropImage(aspectRatio, imagePath, metadata);
  const finalPath = croppedPathOrNull || imagePath;

  const innerHTML = await U.getImageHtml(
    finalPath,
    U.getWidths(widths),
    alt,
    sizes,
    loading,
    classes,
  );

  const html = await U.makeDivHtml(
    classes,
    thumbPromise,
    imageAspectRatio,
    metadata.width,
    innerHTML,
  );
  imageHtmlCache.set(cacheKey, html);

  return returnElement ? await parseHtml(html, document) : html;
}

const findImageFiles = (patterns = ["src/images/*.jpg"]) => {
  return patterns.flatMap((pattern) => [
    ...new Bun.Glob(pattern).scanSync("."),
  ]);
};

const createImagesCollection = (imageFiles) => {
  if (!imageFiles) return [];
  return imageFiles.map((i) => i.split("/")[2]).reverse();
};

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
  Array.from(document.querySelectorAll("p"))
    .filter((p) => p.childNodes.length === 1 && p.firstChild.nodeName === "DIV")
    .forEach((p) => {
      p.parentNode.insertBefore(p.firstChild, p);
      p.parentNode.removeChild(p);
    });
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
