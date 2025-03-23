module.exports = {
  eleventyComputed: {
    header_text: (data) => data.header_text || data.title,
    header_image: (data) => data.header_image || data.featured_image,
    meta_title: (data) => data.meta_title || data.title,
    gallery: (data) => data.gallery || [],
  },
};
