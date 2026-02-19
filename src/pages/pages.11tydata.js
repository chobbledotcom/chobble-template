export default {
  eleventyComputed: {
    /** @param {*} data */
    title: (data) => data.title || data.meta_title,
  },
};
