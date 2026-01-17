import { existsSync } from "node:fs";
import { join } from "node:path";
import getConfig from "#data/config.js";
import contactFormFn from "#data/contact-form.js";
import quoteFieldsFn from "#data/quote-fields.js";
import { getPlaceholderForPath } from "#media/thumbnail-placeholder.js";
import { memoize } from "#utils/memoize.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";

// Memoize the file existence check since the same images are checked repeatedly
const checkImageExists = memoize((fullPath) => existsSync(fullPath));

function isValidImage(imagePath) {
  if (!imagePath || imagePath.trim() === "") return false;
  if (imagePath.indexOf("http") === 0) return true;

  // Remove leading slash and strip "src/" prefix if present
  const relativePath = imagePath.replace(/^\//, "").replace(/^src\//, "");
  const fullPath = join(process.cwd(), "src", relativePath);

  if (checkImageExists(fullPath)) return true;

  throw new Error(`Image file not found: ${fullPath}`);
}

/**
 * @param {Object} data - Page data
 * @param {string[]} [data.tags] - Page tags
 * @param {string} tag - Tag to check for
 * @returns {boolean} Whether data has the given tag
 */
function hasTag(data, tag) {
  return (data.tags || []).includes(tag);
}

/** Returns first valid image from candidates, or null */
const getFirstValidImage = (candidates) =>
  candidates.find(isValidImage) ?? null;

/**
 * Finds the first valid thumbnail from available images, or returns a
 * placeholder if configured
 * @param {Object} data - Page data
 * @returns {string|import("#lib/types").Image|null} Valid image or null
 */
function findValidThumbnail(data) {
  const image = getFirstValidImage([
    data.thumbnail,
    data.gallery?.[0],
    data.header_image,
  ]);
  if (image) return image;
  if (hasTag(data, "reviews")) return null;
  const config = data.config || getConfig();
  return config.placeholder_images
    ? getPlaceholderForPath(data.page.url)
    : null;
}

export default {
  /**
   * @param {Object} data - Page data
   * @returns {string} Header text
   */
  header_text: (data) => data.header_text || data.title,

  /**
   * @param {Object} data - Page data
   * @returns {string} Meta title
   */
  meta_title: (data) => data.meta_title || data.title,

  /**
   * @param {Object} data - Page data
   * @returns {string} Description
   */
  description: (data) =>
    data.description || data.snippet || data.meta_description || "",

  contactForm: () => contactFormFn(),
  quoteFields: () => quoteFieldsFn(),
  thumbnail: findValidThumbnail,

  /**
   * @param {Object} data - Page data
   * @param {import("#lib/types").Faq[]|undefined} data.faqs - Optional FAQs
   * @returns {import("#lib/types").Faq[]} FAQs array (guaranteed non-empty semantically)
   */
  faqs: (data) => data.faqs ?? [],

  /**
   * @param {Object} data - Page data
   * @param {import("#lib/types").Tab[]|undefined} data.tabs - Optional tabs
   * @returns {import("#lib/types").Tab[]} Tabs array (guaranteed non-empty semantically)
   */
  tabs: (data) => data.tabs ?? [],

  /**
   * Adds #content anchor to navigation URLs if config flag is enabled
   * @param {Object} data - Page data
   * @returns {Object|boolean|undefined} Navigation object with optional url anchor
   */
  eleventyNavigation: (data) =>
    withNavigationAnchor(data, data.eleventyNavigation),

  /**
   * @param {Object} data - Page data
   * @returns {Object} Schema.org metadata
   */
  meta: (data) => {
    if (hasTag(data, "products")) return buildProductMeta(data);
    if (hasTag(data, "news")) return buildPostMeta(data);
    if (data.layout === "contact.html") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },
};
