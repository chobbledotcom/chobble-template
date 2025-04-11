module.exports = async () => {
	const galleryPages = [];
	const glob = require("glob");
	const path = require("path");
	const fs = require("fs");
	const slugify = require("slugify");
	const { getThumbnailData } = require("../_lib/thumbnails");

	const productFiles = glob.sync("src/products/*.md");

	productFiles.forEach((productPath) => {
		const content = fs.readFileSync(productPath, "utf8");
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) return;

		const frontMatter = frontmatterMatch[1];

		const galleryMatch = frontMatter.match(/gallery:\n([\s\S]*?)(?:\n\w|$)/);
		if (!galleryMatch) return;

		const galleryStr = galleryMatch[1];
		const galleryLines = galleryStr.split("\n").filter((line) => line.trim());

		const productSlug = path.basename(productPath, ".md");

		galleryLines.forEach((line) => {
			const match = line.match(/\s\s(.*?): (.*)/);
			if (!match) return;

			const [_, imageName, imageSrc] = match;
			const imageSlug = slugify(imageName, {
				lower: true,
				strict: true,
			});

			let productName = frontMatter.match(/title: (.*)/)[1].trim();

			let shortDescription = frontMatter.match(/short_description: (.*)/);
			shortDescription = shortDescription ? shortDescription[1].trim() : null;

			const galleryPage = {
				productSlug,
				header_text: productName,
				short_description: shortDescription,
				meta_title: `${productName} > ${imageName}`,
				header_image: frontMatter.match(/header_image: (.*)/)[1].trim(),
				imageName,
				imageSrc: imageSrc.trim(),
				imageSlug,
				url: `/products/${productSlug}/${imageSlug}.html`,
				navigationParent: "Products",
			};

			const headerThumb = getThumbnailData(galleryPage.header_image);
			if (headerThumb) {
				galleryPage.thumbnail_base64 = headerThumb.base64;
				galleryPage.thumbnail_aspect_ratio = headerThumb.aspect_ratio;
			}

			const imageThumb = getThumbnailData(galleryPage.imageSrc);
			if (imageThumb) {
				galleryPage.image_base64 = imageThumb.base64;
				galleryPage.image_aspect_ratio = imageThumb.aspect_ratio;
			}

			galleryPages.push(galleryPage);
		});
	});

	return galleryPages;
};
