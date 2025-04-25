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
    imageName.toString().indexOf("/") == 0 ? imageName : `/images/${imageName}`;

  const image = await Image(`src/${path}`, {
    ...DEFAULT_OPTIONS,
    widths: widths || DEFAULT_WIDTHS,
  });

  const thumbnails = await Image(`src/${path}`, {
    ...DEFAULT_OPTIONS,
    widths: [32],
    formats: ["webp"],
  });

  const [thumbnail] = thumbnails.webp;

  const base64 = fs.readFileSync(thumbnail.outputPath).toString("base64");
  const base64Url = `url('data:image/webp;base64,${base64}')`;

  const aspectRatio = `${thumbnail.width}/${thumbnail.height}`;

  div.style.setProperty("background-image", base64Url);
  div.style.setProperty("aspect-ratio", aspectRatio);

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

async function imageShortcode(
  imageName,
  alt,
  widths,
  classes = "",
  sizes = "100vw",
) {
  return await processAndWrapImage({
    logName: `imageShortcode: ${imageName}`,
    imageName,
    alt,
    classes,
    sizes,
    widths,
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

      const { parentNode } = img;
      parentNode.replaceChild(
        await processAndWrapImage({
          logName: `transformImages: ${img}`,
          imageName: img.getAttribute("src"),
          alt: img.getAttribute("alt") || "",
          classes: img.getAttribute("class") || "",
          sizes: img.getAttribute("sizes") || "100vw",
          widths: img.getAttribute("widths") || "",
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
