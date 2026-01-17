import fs from "node:fs";
import path from "node:path";
import { createHtml } from "#utils/dom-builder.js";
import { memoize } from "#utils/memoize.js";

const ICONIFY_API_BASE = "https://api.iconify.design";
const ICONS_DIR = "src/assets/icons/iconify";

/**
 * Get an icon SVG, reading from disk cache or fetching from Iconify API.
 * Icons are saved to src/assets/icons/iconify/{prefix}/{name}.svg
 *
 * @param {string} iconId - Icon identifier in format "prefix:name"
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Promise<string>} SVG content
 * @throws {Error} If icon ID is invalid or fetch fails
 */
export const getIcon = memoize(
  async (iconId, baseDir = process.cwd()) => {
    if (typeof iconId !== "string" || !iconId.includes(":")) {
      throw new Error(
        `Invalid icon identifier "${iconId}". Expected format: "prefix:name" (e.g., "hugeicons:help-circle")`,
      );
    }

    const [rawPrefix, ...nameParts] = iconId.split(":");
    const rawName = nameParts.join(":");

    if (!rawPrefix || !rawName) {
      throw new Error(
        `Invalid icon identifier "${iconId}". Expected format: "prefix:name" (e.g., "hugeicons:help-circle")`,
      );
    }

    // Normalize: trim, lowercase, convert underscores/spaces to hyphens
    const prefix = rawPrefix.trim().toLowerCase();
    const name = rawName
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    const filePath = path.join(baseDir, ICONS_DIR, prefix, `${name}.svg`);

    // Return cached icon if it exists on disk
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }

    // Fetch from Iconify API
    const url = `${ICONIFY_API_BASE}/${prefix}/${name}.svg`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch icon "${iconId}" from Iconify API. Status: ${response.status}. URL: ${url}`,
      );
    }

    const svg = await response.text();

    if (!svg.includes("<svg")) {
      throw new Error(
        `Invalid response for icon "${iconId}". Expected SVG but got: ${svg.slice(0, 100)}...`,
      );
    }

    // Save to disk for future builds
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, svg, "utf-8");

    return svg;
  },
  { cacheKey: ([iconId, baseDir]) => `${iconId}:${baseDir || process.cwd()}` },
);

/**
 * Render an icon value to HTML.
 * Detects the icon type and returns appropriate HTML:
 * - Iconify ID (contains ":" but no "/") → fetches SVG
 * - Image path (starts with "/") → returns <img> tag
 * - Otherwise → returns value as-is (emoji, HTML entity, etc.)
 *
 * @param {string} icon - Icon value
 * @returns {Promise<string>} Rendered HTML
 */
const renderIcon = async (icon) => {
  if (!icon) return "";

  // Iconify IDs have format "prefix:name" (contains colon but no slash)
  if (typeof icon === "string" && icon.includes(":") && !icon.includes("/")) {
    return getIcon(icon);
  }

  if (typeof icon === "string" && icon.startsWith("/")) {
    return createHtml("img", { src: icon, alt: "" });
  }

  return icon;
};

/**
 * Configure the icon filters for Eleventy.
 *
 * Usage in templates:
 *   {{ "hugeicons:help-circle" | icon }}     - Get raw SVG for Iconify icon
 *   {{ "mdi:home" | renderIcon }}            - Auto-detect and render any icon type
 *   {{ "/images/icon.svg" | renderIcon }}    - Renders as <img> tag
 *   {{ "&#128640;" | renderIcon }}           - Passes through as-is
 *
 * Icons are cached to src/assets/icons/iconify/ and can be committed to git.
 *
 * @param {object} eleventyConfig - Eleventy configuration object
 */
export const configureIconify = (eleventyConfig) => {
  eleventyConfig.addAsyncFilter("icon", getIcon);
  eleventyConfig.addAsyncFilter("renderIcon", renderIcon);
};
