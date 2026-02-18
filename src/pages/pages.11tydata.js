export default {
  eleventyComputed: {
    title: (data) => data.title || data.meta_title,
  },
};
