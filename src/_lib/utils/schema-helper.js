import { getReviewsFor } from "#collections/reviews.js";
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
 * @property {string} [header_image] - Header image path
 * @property {string} [image] - Image path
 * @property {SiteInfo} site - Site information
 * @property {PageInfo} page - Page information
 * @property {string} [title] - Page title
 * @property {string} [meta_title] - Meta title
 * @property {string} [meta_description] - Meta description
 * @property {string} [subtitle] - Page subtitle
 * @property {FAQ[]} [faqs] - FAQ items
 * @property {Record<string, unknown>} [metaComputed] - Computed metadata
 */

/**
 * @typedef {Object} ProductPageData
 * @property {string} [title] - Product title
 * @property {string | number} [price] - Product price
 * @property {SiteInfo} site - Site information
 * @property {PageInfo} page - Page information
 * @property {string} [reviewsField] - Field name for reviews lookup
 * @property {{ reviews: import("#lib/types").EleventyCollectionItem[] }} [collections] - Collections data
 */

/**
 * @typedef {Object} PostPageData
 * @property {PageInfo} page - Page information
 * @property {string} [title] - Post title
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
 * @property {string} [datePublished] - Published date
 * @property {Record<string, unknown>} [author] - Author info
 * @property {Record<string, unknown>} [publisher] - Publisher info
 * @property {Record<string, unknown>} [organization] - Organization info
 */

/**
 * Convert a Date to ISO date string (YYYY-MM-DD)
 * @param {Date} date - Date to convert
 * @returns {string} ISO date string
 */
const toDateString = (date) => date.toISOString().split("T")[0];

/**
 * Build a full image URL from a path
 * @param {string} imageInput - Image path or URL
 * @param {string} siteUrl - Base site URL
 * @returns {string} Full image URL
 */
function buildImageUrl(imageInput, siteUrl) {
  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    return imageInput;
  }

  if (imageInput.startsWith("/")) {
    return `${siteUrl}${imageInput}`;
  }

  return `${siteUrl}/images/${imageInput}`;
}

/**
 * Builds base schema.org metadata from page data
 * @param {BasePageData} data - Page data object
 * @returns {SchemaOrgMeta} Schema.org metadata object
 */
function buildBaseMeta(data) {
  const imageSource = data.header_image || data.image || null;
  const imageUrl = imageSource
    ? buildImageUrl(imageSource, data.site.url)
    : null;

  return {
    ...(data.metaComputed || {}),
    url: canonicalUrl(data.page.url),
    title: data.title || data.meta_title || "Untitled",
    description: data.meta_description || data.subtitle,
    ...(imageUrl && { image: { src: imageUrl } }),
    ...(data.faqs?.length > 0 && { faq: data.faqs }),
  };
}

/**
 * Build price valid until date (1 year from now)
 * @returns {string} ISO date string
 */
const buildPriceValidUntil = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return toDateString(date);
};

/**
 * Build offers object for a product
 * @param {string | number} price - Product price
 * @returns {Record<string, unknown>} Offers object
 */
const buildOffers = (price) => ({
  price: price.toString().replace(/[£€$,]/g, ""),
  priceCurrency: "GBP",
  availability: "https://schema.org/InStock",
  priceValidUntil: buildPriceValidUntil(),
});

/**
 * Build a single review object
 * @param {{ data: { name: string, rating?: number }, date?: Date }} review
 * @returns {Record<string, unknown>} Review object
 */
const buildReview = (review) => ({
  author: review.data.name,
  rating: review.data.rating || 5,
  ...(review.date && { date: toDateString(review.date) }),
});

/**
 * Calculate average rating from reviews
 * @param {Array<{ data: { rating?: number } }>} reviews
 * @returns {number} Average rating
 */
const calculateAverageRating = (reviews) => {
  const ratings = reviews.map((r) => r.data.rating || 5);
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
};

/**
 * Build rating object from reviews
 * @param {Array<{ data: { rating?: number } }>} reviews
 * @returns {Record<string, unknown>} Rating object
 */
const buildRating = (reviews) => ({
  ratingValue: calculateAverageRating(reviews).toFixed(1),
  reviewCount: reviews.length,
  bestRating: 5,
  worstRating: 1,
});

/**
 * Build reviews and rating metadata from product data
 * @param {BasePageData & ProductPageData} data - Product page data
 * @returns {Record<string, unknown>} Reviews and rating metadata (or empty object)
 */
const buildReviewsMeta = (data) => {
  if (!data.collections?.reviews || !data.reviewsField) return {};

  const reviews = getReviewsFor(
    data.collections.reviews,
    data.page.fileSlug,
    data.reviewsField,
  );

  if (reviews.length === 0) return {};

  return {
    reviews: reviews.map(buildReview),
    rating: buildRating(reviews),
  };
};

/**
 * Build schema.org metadata for a product page
 * @param {BasePageData & ProductPageData} data - Product page data
 * @returns {SchemaOrgMeta} Schema.org product metadata
 */
const buildProductMeta = (data) => ({
  ...buildBaseMeta(data),
  name: data.title,
  brand: data.site.name,
  ...(data.price && { offers: buildOffers(data.price) }),
  ...buildReviewsMeta(data),
});

/**
 * Build publisher object for a post
 * @param {SiteInfo} site - Site information
 * @returns {Record<string, unknown>} Publisher object
 */
const buildPublisher = (site) => ({
  name: site.name,
  logo: {
    src: buildImageUrl(site.logo || "/images/logo.png", site.url),
    width: 512,
    height: 512,
  },
});

/**
 * Build schema.org metadata for a blog post
 * @param {BasePageData & PostPageData} data - Post page data
 * @returns {SchemaOrgMeta} Schema.org post metadata
 */
const buildPostMeta = (data) => ({
  ...buildBaseMeta(data),
  ...(data.page.date && { datePublished: toDateString(data.page.date) }),
  author: { name: data.author || data.site.name },
  publisher: buildPublisher(data.site),
});

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
  buildProductMeta,
  buildPostMeta,
  buildOrganizationMeta,
};
