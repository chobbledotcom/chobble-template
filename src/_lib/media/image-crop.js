// Image cropping utilities for aspect ratio manipulation

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { simplifyRatio } from "#utils/math-utils.js";
import { memoize } from "#utils/memoize.js";

// Lazy-load sharp (heavy dependency)
let sharpModule = null;
const getSharp = async () => {
  if (!sharpModule) sharpModule = (await import("sharp")).default;
  return sharpModule;
};

const CROP_CACHE_DIR = ".image-cache";

// Generate a short hash for cache file naming
const generateCropHash = (sourcePath, aspectRatio) =>
  crypto
    .createHash("md5")
    .update(`${sourcePath}:${aspectRatio}`)
    .digest("hex")
    .slice(0, 8);

// Build cache path for cropped image
const buildCropCachePath = (sourcePath, aspectRatio) => {
  const hash = generateCropHash(sourcePath, aspectRatio);
  const basename = path.basename(sourcePath, path.extname(sourcePath));
  return path.join(CROP_CACHE_DIR, `${basename}-crop-${hash}.jpeg`);
};

// Parse aspect ratio string (e.g., "16/9") into crop dimensions
const parseCropDimensions = (aspectRatio, metadata) => {
  const [w, h] = aspectRatio.split("/").map(Number.parseFloat);
  return {
    width: metadata.width,
    height: Math.round(metadata.width / (w / h)),
  };
};

// Get aspect ratio - use provided or calculate from metadata
const getAspectRatio = (aspectRatio, metadata) =>
  aspectRatio || simplifyRatio(metadata.width, metadata.height);

// Crop image to aspect ratio (memoized, returns cached path if exists)
const cropImage = memoize(
  async (aspectRatio, sourcePath, metadata) => {
    if (aspectRatio === null || aspectRatio === undefined) return sourcePath;

    const cachedPath = buildCropCachePath(sourcePath, aspectRatio);
    if (fs.existsSync(cachedPath)) return cachedPath;

    const { width, height } = parseCropDimensions(aspectRatio, metadata);
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
  return await sharp(imagePath).metadata();
});

export { cropImage, getAspectRatio, getMetadata };
