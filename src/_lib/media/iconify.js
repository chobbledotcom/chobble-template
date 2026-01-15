import { memoize } from "#utils/memoize.js";

const ICONIFY_API_BASE = "https://api.iconify.design";

const INVALID_ICON_ERROR = (iconId) =>
  `Invalid icon identifier "${iconId}". Expected format: "prefix:name" (e.g., "hugeicons:help-circle")`;

/**
 * Fetch an icon SVG from the Iconify API.
 * Results are memoized to avoid repeated HTTP requests.
 *
 * @param {string} iconId - Icon identifier in format "prefix:name"
 * @returns {Promise<string>} SVG content
 * @throws {Error} If icon ID is invalid or fetch fails
 */
const fetchIcon = memoize(async (iconId) => {
  // Validate and parse icon identifier
  if (typeof iconId !== "string" || !iconId.includes(":")) {
    throw new Error(INVALID_ICON_ERROR(iconId));
  }

  const [prefix, ...nameParts] = iconId.split(":");
  const name = nameParts.join(":");

  if (!prefix || !name) {
    throw new Error(INVALID_ICON_ERROR(iconId));
  }

  // Build URL with normalized name (lowercase, underscores/spaces to hyphens)
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  const url = `${ICONIFY_API_BASE}/${prefix.trim()}/${normalizedName}.svg`;

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

  return svg;
});

/**
 * Configure the icon filter for Eleventy.
 *
 * Usage in templates:
 *   {{ "hugeicons:help-circle" | icon }}
 *   {{ "mdi:home" | icon }}
 *   {{ "lucide:settings" | icon }}
 *
 * @param {object} eleventyConfig - Eleventy configuration object
 */
export const configureIconify = (eleventyConfig) => {
  eleventyConfig.addAsyncFilter("icon", fetchIcon);
};
