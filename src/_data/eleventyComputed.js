import getConfig from "#data/config.js";
import contactFormFn from "#data/contact-form.js";
import quoteFieldsFn from "#data/quote-fields.js";
import { getFirstValidImage } from "#media/image-frontmatter.js";
import { getPlaceholderForPath } from "#media/thumbnail-placeholder.js";
import { validateBlocks } from "#utils/block-schema.js";
import { getFilterAttributes } from "#utils/mock-filter-attributes.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
} from "#utils/schema-helper.js";
import { slugify } from "#utils/slug-utils.js";
import { getVideoThumbnailUrl } from "#utils/video.js";

/**
 * @param {import("#lib/types").EleventyComputedData} data - Page data
 * @param {string} tag - Tag to check for
 * @returns {boolean} Whether data has the given tag
 */
const hasTag = (data, tag) => (data.tags || []).includes(tag);

/**
 * Default values for block types. Applied at build time so templates
 * don't need to handle defaults.
 * @type {Record<string, Record<string, unknown>>}
 */
const BLOCK_DEFAULTS = {
  features: { reveal: true, heading_level: 3, grid_class: "features" },
  stats: { reveal: true },
  split: { title_level: 2, reveal_figure: "scale" },
  "section-header": { level: 2, align: "center" },
  "image-cards": { reveal: true, heading_level: 3 },
  "code-block": { reveal: true },
  "video-background": { aspect_ratio: "16/9" },
};

export default {
  /**
   * Whether this page should be indexed by Pagefind.
   * True when any of the page's tags appear in config.search_collections.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {boolean}
   */
  pagefind_body: (data) => {
    const collections = data.config?.search_collections;
    if (!collections) return false;
    return (data.tags || []).some((tag) => collections.includes(tag));
  },

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

  /**
   * Override filter_attributes with mock values in FAST_INACCURATE_BUILDS mode.
   * Only applies to items that have filter_attributes defined (products, properties).
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {Array<{name: string, value: string}>|undefined} Filter attributes
   */
  filter_attributes: (data) =>
    getFilterAttributes(data.filter_attributes, data.page.inputPath),

  /**
   * Pre-computed filter data for client-side filtering.
   * Only computed for products. Uses .filter(Boolean) before .map() because
   * Eleventy's ComputedDataProxy wraps arrays as sparse `new Array(N)` —
   * .map() preserves holes causing Object.fromEntries to fail, while
   * .filter(Boolean) materializes the proxy into a real empty array.
   * @param {import("#lib/types").ProductItemData & import("#lib/types").EleventyComputedData} data - Page data (products only)
   * @returns {{ title: string, price: number, filters: Record<string, string> }|undefined}
   */
  filter_data: (data) => {
    if (!hasTag(data, "products")) return undefined;
    return {
      title: data.title.toLowerCase(),
      price: Math.min(...data.options.map((o) => o.unit_price)),
      filters: Object.fromEntries(
        data.filter_attributes
          .filter(Boolean)
          .map((attr) => [slugify(attr.name), slugify(attr.value)]),
      ),
    };
  },

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
    if (!config.placeholder_images) return null;
    const url = data.page?.url;
    if (typeof url !== "string") return null;
    return getPlaceholderForPath(url);
  },

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {number} Sort order (9999 if not defined, sorts last)
   */
  order: (data) => data.order ?? 9999,

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").Faq[]} FAQs array (empty if not defined)
   */
  faqs: (data) => data.faqs ?? [],

  /**
   * Ensures tabs array exists and each tab has a body string (defaults to empty).
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").Tab[]} Tabs array with guaranteed body strings
   */
  tabs: (data) =>
    Array.isArray(data.tabs)
      ? data.tabs.map((tab) => ({ ...tab, body: tab.body ?? "" }))
      : [],

  /**
   * Adds #content anchor to navigation URLs if config flag is enabled
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").EleventyNav | false | undefined} Navigation object with optional url anchor
   */
  eleventyNavigation: (data) =>
    withNavigationAnchor(data, data.eleventyNavigation),

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {Record<string, unknown>} Computed metadata (empty object if not defined)
   */
  metaComputed: (data) => {
    if (data.no_index) return {};
    return data.metaComputed ?? {};
  },

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").SchemaOrgMeta|undefined} Schema.org metadata
   */
  meta: (data) => {
    if (data.no_index) return undefined;
    if (hasTag(data, "products")) return buildProductMeta(data);
    if (hasTag(data, "news")) return buildPostMeta(data);
    if (data.layout === "contact.html") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },

  /**
   * Validates and applies default values to blocks. Works for any content
   * with blocks.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {Array<Record<string, unknown>>|undefined} Blocks with defaults applied
   * @throws {Error} If any block contains unknown keys
   */
  blocks: (data) => {
    if (!data.blocks) return data.blocks;
    validateBlocks(data.blocks, ` in ${data.page.inputPath}`);
    return data.blocks.map((block) => {
      const blockType = String(block.type);
      const merged = Object.assign(
        { section_class: "" },
        BLOCK_DEFAULTS[blockType],
        block,
      );
      if (blockType === "split" && !block.reveal_content) {
        merged.reveal_content = block.reverse ? "right" : "left";
      }
      return merged;
    });
  },

  /**
   * Adds thumbnail_url to each video object. YouTube videos get a static
   * thumbnail URL, Vimeo videos get one via the oEmbed API, and other custom
   * iframe URLs get null.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {Promise<Array<Record<string, unknown>>>|undefined} Videos with thumbnail_url added
   */
  videos: async (data) => {
    if (!data.videos) return data.videos;
    return Promise.all(
      data.videos.map(async (video) => ({
        ...video,
        thumbnail_url: await getVideoThumbnailUrl(video.id),
      })),
    );
  },
};
