import { pipe } from "#utils/array-utils.js";

const PLACEHOLDER_COLORS = [
  "green",
  "blue",
  "pink",
  "yellow",
  "purple",
  "orange",
];

const hashString = (str) =>
  Math.abs(
    [...str].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0),
  );

const getPlaceholderForPath = (itemPath) =>
  pipe(
    hashString,
    (hash) => hash % PLACEHOLDER_COLORS.length,
    (index) => PLACEHOLDER_COLORS[index],
    (color) => `images/placeholders/${color}.svg`,
  )(itemPath || "");

const configureThumbnailPlaceholder = (eleventyConfig) => {
  eleventyConfig.addFilter("thumbnailPlaceholder", getPlaceholderForPath);
};

export {
  PLACEHOLDER_COLORS,
  hashString,
  getPlaceholderForPath,
  configureThumbnailPlaceholder,
};
