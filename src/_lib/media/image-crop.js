/**
 * Image cropping utilities for aspect ratio manipulation.
 *
 * Caches cropped images in .image-cache/ using MD5 hash of source+ratio.
 * Handles EXIF orientation by swapping width/height for rotated images.
 *
 * cropImage uses dedupeAsync to prevent concurrent writes to the same file.
 * Without this, concurrent calls could both see fs.existsSync()=false and
 * race to write the same file, corrupting it ("Input Buffer is empty" error).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dedupeAsync, memoize } from "#toolkit/fp/memoize.js";
import { simplifyRatio } from "#utils/math-utils.js";

const getSharp = async () => (await import("sharp")).default;

const CROP_CACHE_DIR = ".image-cache";

const getAspectRatio = (aspectRatio, metadata) =>
  aspectRatio || simplifyRatio(metadata);

const cropImage = dedupeAsync(
  async (aspectRatio, sourcePath, metadata) => {
    if (!aspectRatio) return sourcePath;

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
      .rotate()
      .resize(metadata.width, cropHeight, { fit: "cover" })
      .toFile(cachedPath);

    return cachedPath;
  },
  { cacheKey: (args) => `${args[0]}:${args[1]}` },
);

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
