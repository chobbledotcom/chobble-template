import { getReviewsFor } from "#collections/reviews.js";
import { canonicalUrl } from "#utils/canonical-url.js";

const toDateString = (date) => date.toISOString().split("T")[0];

function buildImageUrl(imageInput, siteUrl) {
  if (!imageInput) return null;

  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    return imageInput;
  }

  if (imageInput.startsWith("/")) {
    return `${siteUrl}${imageInput}`;
  }

  return `${siteUrl}/images/${imageInput}`;
}

function buildBaseMeta(data) {
  const baseMeta = data.metaComputed || {};

  const meta = {
    ...baseMeta,
    url: canonicalUrl(data.page.url),
    title: data.title || data.meta_title || "Untitled",
    description: data.meta_description || data.subtitle,
  };

  const imageSource = data.header_image || data.image || null;

  if (imageSource) {
    const imageUrl = buildImageUrl(imageSource, data.site.url);
    if (imageUrl) {
      meta.image = { src: imageUrl };
    }
  }

  if (data.faqs?.length > 0) {
    meta.faq = data.faqs;
  }

  return meta;
}

function buildOffers(price) {
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  return {
    price: price.toString().replace(/[£€$,]/g, ""),
    priceCurrency: "GBP",
    availability: "https://schema.org/InStock",
    priceValidUntil: toDateString(validUntil),
  };
}

function formatReview(review) {
  const reviewData = {
    author: review.data.name,
    rating: review.data.rating || 5,
  };
  if (review.date) {
    reviewData.date = toDateString(review.date);
  }
  return reviewData;
}

function buildRating(reviews) {
  const ratings = reviews.map((r) => r.data.rating || 5);
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  return {
    ratingValue: avg.toFixed(1),
    reviewCount: reviews.length,
    bestRating: 5,
    worstRating: 1,
  };
}

function buildProductMeta(data) {
  const meta = buildBaseMeta(data);
  meta.name = data.title;
  meta.brand = data.site.name;

  if (data.price) {
    meta.offers = buildOffers(data.price);
  }

  if (data.collections?.reviews && data.reviewsField) {
    const reviews = getReviewsFor(
      data.collections.reviews,
      data.page.fileSlug,
      data.reviewsField,
    );

    if (reviews.length > 0) {
      meta.reviews = reviews.map(formatReview);
      meta.rating = buildRating(reviews);
    }
  }

  return meta;
}

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
