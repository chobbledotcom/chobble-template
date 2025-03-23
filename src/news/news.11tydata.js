module.exports = {
  eleventyComputed: {
    title: (data) => data.header_text || data.title,
  },
};
