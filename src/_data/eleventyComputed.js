import getConfig from "#data/config.js";
import { getFirstValidImage } from "#media/image-frontmatter.js";
import { getPlaceholderForPath } from "#media/thumbnail-placeholder.js";
import { buildGalleryBlocks } from "#utils/block-gallery.js";
import { applyBlockDefaults, collectBlockErrors } from "#utils/block-schema.js";
import {
  languageForUrl,
  pageLocation,
  translationForUrl,
} from "#utils/i18n.js";
import { withNavigationAnchor } from "#utils/navigation-utils.js";
import {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildSocialMeta,
} from "#utils/schema-helper.js";
import { collectItemErrors } from "#utils/validate-item.js";

/**
 * Throw a single error joining the messages when a list is non-empty.
 * @param {unknown[]} messages
 */
const throwIfNotEmpty = (messages) => {
  if (messages.length > 0) throw new Error(messages.join("\n"));
};

export default {
  /**
   * Whether this page should be indexed by Pagefind.
   * True when any of the page's tags appear in config.search_collections,
   * unless the page is marked no_index.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {boolean}
   */
  pagefind_body: (data) => {
    if (data.no_index) return false;
    const collections = data.config?.search_collections;
    if (!collections) return false;
    return (data.tags || []).some((tag) => collections.includes(tag));
  },

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string|undefined} Meta title (explicit only, no fallback to avoid cycle with title)
   */
  meta_title: (data) => data.meta_title,

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string} Description
   */
  description: (data) => data.description || data.meta_description || "",

  /**
   * The language this page is written in, read from its URL prefix (or, for a
   * page with no URL, from where its file sits - see pageLocation). The layout,
   * the head tags, the breadcrumbs and the language switcher read it, so a
   * site with one language gets that language on every page and nothing has to
   * ask whether the site is translated at all.
   *
   * Named `pageLanguage` rather than `language` because a global named
   * `language` shadows the `language` parameter that code-block.html and any
   * other include may take.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").Language|undefined}
   */
  pageLanguage: (data) =>
    languageForUrl(pageLocation(data.page), data.languages || []),

  /**
   * The URLs of this page in every language it has been written in, keyed by
   * language code, or null when it exists in one language only.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {Record<string, string>|null}
   */
  pageTranslation: (data) =>
    translationForUrl(data.page?.url, data.translations || []),

  /**
   * Finds the first valid thumbnail from available images, or returns a
   * placeholder if configured
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {string|null} Valid image path or null
   */
  thumbnail: (data) => {
    const image = getFirstValidImage([data.thumbnail, data.gallery?.[0]]);
    if (image) return image;
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
   * Appends internal_link_suffix to navigation URLs
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
   * @returns {Record<string, unknown>} Open Graph and Twitter metadata
   */
  socialMeta: (data) => buildSocialMeta(data),

  /**
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {import("#lib/types").SchemaOrgMeta|undefined} Schema.org metadata
   */
  meta: (data) => {
    if (data.no_index) return undefined;
    if ((data.tags || []).includes("news")) return buildPostMeta(data);
    if (data.schema_type === "organization") return buildOrganizationMeta(data);
    return buildBaseMeta(data);
  },

  /**
   * Validates blocks and fills their schema defaults. Works for any content
   * with blocks.
   *
   * A page flagged `block_gallery` builds its blocks from the canonical
   * per-type examples instead of frontmatter - see
   * `#utils/block-gallery.js`. A paginated reference page carries its
   * document's pre-built blocks as `doc` - see
   * `#collections/docs-references.js`.
   * @param {import("#lib/types").EleventyComputedData} data - Page data
   * @returns {Promise<Array<Record<string, unknown>>|undefined>} Blocks with defaults applied
   * @throws {Error} If any block contains unknown keys
   */
  blocks: async (data) => {
    const context = ` in ${data.page.inputPath}`;
    const doc = /** @type {{ blocks?: Array<Record<string, unknown>> }} */ (
      data.doc
    );
    const fromGallery = data.block_gallery ? buildGalleryBlocks() : undefined;
    const sourceBlocks = doc?.blocks || fromGallery || data.blocks;
    if (!sourceBlocks) {
      throwIfNotEmpty(collectItemErrors(data, context));
      return sourceBlocks;
    }
    throwIfNotEmpty([
      ...collectItemErrors(data, context),
      ...collectBlockErrors(sourceBlocks, context),
    ]);
    return sourceBlocks.map(applyBlockDefaults);
  },
};
