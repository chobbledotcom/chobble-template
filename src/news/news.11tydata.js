// Computed data for all news posts to add meta object
module.exports = {
  eleventyComputed: {
    meta: data => {
      // Start with global meta defaults
      const baseMeta = data.meta || {};
      
      // Build post-specific meta
      const postMeta = {
        ...baseMeta,
        url: `${data.site.url}${data.page.url}`,
        title: data.title || "Untitled Post",
        description: data.meta_description || data.short_description || data.site.description
      };
      
      // Add image if available
      if (data.header_image) {
        postMeta.image = {
          src: `${data.site.url}/images/${data.header_image}`
        };
      } else if (data.gallery && data.gallery[0]) {
        postMeta.image = {
          src: `${data.site.url}/images/${data.gallery[0]}`
        };
      }
      
      // Add date
      if (data.page.date) {
        postMeta.datePublished = data.page.date.toISOString().split('T')[0];
      }
      
      // Add author/publisher
      postMeta.author = {
        name: data.site.name
      };
      postMeta.publisher = {
        name: data.site.name,
        logo: {
          src: `${data.site.url}/images/logo.png`,
          width: 512,
          height: 512
        }
      };
      
      return postMeta;
    }
  }
};