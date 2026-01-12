import { existsSync } from "node:fs";
import { join } from "node:path";
import contactFormFn from "#data/contact-form.js";
import quoteFieldsFn from "#data/quote-fields.js";
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
 * @param {string|string[]} [data.tags] - Page tags
 * @param {string} tag - Tag to check for
 * @returns {boolean} Whether data has the given tag
 */
function hasTag(data, tag) {
  const tags = data.tags || [];
  return Array.isArray(tags) ? tags.includes(tag) : tags === tag;
}

/**
 * Finds the first valid thumbnail from available images
 * @param {Object} data - Page data
 * @param {string|import("#lib/types").Image} [data.thumbnail] - Thumbnail image
 * @param {Array} [data.gallery] - Gallery images
 * @param {string|import("#lib/types").Image} [data.header_image] - Header image
 * @returns {string|import("#lib/types").Image|null} Valid image or null
 */
function findValidThumbnail(data) {
  if (isValidImage(data.thumbnail)) return data.thumbnail;
  if (data.gallery?.[0] && isValidImage(data.gallery[0]))
    return data.gallery[0];
  if (isValidImage(data.header_image)) return data.header_image;
  return null;
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
    if (hasTag(data, "product")) return buildProductMeta(data);
    if (hasTag(data, "news")) return buildPostMeta(data);
    if (data.layout === "contact.html") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },
};
