import getConfig from "#data/config.js";
import contactFormFn from "#data/contact-form.js";
import quoteFieldsFn from "#data/quote-fields.js";
import { getFirstValidImage } from "#media/image-frontmatter.js";
import { getPlaceholderForPath } from "#media/thumbnail-placeholder.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";

/**
 * @param {import("#lib/types").EleventyComputedData} data - Page data
 * @param {string} tag - Tag to check for
 * @returns {boolean} Whether data has the given tag
 */
const hasTag = (data, tag) => (data.tags || []).includes(tag);

export default {
  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string} Header text
   */
  header_text: (data) => data.header_text || data.title,

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string|undefined} Meta title (explicit only, no fallback to avoid cycle with title)
   */
  meta_title: (data) => data.meta_title,

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string} Description
   */
  description: (data) =>
    data.description || data.snippet || data.meta_description || "",

  contactForm: () => contactFormFn(),
  quoteFields: () => quoteFieldsFn(),

  /**
   * Finds the first valid thumbnail from available images, or returns a
   * placeholder if configured
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string|null} Valid image path or null
   */
  thumbnail: (data) => {
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
  },

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").Faq[]} FAQs array (empty if not defined)
   */
  faqs: (data) => data.faqs ?? [],

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").Tab[]} Tabs array (empty if not defined)
   */
  tabs: (data) => data.tabs ?? [],

  /**
   * Adds #content anchor to navigation URLs if config flag is enabled
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").EleventyNav|boolean|undefined} Navigation object with optional url anchor
   */
  eleventyNavigation: (data) =>
    withNavigationAnchor(data, data.eleventyNavigation),

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").SchemaOrgMeta} Schema.org metadata
   */
  meta: (data) => {
    if (hasTag(data, "products")) return buildProductMeta(data);
    if (hasTag(data, "news")) return buildPostMeta(data);
    if (data.layout === "contact.html") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },
};
