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
 * @property {string} title - Page title (required - computed for pages, explicit for collections)
 * @property {string} [meta_description] - Meta description
 * @property {string} [subtitle] - Page subtitle
 * @property {FAQ[]} [faqs] - FAQ items
 * @property {Record<string, unknown>} [metaComputed] - Computed metadata
 */

/** @typedef {"products" | "categories" | "properties"} ReviewIndexField */

/**
 * @typedef {Object} ProductPageData
 * @property {string} [title] - Product title
 * @property {string | number} [price] - Product price
 * @property {SiteInfo} site - Site information
 * @property {PageInfo} page - Page information
 * @property {ReviewIndexField} [reviewsField] - Field name for reviews lookup
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
 * Builds base schema.org metadata from page data.
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
    title: data.title,
    description: data.meta_description || data.subtitle,
    ...(imageUrl && { image: { src: imageUrl } }),
    ...(data.faqs?.length > 0 && { faq: data.faqs }),
  };
}

/**
 * Build schema.org metadata for a product page
 * @param {BasePageData & ProductPageData} data - Product page data
 * @returns {SchemaOrgMeta} Schema.org product metadata
 */
const buildProductMeta = (data) => {
  const buildPriceValidUntil = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return toDateString(date);
  };

  const buildOffers = (price) => ({
    price: price.toString().replace(/[£€$,]/g, ""),
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
    priceValidUntil: buildPriceValidUntil(),
  });

  const buildReview = (review) => ({
    author: review.data.name,
    rating: review.data.rating || 5,
    ...(review.date && { date: toDateString(review.date) }),
  });

  const buildRating = (reviews) => {
    const ratings = reviews.map((r) => r.data.rating || 5);
    const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return {
      ratingValue: avg.toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
  };

  const buildReviewsMeta = () => {
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

  return {
    ...buildBaseMeta(data),
    name: data.title,
    brand: data.site.name,
    ...(data.price && { offers: buildOffers(data.price) }),
    ...buildReviewsMeta(),
  };
};

/**
 * Build schema.org metadata for a blog post
 * @param {BasePageData & PostPageData} data - Post page data
 * @returns {SchemaOrgMeta} Schema.org post metadata
 */
const buildPostMeta = (data) => {
  const buildPublisher = (site) => ({
    name: site.name,
    logo: {
      src: buildImageUrl(site.logo || "/images/logo.png", site.url),
      width: 512,
      height: 512,
    },
  });

  return {
    ...buildBaseMeta(data),
    ...(data.page.date && { datePublished: toDateString(data.page.date) }),
    author: { name: data.author || data.site.name },
    publisher: buildPublisher(data.site),
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
  buildProductMeta,
  buildPostMeta,
  buildOrganizationMeta,
};
