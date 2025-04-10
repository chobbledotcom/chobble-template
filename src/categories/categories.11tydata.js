module.exports = {
  eleventyComputed: {
    header_text: (data) => data.header_text || data.title,
    header_image: (data) => data.header_image || data.featured_image,
    meta_title: (data) => data.meta_title || data.title,
    eleventyNavigation: (data) => {
      if (data.parent != null) return false;

      return {
        key: data.title,
        parent: "Products",
        order: data.link_order || 0,
      };
    },
  },
};
