import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Image, {
  eleventyImageOnRequestDuringServePlugin,
} from "@11ty/eleventy-img";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import { memoize } from "#utils/memoize.js";

const CROP_CACHE_DIR = ".image-cache";

const isServeMode = () => process.env.ELEVENTY_RUN_MODE === "serve";

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

// Helper to convert HTML string to DOM element
const htmlToElement = (html, document = null) => {
  if (document) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.firstChild;
  }
  const {
    window: { document: doc },
  } = new JSDOM(`<body>${html}</body>`);
  return doc.body.firstChild;
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
  makeImagePromise: (path, widths) => {
    return Image(path, {
      ...U.DEFAULT_OPTIONS,
      widths: widths,
      transformOnRequest: isServeMode(),
    });
  },
  makeThumbnail: memoize(async (path) => {
    let thumbnails;
    try {
      thumbnails = await Image(path, {
        ...U.DEFAULT_OPTIONS,
        widths: [32],
        formats: ["webp"],
      });
    } catch (_error) {
      return null;
    }
    if (!thumbnails) {
      return null;
    }
    const [thumbnail] = thumbnails.webp;
    const base64 = fs.readFileSync(thumbnail.outputPath).toString("base64");
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
  cropImage: async (aspectRatio, sourcePath, metadata) => {
    if (aspectRatio === null || aspectRatio === undefined) return null;

    const cachedPath = buildCropCachePath(sourcePath, aspectRatio);
    if (fs.existsSync(cachedPath)) return cachedPath;

    const { width, height } = parseCropDimensions(aspectRatio, metadata);
    fs.mkdirSync(CROP_CACHE_DIR, { recursive: true });
    await sharp(sourcePath)
      .resize(width, height, { fit: "cover" })
      .toFile(cachedPath);

    return cachedPath;
  },
  // Build div HTML string directly instead of using JSDOM (much faster)
  makeDivHtml: async (
    classes,
    thumbPromise,
    imageAspectRatio,
    maxWidth,
    innerHTML,
  ) => {
    const classAttr = classes
      ? `class="image-wrapper ${classes}"`
      : 'class="image-wrapper"';

    const styles = ["background-size: cover"];
    if (thumbPromise !== null) {
      const bgImage = await thumbPromise;
      if (bgImage) styles.push(`background-image: ${bgImage}`);
    }
    styles.push(`aspect-ratio: ${imageAspectRatio}`);
    if (maxWidth) styles.push(`max-width: ${maxWidth}px`);

    return `<div ${classAttr} style="${styles.join("; ")}">${innerHTML}</div>`;
  },
  getHtmlAttributes: (alt, sizes, loading, classes) => {
    const attributes = {
      alt: alt,
      sizes: sizes,
      loading: loading,
      decoding: "async",
    };
    return classes?.trim()
      ? {
          ...attributes,
          classes,
        }
      : attributes;
  },
  getWidths: (widths) => {
    if (typeof widths === "string") {
      widths = widths.split(",");
    }
    return widths || U.DEFAULT_WIDTHS;
  },
  // Memoize sharp metadata reads (just the metadata, not the sharp instance)
  getMetadata: memoize(async (path) => {
    const sharpImage = sharp(path);
    return await sharpImage.metadata();
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
  getDefault: (value, defaultString) => {
    return value === null || value === undefined || value === ""
      ? defaultString
      : value;
  },
  makeImageHtml: async (imagePromise, alt, sizes, loading, classes) => {
    return Image.generateHTML(
      await imagePromise,
      U.getHtmlAttributes(
        alt,
        U.getDefault(sizes, U.DEFAULT_SIZE),
        U.getDefault(loading, "lazy"),
        classes,
      ),
    );
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
      const template = document.createElement("template");
      template.innerHTML = cachedHtml;
      return template.content.firstChild;
    }
  }
  // Handle external URLs - just return a simple img tag without processing
  const imageNameStr = imageName.toString();
  if (
    imageNameStr.startsWith("http://") ||
    imageNameStr.startsWith("https://")
  ) {
    const classAttr = classes ? ` class="${classes}"` : "";
    const html = `<img src="${imageNameStr}" alt="${alt || ""}" loading="${loading || "lazy"}" decoding="async" sizes="auto"${classAttr}>`;

    return returnElement ? htmlToElement(html, document) : html;
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

  const imagePromise = U.makeImagePromise(finalPath, U.getWidths(widths));

  const innerHTML = await U.makeImageHtml(
    imagePromise,
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

  return returnElement ? htmlToElement(html, document) : html;
}

import fastglob from "fast-glob";

const findImageFiles = (pattern = ["src/images/*.jpg"]) => {
  return fastglob.sync(pattern);
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

const configureImages = (eleventyConfig) => {
  const imageFiles = findImageFiles();

  // Add dev server middleware for on-request image transforms
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
  try {
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
  } catch (_error) {
    return "";
  }
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
