// Computed data for all pages to add meta object
module.exports = {
  eleventyComputed: {
    meta: data => {
      // Start with global meta defaults
      const baseMeta = data.meta || {};
      
      // Build page-specific meta
      const pageMeta = {
        ...baseMeta,
        url: `${data.site.url}${data.page.url}`,
        title: data.title || data.meta_title || "Untitled",
        description: data.meta_description || data.short_description || data.site.description
      };
      
      // Add image if available
      if (data.header_image) {
        pageMeta.image = {
          src: `${data.site.url}/images/${data.header_image}`
        };
      } else if (data.gallery && data.gallery[0]) {
        pageMeta.image = {
          src: `${data.site.url}/images/${data.gallery[0]}`
        };
      }
      
      // Add product-specific data
      if (data.layout === "product.html") {
        pageMeta.name = data.title;
        pageMeta.brand = data.site.name;
        if (data.price) {
          pageMeta.offers = {
            price: data.price.replace(/[£,]/g, '')
          };
        }
      }
      
      // Add post-specific data
      if (data.layout === "news-post.html" && data.page.date) {
        pageMeta.datePublished = data.page.date.toISOString().split('T')[0];
        pageMeta.author = {
          name: data.site.name
        };
        pageMeta.publisher = {
          name: data.site.name,
          logo: {
            src: `${data.site.url}/images/logo.png`,
            width: 512,
            height: 512
          }
        };
      }
      
      // Add organization data for contact page
      if (data.layout === "contact.html") {
        pageMeta.organization = baseMeta.organization;
      }
      
      return pageMeta;
    }
  }
};