// Image cropping utilities for aspect ratio manipulation

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createLazyLoader } from "#utils/lazy-loader.js";
import { simplifyRatio } from "#utils/math-utils.js";
import { memoize } from "#utils/memoize.js";

// @ts-expect-error - Lazy loader config is valid
const getSharp = createLazyLoader("sharp", { property: "default" });

const CROP_CACHE_DIR = ".image-cache";

// Get aspect ratio - use provided or calculate from metadata
const getAspectRatio = (aspectRatio, metadata) =>
  aspectRatio || simplifyRatio(metadata.width, metadata.height);

// Crop image to aspect ratio (memoized, returns cached path if exists)
const cropImage = memoize(
  async (aspectRatio, sourcePath, metadata) => {
    if (aspectRatio === null || aspectRatio === undefined) return sourcePath;

    // Build cache path for cropped image
    const hash = crypto
      .createHash("md5")
      .update(`${sourcePath}:${aspectRatio}`)
      .digest("hex")
      .slice(0, 8);
    const basename = path.basename(sourcePath, path.extname(sourcePath));
    const cachedPath = path.join(
      CROP_CACHE_DIR,
      `${basename}-crop-${hash}.jpeg`,
    );

    if (fs.existsSync(cachedPath)) return cachedPath;

    // Parse aspect ratio string (e.g., "16/9") into crop dimensions
    const [w, h] = aspectRatio.split("/").map(Number.parseFloat);
    const { width, height } = {
      width: metadata.width,
      height: Math.round(metadata.width / (w / h)),
    };

    fs.mkdirSync(CROP_CACHE_DIR, { recursive: true });

    const sharp = await getSharp();
    await sharp(sourcePath)
      .resize(width, height, { fit: "cover" })
      .toFile(cachedPath);

    return cachedPath;
  },
  { cacheKey: (args) => `${args[0]}:${args[1]}` },
);

// Get image metadata (memoized)
const getMetadata = memoize(async (imagePath) => {
  const sharp = await getSharp();
  const metadata = await sharp(imagePath).metadata();

  // Handle EXIF orientation - if rotated 90/270 degrees, swap width/height
  const needsSwap = [5, 6, 7, 8].includes(metadata.orientation || 1);
  if (needsSwap) {
    return { ...metadata, width: metadata.height, height: metadata.width };
  }

  return metadata;
});

export { cropImage, getAspectRatio, getMetadata };
