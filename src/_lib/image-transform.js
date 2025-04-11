const { JSDOM } = require("jsdom");
const { getThumbnailData } = require("./thumbnails");

function addThumbnailBackgrounds(content) {
	if (!content || !content.includes("<img")) return content;

	const dom = new JSDOM(content);
	const selector = 'img[src^="/images/"]';
	const images = dom.window.document.querySelectorAll(selector);

	images.forEach((img) => {
		if (img.style.backgroundImage) return;
		const src = img.getAttribute("src");
		const imageName = src.replace("/images/", "");
		const thumbnailData = getThumbnailData(imageName);
		if (!thumbnailData) return;
		img.style.backgroundImage = `url('${thumbnailData.base64}')`;
		img.style.aspectRatio = thumbnailData.aspect_ratio;
	});

	return dom.serialize();
}

module.exports = { addThumbnailBackgrounds };
