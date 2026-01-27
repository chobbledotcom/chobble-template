/**
 * YouTube thumbnail processing - fetches and optimizes YouTube thumbnails.
 *
 * Uses eleventy-img to download and process YouTube thumbnails at build time,
 * creating optimized webp versions with LQIP for lazy loading.
 *
 * YouTube thumbnail URLs:
 * - hqdefault.jpg: 480x360, always available
 * - maxresdefault.jpg: 1280x720, may not exist for older videos
 */

import {
  extractLqipFromMetadata,
  getEleventyImg,
  LQIP_WIDTH,
} from "#media/image-lqip.js";
import {
  filenameFormat,
  IMAGE_OUTPUT_DIR,
  IMAGE_URL_PATH,
} from "#media/image-utils.js";
import { jsonKey, memoize } from "#toolkit/fp/memoize.js";
import { createHtml } from "#utils/dom-builder.js";

const PLACEHOLDER_MODE = process.env.PLACEHOLDER_IMAGES === "1";

/**
 * Get YouTube thumbnail URL for a video ID.
 * Uses hqdefault which is always available.
 * @param {string} videoId - YouTube video ID
 * @returns {string} Thumbnail URL
 */
const getYoutubeThumbnailUrl = (videoId) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/**
 * Create fallback thumbnail data when build-time fetch fails.
 * Uses the YouTube URL directly so it loads at runtime.
 * @param {string} videoId - YouTube video ID
 * @returns {{src: string, srcset: string | null, lqip: string | null, width: number, height: number}}
 */
const createFallbackThumbnail = (videoId) => ({
  src: getYoutubeThumbnailUrl(videoId),
  srcset: null,
  lqip: null,
  width: 480,
  height: 360,
});

/**
 * Process a YouTube thumbnail and return image data.
 * Falls back to runtime-loaded thumbnail if build-time fetch fails.
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<{src: string, srcset: string | null, lqip: string | null, width: number, height: number}>}
 */
const processYoutubeThumbnail = memoize(
  async (videoId) => {
    if (PLACEHOLDER_MODE) {
      return createFallbackThumbnail(videoId);
    }

    const thumbnailUrl = getYoutubeThumbnailUrl(videoId);
    const { default: Image } = await getEleventyImg();

    // Fetch thumbnail - returns null on network failure (allowed for external APIs)
    const metadata = await Image(thumbnailUrl, {
      outputDir: IMAGE_OUTPUT_DIR,
      urlPath: IMAGE_URL_PATH,
      filenameFormat,
      formats: ["webp"],
      widths: [LQIP_WIDTH, 480, 720],
    }).catch(() => null);

    // Check if fetch succeeded (returns null on failure, or empty webp array)
    if (!metadata?.webp?.length) {
      return createFallbackThumbnail(videoId);
    }

    const lqip = extractLqipFromMetadata(metadata);
    const mainImage = metadata.webp.find((img) => img.width !== LQIP_WIDTH);

    return {
      src: mainImage.url,
      srcset: metadata.webp
        .filter((img) => img.width !== LQIP_WIDTH)
        .map((img) => `${img.url} ${img.width}w`)
        .join(", "),
      lqip,
      width: mainImage.width,
      height: mainImage.height,
    };
  },
  { cacheKey: jsonKey },
);

/**
 * YouTube thumbnail shortcode - generates lazy-loaded thumbnail HTML.
 *
 * @param {string} videoId - YouTube video ID
 * @param {string} title - Video title for alt text
 * @returns {Promise<string>} HTML for the thumbnail
 */
const youtubeThumbnailShortcode = async (videoId, title) => {
  const { src, srcset, lqip, width, height } =
    await processYoutubeThumbnail(videoId);

  const wrapperStyle = lqip
    ? `background-image: ${lqip}; background-size: cover;`
    : "";

  const imgHtml = await createHtml("img", {
    src,
    ...(srcset && { srcset, sizes: "(max-width: 720px) 100vw, 720px" }),
    width: String(width),
    height: String(height),
    alt: title,
    loading: "lazy",
    decoding: "async",
  });

  return createHtml(
    "div",
    { class: "video-thumbnail-wrapper", style: wrapperStyle },
    imgHtml,
  );
};

/**
 * Configure YouTube thumbnail shortcode for Eleventy.
 * @param {Object} eleventyConfig - Eleventy config object
 */
const configureYoutubeThumbnail = (eleventyConfig) => {
  eleventyConfig.addAsyncShortcode(
    "youtubeThumbnail",
    youtubeThumbnailShortcode,
  );
};

export {
  configureYoutubeThumbnail,
  processYoutubeThumbnail,
  youtubeThumbnailShortcode,
  getYoutubeThumbnailUrl,
};
