import fs from "node:fs";
import path from "node:path";
import { memoize } from "#toolkit/fp/memoize.js";

/**
 * Build-time file metadata for the `downloads` block.
 *
 * Resolves a URL path (e.g. `/files/guide.pdf`) against the `src/` tree,
 * reads file size from disk, and maps the extension to an Iconify icon.
 * Throws when the file is missing — content references must be correct at
 * build time.
 */

const FORMAT_UNITS = ["B", "KB", "MB", "GB"];

/**
 * Extension → Iconify icon id (all icons use the hugeicons set already cached by the project).
 * @type {Record<string, string>}
 */
const EXTENSION_ICONS = {
  pdf: "hugeicons:pdf-02",
  doc: "hugeicons:doc-01",
  docx: "hugeicons:doc-01",
  odt: "hugeicons:doc-01",
  rtf: "hugeicons:doc-01",
  txt: "hugeicons:txt-01",
  md: "hugeicons:txt-01",
  xls: "hugeicons:xls-02",
  xlsx: "hugeicons:xls-02",
  ods: "hugeicons:xls-02",
  csv: "hugeicons:csv-02",
  ppt: "hugeicons:ppt-02",
  pptx: "hugeicons:ppt-02",
  odp: "hugeicons:ppt-02",
  zip: "hugeicons:zip-01",
  tar: "hugeicons:zip-01",
  gz: "hugeicons:zip-01",
  "7z": "hugeicons:zip-01",
  rar: "hugeicons:zip-01",
  png: "hugeicons:image-01",
  jpg: "hugeicons:image-01",
  jpeg: "hugeicons:image-01",
  gif: "hugeicons:image-01",
  svg: "hugeicons:image-01",
  webp: "hugeicons:image-01",
  mp3: "hugeicons:music-note-01",
  wav: "hugeicons:music-note-01",
  m4a: "hugeicons:music-note-01",
  ogg: "hugeicons:music-note-01",
  mp4: "hugeicons:video-01",
  mov: "hugeicons:video-01",
  webm: "hugeicons:video-01",
};

const DEFAULT_ICON = "hugeicons:file-01";

const readFileInfo = memoize(
  /**
   * @param {string} urlPath
   * @param {string} baseDir
   */
  (urlPath, baseDir) => {
    const cleaned = String(urlPath).replace(/^\//, "");
    const fullPath = path.join(baseDir, "src", cleaned);
    if (!fs.existsSync(fullPath)) {
      throw new Error(
        `downloads block: file not found at ${urlPath} (expected ${fullPath})`,
      );
    }
    const bytes = fs.statSync(fullPath).size;
    const unitIndex =
      bytes === 0
        ? 0
        : Math.min(
            Math.floor(Math.log(bytes) / Math.log(1024)),
            FORMAT_UNITS.length - 1,
          );
    const scaled = bytes / 1024 ** unitIndex;
    const rounded =
      scaled >= 10 || unitIndex === 0
        ? Math.round(scaled)
        : Math.round(scaled * 10) / 10;
    const extension = path.extname(urlPath).slice(1).toLowerCase();
    return {
      size: bytes,
      sizeHuman: `${rounded} ${FORMAT_UNITS[unitIndex]}`,
      extension,
      icon: EXTENSION_ICONS[extension] || DEFAULT_ICON,
    };
  },
  {
    cacheKey: ([urlPath, baseDir]) => JSON.stringify([urlPath, baseDir]),
  },
);

/**
 * Read metadata for a downloadable file referenced by URL path.
 * @param {string} urlPath Site-relative path (leading slash optional).
 * @param {string} [baseDir]
 */
const fileInfo = (urlPath, baseDir = process.cwd()) =>
  readFileInfo(urlPath, baseDir);

/**
 * @param {{ addFilter: Function }} eleventyConfig
 */
const configureFileInfo = (eleventyConfig) => {
  eleventyConfig.addFilter("fileInfo", fileInfo);
};

export { configureFileInfo, fileInfo };
