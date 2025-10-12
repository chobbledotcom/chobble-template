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

  const autoHeaderImage = data.config?.autoHeaderImage ?? true;
  let galleryFallback = null;
  if (autoHeaderImage && data.gallery) {
    galleryFallback = data.gallery[0];
  }

  let imageSource = data.header_image || galleryFallback || data.image || null;

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
    meta.offers = {
      price: data.price.toString().replace(/[£€$,]/g, ""),
    };
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
