const { getThumbnailData } = require('../_lib/thumbnails');

module.exports = {
  eleventyComputed: {
    header_text: (data) => data.header_text || data.meta_title,
    thumbnail_base64: (data) => {
      if (data.header_image) {
        const thumbnailData = getThumbnailData(data.header_image);
        return thumbnailData ? thumbnailData.base64 : null;
      }
      return null;
    },
    thumbnail_aspect_ratio: (data) => {
      if (data.header_image) {
        const thumbnailData = getThumbnailData(data.header_image);
        return thumbnailData ? thumbnailData.aspect_ratio : null;
      }
      return null;
    }
  },
};
