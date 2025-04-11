const fs = require("fs");
const path = require("path");

// Load thumbnails once
const thumbnailPath = path.join(
	process.cwd(),
	"src/_data/image_thumbnails.json",
);
const imageThumbnails = fs.existsSync(thumbnailPath)
	? JSON.parse(fs.readFileSync(thumbnailPath, "utf8"))
	: {};

// Get thumbnail data for an image
// Returns {base64, aspect_ratio} or null if no thumbnail exists
const getThumbnailData = (image) => {
	if (!image) return null;
	return imageThumbnails[image] || null;
};

module.exports = {
	getThumbnailData,
};
