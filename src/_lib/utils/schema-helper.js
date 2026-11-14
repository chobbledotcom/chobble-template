import { normalizeImageUrl } from "#media/image-utils.js";
import { canonicalUrl } from "#utils/canonical-url.js";

/**
 * @typedef {Object} SiteInfo
 * @property {string} url - Base site URL
 * @property {string} name - Site name
 * @property {string} [logo] - Site logo path
 */

/**
 * @typedef {Object} PageInfo
 * @property {string} url - Page URL path
 * @property {string} fileSlug - File slug
 * @property {Date} [date] - Page date
 */

/**
 * @typedef {Object} FAQ
 * @property {string} question - FAQ question
 * @property {string} answer - FAQ answer
 */

/**
 * @typedef {Object} BasePageData
 * @property {string | {src: string}} [image] - Image path
 * @property {string} [thumbnail] - Computed thumbnail path
 * @property {string[]} [gallery] - Gallery image paths
 * @property {SiteInfo} site - Site information
 * @property {PageInfo} page - Page information
 * @property {string} name - Page name (required - computed for pages, explicit for collections)
 * @property {string} [title] - Legacy page title
 * @property {string} [meta_title] - Search/social title
 * @property {string} [description] - Page description
 * @property {string} [meta_description] - Meta description
 * @property {string} [subtitle] - Page subtitle
 * @property {FAQ[]} [faqs] - FAQ items
 * @property {string[]} [tags] - Collection tags
 * @property {Array<{type: string, image?: string, items?: FAQ[]}>} [blocks] - Content blocks
 * @property {Record<string, import("#lib/types").EleventyCollectionItem[]>} [collections] - Collections data
 * @property {Record<string, unknown>} [metaComputed] - Computed metadata
 */

/**
 * @typedef {Object} PostPageData
 * @property {PageInfo} page - Page information
 * @property {string} [name] - Post name
 * @property {string} [author] - Post author
 * @property {SiteInfo} site - Site information
 */

/**
 * @typedef {Object} OrganizationPageData
 * @property {{ organization?: Record<string, unknown> }} [metaComputed] - Computed metadata including organization
 */

/**
 * @typedef {Object} SchemaOrgMeta
 * @property {string} [url] - Canonical URL
 * @property {string} [title] - Title
 * @property {string} [description] - Description
 * @property {{ src: string }} [image] - Image info
 * @property {FAQ[]} [faq] - FAQ items
 * @property {string} [name] - Name
 * @property {string} [published] - Published date
 * @property {Record<string, unknown>} [author] - Author info
 * @property {Record<string, unknown>} [organization] - Organization info
 */

/** @param {BasePageData} data */
const getPageImageUrl = (data) => {
  const getHeroImage = () => {
    if (!Array.isArray(data.blocks)) return null;
    const hero = data.blocks.find(
      (block) =>
        ["hero", "image-background"].includes(block.type) && block.image,
    );
    return hero ? hero.image : null;
  };
  const image =
    data.image || data.thumbnail || data.gallery?.[0] || getHeroImage();
  if (!image) return null;
  const src = typeof image === "string" ? image : image.src;
  if (src.startsWith("data:")) return null;
  const imageUrl = normalizeImageUrl(src);
  const relativeImageUrl =
    imageUrl.startsWith("/") && !imageUrl.startsWith("//")
      ? imageUrl.slice(1)
      : imageUrl;
  return new URL(relativeImageUrl, `${data.site.url}/`).href;
};

/** @param {BasePageData} data */
const getDescription = (data) =>
  data.meta_description || data.subtitle || data.description;

/**
 * Build metadata used by the shared HTML head.
 * @param {BasePageData & {tags?: string[]}} data - Page data
 * @returns {{title: string|undefined, description?: string, url: string, image?: string, type: string}}
 */
const buildSocialMeta = (data) => {
  const image = getPageImageUrl(data);
  return {
    title: data.meta_title || data.name || data.title,
    description: getDescription(data),
    url: canonicalUrl(data.page.url),
    ...(image && { image }),
    type: data.tags?.includes("news") ? "article" : "website",
  };
};

/**
 * Builds base schema.org metadata from page data.
 * @param {BasePageData} data - Page data object
 * @returns {SchemaOrgMeta} Schema.org metadata object
 */
function buildBaseMeta(data) {
  const getFaqs = () => {
    const pageFaqs = Array.isArray(data.faqs) ? data.faqs : [];
    if (!Array.isArray(data.blocks)) return pageFaqs;
    const faqBlocks = data.blocks.filter((block) => block.type === "faqs");
    if (faqBlocks.length === 0) return pageFaqs;
    const faqs = faqBlocks.flatMap((block) =>
      Array.isArray(block.items) && block.items.length > 0
        ? block.items
        : pageFaqs,
    );
    return [
      ...new Map(
        faqs.map((faq) => [`${faq.question}\0${faq.answer}`, faq]),
      ).values(),
    ];
  };
  const imageUrl = getPageImageUrl(data);
  const faqs = getFaqs();

  return {
    ...data.metaComputed,
    url: canonicalUrl(data.page.url),
    title: data.name || data.title || data.meta_title,
    description: getDescription(data),
    ...(imageUrl && { image: { src: imageUrl } }),
    ...(faqs.length > 0 && { faq: faqs }),
  };
}

/**
 * Build schema.org metadata for a blog post
 * @param {BasePageData & PostPageData} data - Post page data
 * @returns {SchemaOrgMeta} Schema.org post metadata
 */
const buildPostMeta = (data) => {
  return {
    ...buildBaseMeta(data),
    ...(data.page.date && {
      published: data.page.date.toISOString().split("T")[0],
    }),
    author: { name: data.author || data.site.name },
  };
};

/**
 * Build schema.org metadata for an organization page
 * @param {BasePageData & OrganizationPageData} data - Organization page data
 * @returns {SchemaOrgMeta} Schema.org organization metadata
 */
const buildOrganizationMeta = (data) => ({
  ...buildBaseMeta(data),
  ...(data.metaComputed?.organization && {
    organization: data.metaComputed.organization,
  }),
});

export { buildBaseMeta, buildOrganizationMeta, buildPostMeta, buildSocialMeta };
