import { getReviewsByProduct } from "#collections/products.js";
import { canonicalUrl } from "#utils/canonical-url.js";

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

function buildProductMeta(data) {
  const meta = buildBaseMeta(data);

  meta.name = data.title;
  meta.brand = data.site.name;

  if (data.price) {
    // Calculate priceValidUntil (1 year from now)
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    meta.offers = {
      price: data.price.toString().replace(/[£€$,]/g, ""),
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      priceValidUntil: validUntil.toISOString().split("T")[0],
    };
  }

  // Add reviews if available (uses memoized getReviewsByProduct)
  if (data.collections && data.collections.reviews) {
    const productSlug = data.page.fileSlug;
    const productReviews = getReviewsByProduct(
      data.collections.reviews,
      productSlug,
    );

    if (productReviews.length > 0) {
      meta.reviews = productReviews.map((review) => {
        const reviewData = {
          author: review.data.name,
          rating: review.data.rating || 5,
        };

        if (review.date) {
          reviewData.date = review.date.toISOString().split("T")[0];
        }

        return reviewData;
      });

      // Calculate aggregate rating
      const ratings = productReviews.map((r) => r.data.rating || 5);
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      meta.rating = {
        ratingValue: avgRating.toFixed(1),
        reviewCount: productReviews.length,
        bestRating: 5,
        worstRating: 1,
      };
    }
  }

  return meta;
}

function buildPostMeta(data) {
  const meta = buildBaseMeta(data);

  if (data.page.date) {
    meta.datePublished = data.page.date.toISOString().split("T")[0];
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

  if (data.metaComputed && data.metaComputed.organization) {
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
