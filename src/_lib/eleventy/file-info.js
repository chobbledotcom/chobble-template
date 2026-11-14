import fs from "node:fs";
import path from "node:path";
import { memoize } from "#utils/fp/memoize.js";

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
 * Iconify icon groups: one icon id per extension family, expanded into the
 * per-extension map below so the grouped data lives here once.
 * @type {Array<[string, string[]]>}
 */
/* jscpd:ignore-start -- declaration data: extension->icon groups */
const ICON_GROUPS = [
  ["pdf-02", ["pdf"]],
  ["doc-01", ["doc", "docx", "odt", "rtf"]],
  ["txt-01", ["txt", "md"]],
  ["xls-02", ["xls", "xlsx", "ods", "csv"]],
  ["ppt-02", ["ppt", "pptx", "odp"]],
  ["zip-01", ["zip", "tar", "gz", "7z", "rar"]],
  ["image-01", ["png", "jpg", "jpeg", "gif", "svg", "webp"]],
  ["music-note-01", ["mp3", "wav", "m4a", "ogg"]],
  ["video-01", ["mp4", "mov", "webm"]],
];
/* jscpd:ignore-end */

/**
 * Extension → Iconify icon id (all icons use the hugeicons set already cached by the project).
 * @type {Record<string, string>}
 */
const EXTENSION_ICONS = Object.fromEntries(
  ICON_GROUPS.flatMap(([icon, extensions]) =>
    extensions.map((extension) => [extension, `hugeicons:${icon}`]),
  ),
);

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

export { fileInfo };
