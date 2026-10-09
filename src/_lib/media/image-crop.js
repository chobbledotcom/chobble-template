/**
 * Image cropping utilities for aspect ratio manipulation.
 * Handles EXIF orientation, width clamping, and Eleventy Image transforms.
 */
import { memoize } from "#utils/fp/memoize.js";
import { simplifyRatio } from "#utils/math-utils.js";

/** @typedef {import("sharp").Metadata} Metadata */
/** @typedef {import("sharp").Sharp} Sharp */

const getSharp = async () => (await import("sharp")).default;

/**
 * @param {string | null} aspectRatio
 * @param {Metadata} metadata
 */
const getAspectRatio = (aspectRatio, metadata) =>
  aspectRatio || simplifyRatio(metadata);

/** @param {string} aspectRatio */
const parseCropAspectRatio = (aspectRatio) => {
  const [ratioWidth, ratioHeight] = aspectRatio
    .split("/")
    .map(Number.parseFloat);
  return ratioWidth / ratioHeight;
};

/**
 * @param {string | null} aspectRatio
 * @param {Metadata} metadata
 * @returns {number}
 */
const getCropMaxWidth = (aspectRatio, metadata) =>
  aspectRatio
    ? Math.min(
        metadata.width,
        Math.floor(metadata.height * parseCropAspectRatio(aspectRatio)),
      )
    : metadata.width;

/**
 * @param {(number | string)[]} widths
 * @param {string | null} aspectRatio
 * @param {Metadata} metadata
 * @returns {(number | string)[]}
 */
const sanitizeCropWidths = (widths, aspectRatio, metadata) => {
  if (!aspectRatio) return widths;

  const maxWidth = getCropMaxWidth(aspectRatio, metadata);
  return [
    ...new Set(
      widths.map((width) =>
        Math.min(
          width === "auto" ? maxWidth : Number.parseInt(String(width), 10),
          maxWidth,
        ),
      ),
    ),
  ];
};

/**
 * @param {string | null} aspectRatio
 * @returns {{manualCacheKey?: string, transform?: (sharp: Sharp, stats: {width: number}) => Sharp}}
 */
const getCropImageOptions = (aspectRatio) => {
  if (!aspectRatio) return {};

  const cropRatio = parseCropAspectRatio(aspectRatio);
  return {
    manualCacheKey: aspectRatio,
    transform: (sharp, stats) =>
      sharp.resize({
        width: stats.width,
        height: Math.floor(stats.width / cropRatio),
        fit: "cover",
        position: "centre",
      }),
  };
};

const getMetadata = memoize(
  /** @param {string} imagePath */
  async (imagePath) => {
    const sharp = await getSharp();
    const metadata = await sharp(imagePath).metadata();

    const exifRotated90Or270 = [5, 6, 7, 8].includes(metadata.orientation || 1);
    if (exifRotated90Or270) {
      return { ...metadata, width: metadata.height, height: metadata.width };
    }

    return metadata;
  },
);

export {
  getAspectRatio,
  getCropImageOptions,
  getCropMaxWidth,
  getMetadata,
  getSharp,
  sanitizeCropWidths,
};
