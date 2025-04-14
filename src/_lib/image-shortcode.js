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

  const wrapperClasses = ["image-wrapper"];
  if (classes && classes.trim()) {
    imageAttributes.class = classes;
    wrapperClasses.push(classes);
  }

  const imgHtml = Image.generateHTML(metadata, imageAttributes);

  let styleAttrs = "";
  if (thumbnailData) {
    styleAttrs = `
      style="
        --img-thumbnail: url('${thumbnailData.base64}');
        --img-aspect-ratio: ${thumbnailData.aspect_ratio};
      "
    `;
  }

  return `<div
    ${styleAttrs}
    class="${wrapperClasses.join(" ")}"
  >${imgHtml}</div>`;
}

module.exports = { imageShortcode };
