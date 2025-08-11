// Computed data for all products to add meta object
module.exports = {
  eleventyComputed: {
    meta: data => {
      // Start with global meta defaults
      const baseMeta = data.meta || {};
      
      // Build product-specific meta
      const productMeta = {
        ...baseMeta,
        url: `${data.site.url}${data.page.url}`,
        title: data.title || "Untitled Product",
        description: data.short_description || data.meta_description || data.site.description,
        name: data.title,
        brand: data.site.name
      };
      
      // Add image if available
      if (data.header_image) {
        productMeta.image = {
          src: `${data.site.url}/images/${data.header_image}`
        };
      } else if (data.gallery && data.gallery[0]) {
        productMeta.image = {
          src: `${data.site.url}/images/${data.gallery[0]}`
        };
      }
      
      // Add price/offers
      if (data.price) {
        productMeta.offers = {
          price: data.price.replace(/[£,]/g, '')
        };
      }
      
      // Add specifications as reviews (since plugin doesn't support additionalProperty)
      if (data.specs && data.specs.length > 0) {
        // We'll handle specs separately if needed
      }
      
      return productMeta;
    }
  }
};