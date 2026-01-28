/**
 * Image cropping utilities for aspect ratio manipulation.
 *
 * Caches cropped images in .image-cache/ using MD5 hash of source+ratio.
 * Handles EXIF orientation by swapping width/height for rotated images.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { memoize } from "#toolkit/fp/memoize.js";
import { simplifyRatio } from "#utils/math-utils.js";

// Node.js caches dynamic imports, no memoization needed
const getSharp = async () => (await import("sharp")).default;

const CROP_CACHE_DIR = ".image-cache";

const getAspectRatio = (aspectRatio, metadata) =>
  aspectRatio || simplifyRatio(metadata.width, metadata.height);

// Disk caching via fs.existsSync - no in-memory memoization needed
const cropImage = async (aspectRatio, sourcePath, metadata) => {
  if (aspectRatio === null || aspectRatio === undefined) return sourcePath;

  const cacheHash = crypto
    .createHash("md5")
    .update(`${sourcePath}:${aspectRatio}`)
    .digest("hex")
    .slice(0, 8);
  const basename = path.basename(sourcePath, path.extname(sourcePath));
  const cachedPath = path.join(
    CROP_CACHE_DIR,
    `${basename}-crop-${cacheHash}.jpeg`,
  );
  if (fs.existsSync(cachedPath)) return cachedPath;

  const [ratioWidth, ratioHeight] = aspectRatio
    .split("/")
    .map(Number.parseFloat);
  const cropHeight = Math.round(metadata.width / (ratioWidth / ratioHeight));
  fs.mkdirSync(CROP_CACHE_DIR, { recursive: true });

  const sharp = await getSharp();
  await sharp(sourcePath)
    .resize(metadata.width, cropHeight, { fit: "cover" })
    .toFile(cachedPath);

  return cachedPath;
};

const getMetadata = memoize(async (imagePath) => {
  const sharp = await getSharp();
  const metadata = await sharp(imagePath).metadata();

  const exifRotated90Or270 = [5, 6, 7, 8].includes(metadata.orientation || 1);
  if (exifRotated90Or270) {
    return { ...metadata, width: metadata.height, height: metadata.width };
  }

  return metadata;
});

export { cropImage, getAspectRatio, getMetadata };
