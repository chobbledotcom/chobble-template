import { mkdirSync } from "node:fs";
import path from "node:path";
import socialIcons from "#data/social-icons.json" with { type: "json" };
import { dedupeAsync, memoize } from "#toolkit/fp/memoize.js";
import { createHtml } from "#utils/dom-builder.js";

const ICONIFY_API_BASE = "https://api.iconify.design";
const ICON_SET_CDN_BASE = "https://cdn.jsdelivr.net/npm/@iconify-json";
const ICONS_DIR = "src/assets/icons/iconify";
const MAX_ALIAS_DEPTH = 4;

/**
 * Normalize an icon name segment: trim, lowercase, convert underscores/spaces to hyphens.
 * @param {string} name
 * @returns {string}
 */
export const normalizeIconName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

/**
 * @typedef {object} ParsedIconId
 * @property {string} prefix
 * @property {string} name
 */

/**
 * Parse an icon identifier and normalise its prefix and name parts.
 * @param {string} iconId
 * @returns {ParsedIconId}
 * @throws {Error} If the identifier is not in "prefix:name" form
 */
const parseIconId = (iconId) => {
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

  return {
    prefix: normalizeIconName(rawPrefix),
    name: normalizeIconName(rawName),
  };
};

/**
 * Get the disk cache path for an icon.
 * @param {ParsedIconId} parsed
 * @param {string} baseDir
 * @returns {string}
 */
const iconCachePath = (parsed, baseDir) =>
  path.join(baseDir, ICONS_DIR, parsed.prefix, `${parsed.name}.svg`);

/**
 * Get the disk cache path for an icon identifier.
 * @param {string} iconId
 * @param {string} [baseDir] - Base directory (defaults to process.cwd())
 * @returns {string}
 */
export const getIconPath = (iconId, baseDir = process.cwd()) =>
  iconCachePath(parseIconId(iconId), baseDir);

/**
 * @typedef {object} IconifyAlias
 * @property {string} [parent]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [left]
 * @property {number} [top]
 * @property {number} [rotate]
 * @property {boolean} [hFlip]
 * @property {boolean} [vFlip]
 */

/**
 * @typedef {object} IconifyIcon
 * @property {string} body
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [left]
 * @property {number} [top]
 * @property {number} [rotate]
 * @property {boolean} [hFlip]
 * @property {boolean} [vFlip]
 */

/**
 * @typedef {object} IconifySet
 * @property {number} width
 * @property {number} height
 * @property {Record<string, IconifyIcon>} icons
 * @property {Record<string, IconifyAlias>} [aliases]
 */

/**
 * Fetch an icon set from the jsDelivr-hosted @iconify-json mirror.
 * The whole set for a prefix arrives as one JSON file, which avoids the
 * per-request rate limits on the Iconify API.
 * @param {string} prefix
 * @returns {Promise<IconifySet|null>} Parsed icon set, or null when unavailable
 */
export const getIconSet = memoize(
  /** @param {string} prefix */
  async (prefix) => {
    const response = await fetch(
      `${ICON_SET_CDN_BASE}/${prefix}@latest/icons.json`,
    ).catch(() => null);
    if (response === null || !response.ok) return null;
    return response.json().catch(() => null);
  },
);

/**
 * Follow an alias chain to its base icon, accumulating size overrides
 * from each hop along the way. Closer hops override values from hops
 * further up the chain, per the Iconify alias merge rules.
 * @param {IconifySet} set
 * @param {string} current
 * @param {object} props
 * @param {number} depth
 * @returns {{name: string, props: object}}
 */
export const resolveAlias = (set, current, props, depth) => {
  const alias = set.aliases?.[current];
  if (alias?.parent === undefined || depth > MAX_ALIAS_DEPTH) {
    return { name: current, props };
  }
  return resolveAlias(set, alias.parent, { ...alias, ...props }, depth + 1);
};

/**
 * Compose an icon set entry into the same SVG shape the Iconify API returns.
 *
 * Alias values override base icon values, and base icon values override set
 * defaults - the reverse ordering of resolveAlias's accumulation. Returns
 * null when the resolved icon carries transformations (rotate, hFlip or
 * vFlip), because those need merge semantics this composer does not
 * implement and the API should render them instead.
 * @param {IconifySet} set
 * @param {IconifyIcon} icon
 * @param {object} props
 * @returns {Promise<string|null>}
 */
export const composeIconSvg = async (set, icon, props) => {
  const size = {
    width: set.width,
    height: set.height,
    left: 0,
    top: 0,
    ...icon,
    ...props,
  };
  const rotation = size.rotate === undefined ? 0 : size.rotate % 4;
  if (rotation !== 0 || size.hFlip === true || size.vFlip === true) {
    return null;
  }
  return createHtml(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: "1em",
      height: "1em",
      viewBox: `${size.left} ${size.top} ${size.width} ${size.height}`,
    },
    icon.body,
  );
};

/**
 * Get an icon SVG composed from the jsDelivr icon set mirror.
 * Returns null for anything that cannot be resolved, so the caller can fall
 * back to the Iconify API.
 * @param {string} prefix
 * @param {string} name
 * @returns {Promise<string|null>}
 */
export const getIconFromCdn = async (prefix, name) => {
  const set = await getIconSet(prefix);
  if (set === null || set.icons === undefined) return null;
  if (set.width === undefined || set.height === undefined) return null;

  const resolved = resolveAlias(set, name, {}, 0);
  const icon = set.icons[resolved.name];
  if (icon === undefined || icon.body === undefined) return null;

  return composeIconSvg(set, icon, resolved.props);
};

/**
 * Get an icon SVG from the Iconify API.
 * @param {string} iconId
 * @param {string} prefix
 * @param {string} name
 * @returns {Promise<string>}
 * @throws {Error} If fetch fails or returns an error status
 */
export const getIconFromApi = async (iconId, prefix, name) => {
  const url = `${ICONIFY_API_BASE}/${prefix}/${name}.svg`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch icon "${iconId}" from Iconify API. Status: ${response.status}. URL: ${url}`,
    );
  }

  return response.text();
};

/**
 * Get an icon SVG, reading from disk cache, the jsDelivr icon set mirror,
 * or the Iconify API - in that order.
 * Icons are saved to src/assets/icons/iconify/{prefix}/{name}.svg
 *
 * Uses dedupeAsync to prevent concurrent fetches for the same icon.
 * Uses Bun.file() for faster file operations.
 *
 * @param {string} iconId - Icon identifier in format "prefix:name"
 * @param {string} baseDir - Base directory (defaults to process.cwd())
 * @returns {Promise<string>} SVG content
 * @throws {Error} If icon ID is invalid or fetch fails
 */
export const getIcon = dedupeAsync(
  async (iconId, baseDir = process.cwd()) => {
    const parsed = parseIconId(iconId);
    const filePath = iconCachePath(parsed, baseDir);

    // Return cached icon if it exists on disk (Bun.file().exists() is async)
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return file.text();
    }

    // Try the CDN icon set first (no rate limits), then the Iconify API
    const cdnSvg = await getIconFromCdn(parsed.prefix, parsed.name);
    const svg =
      cdnSvg === null
        ? await getIconFromApi(iconId, parsed.prefix, parsed.name)
        : cdnSvg;

    if (!svg.includes("<svg")) {
      throw new Error(
        `Invalid response for icon "${iconId}". Expected SVG but got: ${svg.slice(0, 100)}...`,
      );
    }

    // Save to disk for future builds (Bun.write is ~10x faster than fs.writeFileSync)
    mkdirSync(path.dirname(filePath), { recursive: true });
    await Bun.write(filePath, svg);

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
  const iconId = socialIcons[key];
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
 * @param {object} eleventyConfig - Eleventy configuration object
 */
export const configureIconify = (eleventyConfig) => {
  eleventyConfig.addAsyncFilter("icon", getIcon);
  eleventyConfig.addAsyncFilter("renderIcon", renderIcon);
  eleventyConfig.addAsyncFilter("socialIcon", socialIcon);
};
