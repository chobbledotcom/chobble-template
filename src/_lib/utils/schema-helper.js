import { getReviewsFor } from "#collections/reviews.js";
import { canonicalUrl } from "#utils/canonical-url.js";

const toDateString = (date) => date.toISOString().split("T")[0];

/**
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
 * @param {Object} data - Page data object
 * @param {string|import("#lib/types").Image|undefined} data.header_image - Optional header image
 * @param {string|import("#lib/types").Image|undefined} data.image - Optional image
 * @param {import("#lib/types").Faq[]|undefined} data.faqs - Optional FAQs array
 * @param {Object} data.site - Site configuration
 * @param {string} data.site.url - Site URL
 * @param {Object} data.page - Page metadata
 * @param {string} data.page.url - Page URL
 * @param {string} data.title - Page title
 * @param {string} [data.meta_title] - Optional meta title
 * @param {string} [data.meta_description] - Optional meta description
 * @param {string} [data.subtitle] - Optional subtitle
 * @param {Object} [data.metaComputed] - Optional computed metadata
 * @returns {Object} Schema.org metadata object
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
 * @param {Object} data - Product page data
 * @returns {Object} Schema.org product metadata
 */
function buildProductMeta(data) {
  const meta = buildBaseMeta(data);
  meta.name = data.title;
  meta.brand = data.site.name;

  if (data.price) {
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    meta.offers = {
      price: data.price.toString().replace(/[£€$,]/g, ""),
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      priceValidUntil: toDateString(validUntil),
    };
  }

  if (data.collections?.reviews && data.reviewsField) {
    const reviews = getReviewsFor(
      data.collections.reviews,
      data.page.fileSlug,
      data.reviewsField,
    );

    if (reviews.length > 0) {
      meta.reviews = reviews.map((review) => {
        const reviewData = {
          author: review.data.name,
          rating: review.data.rating || 5,
        };
        if (review.date) {
          reviewData.date = toDateString(review.date);
        }
        return reviewData;
      });

      const ratings = reviews.map((r) => r.data.rating || 5);
      const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      meta.rating = {
        ratingValue: avg.toFixed(1),
        reviewCount: reviews.length,
        bestRating: 5,
        worstRating: 1,
      };
    }
  }

  return meta;
}

/**
 * @param {Object} data - Post page data
 * @returns {Object} Schema.org post metadata
 */
function buildPostMeta(data) {
  const meta = buildBaseMeta(data);

  if (data.page.date) {
    meta.datePublished = toDateString(data.page.date);
  }

  meta.author = {
    name: data.author || data.site.name,
  };

  meta.publisher = {
    name: data.site.name,
    logo: {
      src: buildImageUrl(data.site.logo || "/images/logo.png", data.site.url),
      width: 512,
      height: 512,
    },
  };

  return meta;
}

/**
 * @param {Object} data - Organization page data
 * @param {Object} [data.metaComputed] - Computed metadata with organization schema
 * @param {import("#lib/types").Organization} [data.metaComputed.organization] - Organization metadata
 * @returns {Object} Schema.org organization metadata
 */
function buildOrganizationMeta(data) {
  const meta = buildBaseMeta(data);

  if (data.metaComputed?.organization) {
    meta.organization = data.metaComputed.organization;
  }

  return meta;
}

export {
  buildBaseMeta,
  buildProductMeta,
  buildPostMeta,
  buildOrganizationMeta,
};
