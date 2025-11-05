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
  const baseMeta = data.meta || {};

  const meta = {
    ...baseMeta,
    url: `${data.site.url}${data.page.url}`,
    title: data.title || data.meta_title || "Untitled",
    description: data.meta_description || data.short_description,
  };

  let imageSource = data.header_image || data.image || null;

  if (imageSource) {
    const imageUrl = buildImageUrl(imageSource, data.site.url);
    if (imageUrl) {
      meta.image = { src: imageUrl };
    }
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
      priceValidUntil: validUntil.toISOString().split("T")[0]
    };
  }

  // Add reviews if available
  if (data.collections && data.collections.reviews) {
    const productSlug = data.page.fileSlug;
    const productReviews = data.collections.reviews.filter(
      review => review.data.products?.includes(productSlug)
    );

    if (productReviews.length > 0) {
      meta.reviews = productReviews.map(review => ({
        author: {
          name: review.data.name
        },
        reviewBody: review.templateContent || "",
        reviewRating: {
          ratingValue: review.data.rating || 5,
          bestRating: 5
        },
        datePublished: review.date ? review.date.toISOString().split("T")[0] : undefined
      }));

      // Calculate aggregate rating
      const ratings = productReviews.map(r => r.data.rating || 5);
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      meta.rating = {
        ratingValue: avgRating.toFixed(1),
        reviewCount: productReviews.length,
        bestRating: 5,
        worstRating: 1
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

  if (data.meta && data.meta.organization) {
    meta.organization = data.meta.organization;
  }

  return meta;
}

export {
  buildImageUrl,
  buildBaseMeta,
  buildProductMeta,
  buildPostMeta,
  buildOrganizationMeta,
};
