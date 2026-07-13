import { getReviewsFor } from "#collections/reviews.js";
import getConfig from "#data/config.js";
import { normalizeImageUrl } from "#media/image-utils.js";
import { canonicalUrl } from "#utils/canonical-url.js";
import { isAmbiguousPrice } from "#utils/price-utils.js";

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
 * @typedef {Object} ProductPageData
 * @property {string} [name] - Product name
 * @property {string | number} [price] - Product price
 * @property {SiteInfo} site - Site information
 * @property {PageInfo} page - Page information
 * @property {string[]} [tags] - Item tags (used to derive reviews field)
 * @property {Array<{unit_price: string | number}>} [options] - Product options
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
 * @property {string} [brand] - Brand name
 * @property {Record<string, unknown>} [offers] - Offer data
 * @property {Record<string, unknown>[]} [reviews] - Review data
 * @property {Record<string, unknown>} [rating] - Rating data
 * @property {string} [published] - Published date
 * @property {Record<string, unknown>} [author] - Author info
 * @property {Record<string, unknown>} [organization] - Organization info
 */

/**
 * Convert a Date to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date to convert
 * @returns {string} ISO date string
 */
const toDateString = (date) => date.toISOString().split("T")[0];

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
  return new URL(normalizeImageUrl(src), `${data.site.url}/`).href;
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
    type: data.tags?.includes("news")
      ? "article"
      : data.tags?.includes("products")
        ? "product"
        : "website",
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

/** @param {number} price */
const positiveFinitePrice = (price) =>
  Number.isFinite(price) && price > 0 ? price : null;

/** @param {string | number | null | undefined} price */
const parseOfferPrice = (price) => {
  const normalized =
    typeof price === "string" ? price.replaceAll(",", "") : price;
  if (isAmbiguousPrice(normalized)) return null;
  if (typeof price === "number") return positiveFinitePrice(price);
  const match = price ? String(normalized).match(/\d+(?:\.\d+)?/) : null;
  return positiveFinitePrice(match ? Number(match[0]) : Number.NaN);
};

/**
 * Build schema.org metadata for a product page
 * @param {BasePageData & ProductPageData} data - Product page data
 * @returns {SchemaOrgMeta} Schema.org product metadata
 */
const buildProductMeta = (data) => {
  const getOfferPrice = () => {
    if (data.price !== undefined && data.price !== null && data.price !== "")
      return parseOfferPrice(data.price);
    if (!Array.isArray(data.options)) return null;
    const prices = data.options
      .map((option) => parseOfferPrice(option.unit_price))
      .filter((price) => price !== null);
    return prices.length > 0 ? Math.min(...prices) : null;
  };
  const buildPriceValidUntil = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return toDateString(date);
  };

  const buildOffers = (price) => ({
    price,
    priceCurrency: getConfig().currency,
    availability: "https://schema.org/InStock",
    priceValidUntil: buildPriceValidUntil(),
  });

  const buildReview = (review) => ({
    author: review.data.name,
    rating: review.data.rating,
    ...(review.date && { date: toDateString(review.date) }),
  });

  const buildRating = (reviews) => {
    const ratings = reviews.map((r) => r.data.rating);
    const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return {
      ratingValue: avg.toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
  };

  const buildReviewsMeta = () => {
    if (!data.collections?.reviews || !data.tags) return {};

    const reviews = getReviewsFor(
      data.collections.reviews,
      data.page.fileSlug,
      data.tags,
    );

    if (reviews.length === 0) return {};

    return {
      reviews: reviews.map(buildReview),
      rating: buildRating(reviews),
    };
  };

  const price = getOfferPrice();
  return {
    ...buildBaseMeta(data),
    name: data.name,
    brand: data.site.name,
    ...(price !== null && { offers: buildOffers(price) }),
    ...buildReviewsMeta(),
  };
};

/**
 * Build schema.org metadata for a blog post
 * @param {BasePageData & PostPageData} data - Post page data
 * @returns {SchemaOrgMeta} Schema.org post metadata
 */
const buildPostMeta = (data) => {
  return {
    ...buildBaseMeta(data),
    ...(data.page.date && { published: toDateString(data.page.date) }),
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

export {
  buildBaseMeta,
  buildOrganizationMeta,
  buildPostMeta,
  buildProductMeta,
  buildSocialMeta,
};
