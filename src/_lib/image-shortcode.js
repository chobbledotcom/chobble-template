const { getThumbnailData } = require("./thumbnails");
const Image = require("@11ty/eleventy-img");

async function imageShortcode(
  imageName,
  alt,
  widths,
  classes = "",
  sizes = "100vw",
) {
  const thumbnailData = getThumbnailData(imageName);

  if (!widths) {
    widths = [240, 480, 900, 1300, "auto"];
  } else {
    widths = widths.split(",");
  }

  const options = {
    widths: widths,
    formats: ["webp", "jpeg"],
    outputDir: ".image-cache",
    urlPath: "/img/",
    svgShortCircuit: true,
  };

  const imagePath = `src/images/${imageName}`;
  const metadata = await Image(imagePath, options);
  const imageAttributes = {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  };

  if (classes && classes.trim()) {
    imageAttributes.class = classes;
  }

  if (thumbnailData) {
    imageAttributes.style = `
		  background-size: cover;
		  background-image: url('${thumbnailData.base64}');
		  aspect-ratio: ${thumbnailData.aspect_ratio};
		`;
  }

  return Image.generateHTML(metadata, imageAttributes);
}

module.exports = { imageShortcode };
