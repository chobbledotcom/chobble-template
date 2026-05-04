export default {
  eleventyComputed: {
    thumbnail: (data) => data.thumbnail || data.image,
    subtitle: (data) => data.subtitle || data.snippet,
  },
};
