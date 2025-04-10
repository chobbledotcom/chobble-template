module.exports = {
  eleventyComputed: {
    header_text: (data) => data.header_text || data.title,
    header_image: (data) => data.header_image || data.featured_image,
    meta_title: (data) => data.meta_title || data.title,
    featured_image: (data, collections) => {
      if (data.featured_image) return data.featured_image;
      const prod = collections.product?.find((p) =>
        p.data.categories?.includes(data.page.fileSlug),
      );
      return prod?.data.header_image || prod?.data.featured_image;
    },
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
