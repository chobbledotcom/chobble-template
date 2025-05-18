const Image = require("@11ty/eleventy-img");
const { JSDOM } = require("jsdom");
const fs = require("fs");

const DEFAULT_WIDTHS = [240, 480, 900, 1300, "auto"];
const DEFAULT_OPTIONS = {
	formats: ["webp", "jpeg"],
	outputDir: ".image-cache",
	urlPath: "/img/",
	svgShortCircuit: true,
};

async function processAndWrapImage({
	logName,
	imageName,
	alt,
	classes,
	sizes = "100vw",
	widths = null,
	returnElement = false,
	aspectRatio = null,
}) {
	if (typeof widths === "string") {
		widths = widths.split(",");
	}

	const {
		window: { document },
	} = new JSDOM();
	const div = document.createElement("div");
	div.classList.add("image-wrapper");
	if (classes) div.classList.add(classes);

	let path =
		imageName.toString().indexOf("/") == 0
			? `./src${imageName}`
			: `./src/images/${imageName}`;

	let imageOrPath = path;
	if (aspectRatio) {
		imageOrPath = await cropImage(path, aspectRatio);
	}

	const image = await Image(imageOrPath, {
		...DEFAULT_OPTIONS,
		widths: widths || DEFAULT_WIDTHS,
	});

	div.style.setProperty("background-size", "cover");

	const thumb = makeThumbnail(path);
	div.style.setProperty("background-image", thumb[0]);
	div.style.setProperty("aspect-ratio", thumb[1]);

	const imageAttributes = {
		alt,
		sizes,
		loading: "lazy",
		decoding: "async",
	};

	if (classes && classes.trim()) imageAttributes.class = classes;
	div.innerHTML = Image.generateHTML(image, imageAttributes);

	return returnElement ? div : div.outerHTML;
}

const makeThumbnail = async (path) => {
	const thumbnails = await Image(path, {
		...DEFAULT_OPTIONS,
		widths: [32],
		formats: ["webp"],
	});

	const [thumbnail] = thumbnails.webp;

	const base64 = fs.readFileSync(thumbnail.outputPath).toString("base64");

	const roundedAspectRatio = `${thumbnail.width}/${thumbnail.height}`;

	return [`url('data:image/webp;base64,${base64}')`, roundedAspectRatio];
};

const cropImage = async (path, aspectRatio) => {
	// aspectRatio is a string like "16/9"
	const sharp = require("sharp");
	const dimensions = aspectRatio.split("/").map((s) => parseFloat(s));
	const aspectFraction = dimensions[0] / dimensions[1];

	const image = sharp(path);

	const metadata = await image.metadata();
	const width = metadata.width;
	const height = Math.round(width / aspectFraction);

	return image.resize(width, height, { fit: "cover" }).toBuffer();
};

async function imageShortcode(
	imageName,
	alt,
	widths,
	classes = null,
	sizes = null,
	aspectRatio = null,
) {
	return await processAndWrapImage({
		logName: `imageShortcode: ${imageName}`,
		imageName,
		alt,
		classes,
		sizes,
		widths,
		aspectRatio,
		returnElement: false,
	});
}

async function transformImages(content) {
	if (!content || !content.includes("<img")) return content;

	const {
		window: { document },
	} = new JSDOM(content);
	const images = document.querySelectorAll('img[src^="/images/"]');

	if (images.length === 0) return content;

	await Promise.all(
		Array.from(images).map(async (img) => {
			if (img.parentNode.classList.contains("image-wrapper")) return;

			let aspectRatio = null;
			if (img.hasAttribute("eleventy:aspectRatio")) {
				aspectRatio = img.getAttribute("eleventy:aspectRatio");
				img.removeAttribute("eleventy:aspectRatio");
			}

			const { parentNode } = img;
			parentNode.replaceChild(
				await processAndWrapImage({
					logName: `transformImages: ${img}`,
					imageName: img.getAttribute("src"),
					alt: img.getAttribute("alt") || "",
					classes: img.getAttribute("class") || "",
					sizes: img.getAttribute("sizes") || "100vw",
					widths: img.getAttribute("widths") || "",
					aspectRatio: aspectRatio,
					returnElement: true,
				}),
				img,
			);
		}),
	);

	// Fix invalid HTML where divs are the sole child of paragraph tags
	const paragraphs = document.querySelectorAll("p");
	paragraphs.forEach((p) => {
		if (p.childNodes.length === 1 && p.firstChild.nodeName === "DIV") {
			const { parentNode, firstChild } = p;
			parentNode.insertBefore(firstChild, p);
			parentNode.removeChild(p);
		}
	});

	return new JSDOM(document.documentElement.outerHTML).serialize();
}

module.exports = {
	imageShortcode,
	transformImages,
};
