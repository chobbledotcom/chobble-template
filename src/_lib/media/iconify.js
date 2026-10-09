import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import socialIcons from "#data/social-icons.json" with { type: "json" };
import { registerFilters } from "#eleventy/register.js";
import { createHtml } from "#utils/dom-builder.js";
import { dedupeAsync } from "#utils/fp/memoize.js";

const ICONIFY_API_BASE = "https://api.iconify.design";
const ICONS_DIR = "src/assets/icons/iconify";

/** @type {Record<string, string>} Copied so lookups take arbitrary string keys */
const socialIconMap = { ...socialIcons };

/**
 * Normalize an icon name segment: trim, lowercase, convert underscores/spaces to hyphens.
 * @param {string} name
 * @returns {string}
 */
const normalizeIconName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

/**
 * Get an icon SVG, reading from disk cache or fetching from Iconify API.
 * Icons are saved to src/assets/icons/iconify/{prefix}/{name}.svg
 *
 * Uses dedupeAsync to prevent concurrent fetches for the same icon.
 *
 * @param {string} iconId - Icon identifier in format "prefix:name"
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Promise<string>} SVG content
 * @throws {Error} If icon ID is invalid or fetch fails
 */
export const getIcon = dedupeAsync(
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

    const prefix = normalizeIconName(rawPrefix);
    const name = normalizeIconName(rawName);
    const filePath = path.join(baseDir, ICONS_DIR, prefix, `${name}.svg`);

    // Return cached icon if it exists on disk
    if (existsSync(filePath)) {
      return readFileSync(filePath, "utf8");
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
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, svg);

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
 * Look up a social platform's Iconify icon ID from social-icons.json and return the SVG.
 *
 * @param {string} platform - Social platform name (e.g., "Github", "Facebook")
 * @param {string} [baseDir] - Base directory for icon cache (defaults to process.cwd())
 * @returns {Promise<string>} SVG content
 * @throws {Error} If no icon is defined for the platform in social-icons.json
 */
const socialIcon = async (platform, baseDir) => {
  const key = String(platform).toLowerCase().trim();
  const iconId = socialIconMap[key];
  if (!iconId) {
    throw new Error(
      `No social icon defined for "${platform}". Add an entry for "${key}" in src/_data/social-icons.json`,
    );
  }
  return getIcon(iconId, baseDir);
};

/**
 * Configure the icon filters for Eleventy.
 *
 * Usage in templates:
 *   {{ "hugeicons:help-circle" | icon }}     - Get raw SVG for Iconify icon
 *   {{ "hugeicons:home-01" | renderIcon }}    - Auto-detect and render any icon type
 *   {{ "/images/icon.svg" | renderIcon }}    - Renders as <img> tag
 *   {{ "&#128640;" | renderIcon }}           - Passes through as-is
 *   {{ "Github" | socialIcon }}              - Look up social icon from social-icons.json
 *
 * Icons are cached to src/assets/icons/iconify/ and can be committed to git.
 *
 * @param {import("#lib/types").UserConfig} eleventyConfig - Eleventy configuration object
 */
export const configureIconify = (eleventyConfig) =>
  registerFilters(
    eleventyConfig,
    "addAsyncFilter",
  )({
    icon: getIcon,
    renderIcon,
    socialIcon,
  });
