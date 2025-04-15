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

async function processAndWrapImage(
  imageName,
  alt,
  classes,
  sizes = "100vw",
  widths = null,
  returnElement = false,
) {
  if (typeof widths === "string") {
    widths = widths.split(",");
  }

  const div = new JSDOM().window.document.createElement("div");
  div.classList.add("image-wrapper");
  if (classes) div.classList.add(classes);

  const image = await Image(`src/images/${imageName}`, {
    ...DEFAULT_OPTIONS,
    widths: widths || DEFAULT_WIDTHS,
  });

  const thumbnail = await Image(`src/images/${imageName}`, {
    ...DEFAULT_OPTIONS,
    widths: [32],
    formats: ["webp"],
  });
  const thumbPath = thumbnail.webp[0].outputPath;
  const aspectRatio = `${thumbnail.webp[0].width}/${thumbnail.webp[0].height}`;
  const base64 = fs.readFileSync(thumbPath).toString("base64");

  div.style.setProperty(
    "--img-thumbnail",
    `url('data:image/webp;base64,${base64}')`,
  );
  div.style.setProperty("--img-aspect-ratio", aspectRatio);

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
  return await processAndWrapImage(
    imageName,
    alt,
    classes,
    sizes,
    widths,
    false,
  );
}

async function transformImages(content) {
  if (!content || !content.includes("<img")) return content;

  const dom = new JSDOM(content);
  const images = dom.window.document.querySelectorAll('img[src^="/images/"]');

  if (images.length === 0) return content;

  await Promise.all(
    Array.from(images).map(async (img) => {
      if (img.parentNode.classList.contains("image-wrapper")) return;
      img.parentNode.replaceChild(
        await processAndWrapImage(
          img.getAttribute("src").replace("/images/", ""),
          img.getAttribute("alt") || "",
          img.getAttribute("class") || "",
          img.getAttribute("sizes") || "100vw",
          img.getAttribute("widths") || "",
          true,
        ),
        img,
      );
    }),
  );

  // Fix invalid HTML where divs are the sole child of paragraph tags
  const paragraphs = dom.window.document.querySelectorAll("p");
  paragraphs.forEach((p) => {
    if (p.childNodes.length === 1 && p.firstChild.nodeName === "DIV") {
      const div = p.firstChild;
      p.parentNode.insertBefore(div, p);
      p.parentNode.removeChild(p);
    }
  });

  return dom.serialize();
}

module.exports = {
  imageShortcode,
  transformImages,
};
