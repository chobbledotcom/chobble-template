import fs from "node:fs";
import { cropImage, getAspectRatio, getMetadata } from "#media/image-crop.js";
import {
  filenameFormat,
  getEleventyImg,
  getThumbnailOrNull,
} from "#media/image-lqip.js";
import { createImageTransform as createTransform } from "#media/image-transform.js";
import {
  buildImgAttributes,
  buildWrapperStyles,
  isExternalUrl,
  normalizeImagePath,
  parseWidths,
} from "#media/image-utils.js";
import { createElement, createHtml, parseHtml } from "#utils/dom-builder.js";
import { jsonKey, memoize } from "#utils/memoize.js";

// Image processing configuration
const DEFAULT_OPTIONS = {
  formats: ["webp", "jpeg"],
  outputDir: ".image-cache",
  urlPath: "/img/",
  svgShortCircuit: true,
  filenameFormat,
};

// Compute wrapped image HTML for local images (memoized)
const computeWrappedImageHtml = memoize(
  async ({ imageName, alt, classes, sizes, widths, aspectRatio, loading }) => {
    const imagePath = normalizeImagePath(imageName);
    const metadata = await getMetadata(imagePath);
    const finalPath = await cropImage(aspectRatio, imagePath, metadata);

    const imgAttributes = buildImgAttributes(alt, sizes, loading);
    const pictureAttributes = classes?.trim() ? { class: classes } : {};
    const { default: Image } = await getEleventyImg();

    const [innerHTML, bgImage] = await Promise.all([
      Image(finalPath, {
        ...DEFAULT_OPTIONS,
        widths: parseWidths(widths),
        fixOrientation: true,
        returnType: "html",
        htmlOptions: { imgAttributes, pictureAttributes },
      }),
      getThumbnailOrNull(imagePath, metadata),
    ]);

    return await createHtml(
      "div",
      {
        class: classes ? `image-wrapper ${classes}` : "image-wrapper",
        style: buildWrapperStyles(
          bgImage,
          aspectRatio,
          metadata,
          getAspectRatio,
        ),
      },
      innerHTML,
    );
  },
  { cacheKey: jsonKey },
);

// Main image processing function
const processAndWrapImage = async ({
  logName: _logName,
  imageName,
  alt,
  classes,
  sizes = null,
  widths = null,
  returnElement = false,
  aspectRatio = null,
  loading = null,
  document = null,
}) => {
  const imageNameStr = imageName.toString();

  // Handle external URLs with simple img tag
  if (isExternalUrl(imageNameStr)) {
    const attributes = {
      src: imageNameStr,
      alt: alt || "",
      loading: loading || "lazy",
      decoding: "async",
      sizes: "auto",
      ...(classes && { class: classes }),
    };
    return returnElement
      ? await createElement("img", attributes, null, document)
      : await createHtml("img", attributes);
  }

  const html = await computeWrappedImageHtml({
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
  });

  return returnElement ? await parseHtml(html, document) : html;
};

// Create image transform - wraps the low-level transform with processAndWrapImage
const createImageTransform = () => createTransform(processAndWrapImage);

// Configure Eleventy with image processing
const configureImages = async (eleventyConfig) => {
  // Find image files matching patterns
  const imageFiles = ["src/images/*.jpg"].flatMap((pattern) => [
    ...new Bun.Glob(pattern).scanSync("."),
  ]);

  const { eleventyImageOnRequestDuringServePlugin } = await getEleventyImg();
  eleventyConfig.addPlugin(eleventyImageOnRequestDuringServePlugin);

  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addTransform("processImages", createImageTransform());
  // Create images collection for Eleventy
  eleventyConfig.addCollection("images", () =>
    (imageFiles ?? []).map((i) => i.split("/")[2]).reverse(),
  );
  // Copy image cache to output directory
  eleventyConfig.on("eleventy.after", () => {
    if (fs.existsSync(".image-cache/")) {
      fs.cpSync(".image-cache/", "_site/img/", { recursive: true });
    }
  });
};

// Image shortcode for use in templates
const imageShortcode = async (
  imageName,
  alt,
  widths,
  classes = null,
  sizes = null,
  aspectRatio = null,
  loading = null,
) =>
  processAndWrapImage({
    logName: `imageShortcode: ${imageName}`,
    imageName,
    alt,
    classes,
    sizes,
    widths,
    aspectRatio,
    loading,
    returnElement: false,
  });

export { createImageTransform, configureImages, imageShortcode };
