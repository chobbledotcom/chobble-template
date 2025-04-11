const { getThumbnailData } = require("../_lib/thumbnails");

module.exports = {
	eleventyComputed: {
		header_text: (data) => data.header_text || data.meta_title,
	},
};
