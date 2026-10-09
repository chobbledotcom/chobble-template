/**
 * Configuration management for CMS customisation
 *
 * Reads and writes cms_config to site.json
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { unknownKeyErrors } from "#config/data-schema.js";
import { ROOT_DIR } from "#lib/paths.js";
import { getRequiredCollections } from "#scripts/customise-cms/collections.js";
import { map, unique } from "#utils/fp/array.js";

/**
 * @typedef {Object} CmsFeatures
 * @property {boolean} permalinks - Enable custom permalinks on items
 * @property {boolean} redirects - Enable redirect_from support
 * @property {boolean} faqs - Enable FAQs on items
 * @property {boolean} galleries - Enable image galleries on items
 * @property {boolean} external_navigation_urls - Enable external URLs in navigation
 * @property {boolean} no_index - Enable hiding pages/news from listings
 */

/**
 * @typedef {Object} CmsConfig
 * @property {string[]} collections - List of enabled collection names
 * @property {CmsFeatures} features - Feature flags
 * @property {boolean} hasSrcFolder - Whether the template has a src/ folder
 * @property {string[]} customBlocksCollections - Custom blocks-only collections (e.g., ["clients", "services"]); always present after normalization
 */

/**
 * @typedef {Object} SiteJson
 * @property {CmsConfig} [cms_config] - CMS configuration
 * @property {string} [name] - Site name
 * @property {string} [url] - Site URL
 */

/**
 * Get the path to site.json, checking src/_data first then _data.
 * Resolved from the repository root by default so the tool works from any
 * directory; tests pass their own baseDir.
 * @param {string} baseDir - Directory containing the site
 * @returns {string} Path to site.json
 * @throws {Error} If no site.json exists in either location
 */
const getSiteJsonPath = (baseDir) => {
  const candidates = [
    join(baseDir, "src/_data/site.json"),
    join(baseDir, "_data/site.json"),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`site.json not found at ${candidates.join(" or ")}`);
  }
  return found;
};

/**
 * The complete feature set with everything off - the baseline every
 * loaded or fresh config is merged over, so downstream code can read
 * feature flags directly without fallbacks.
 * @type {CmsFeatures}
 */
const FEATURE_DEFAULTS = {
  permalinks: false,
  redirects: false,
  faqs: false,
  galleries: false,
  external_navigation_urls: false,
  no_index: false,
};

/**
 * Normalize a saved config into a complete one: merge required collections
 * back in (handles configs saved before a collection became required),
 * fill in feature flags added after the config was saved, and default
 * hasSrcFolder/customBlocksCollections for configs that predate them.
 * A feature the generator does not know (such as a retired option) fails
 * loudly, naming the accepted features.
 * @param {Partial<CmsConfig> & Pick<CmsConfig, "collections">} config
 * @returns {CmsConfig} Normalized config
 */
const normalizeConfig = (config) => {
  const [unknownFeatures] = config.features
    ? unknownKeyErrors(
        "site.json cms_config.features",
        config.features,
        FEATURE_DEFAULTS,
      )
    : [];
  if (unknownFeatures) throw new Error(unknownFeatures);
  const requiredNames = map((c) => c.name)(getRequiredCollections());
  return {
    hasSrcFolder: true,
    customBlocksCollections: [],
    ...config,
    features: { ...FEATURE_DEFAULTS, ...config.features },
    collections: unique([...config.collections, ...requiredNames]),
  };
};

/**
 * A complete config with only the required collections and every optional
 * feature off - the defaults for a fresh interactive run.
 * @returns {CmsConfig}
 */
export const createEmptyConfig = () => normalizeConfig({ collections: [] });

/**
 * Load existing CMS config from site.json
 * @param {string} [baseDir] - Directory containing the site
 * @returns {Promise<CmsConfig | null>} The CMS config or null if none exists
 */
export const loadCmsConfig = async (baseDir = ROOT_DIR) => {
  const content = await readFile(getSiteJsonPath(baseDir), "utf-8");
  const siteData = JSON.parse(content);
  return siteData.cms_config ? normalizeConfig(siteData.cms_config) : null;
};

/**
 * Save CMS config to site.json
 * Preserves existing site.json data
 * @param {CmsConfig} config - The CMS configuration to save
 * @param {string} [baseDir] - Directory containing the site
 * @returns {Promise<void>}
 */
export const saveCmsConfig = async (config, baseDir = ROOT_DIR) => {
  const path = getSiteJsonPath(baseDir);
  const content = await readFile(path, "utf-8");
  const siteData = JSON.parse(content);

  siteData.cms_config = config;

  await writeFile(path, `${JSON.stringify(siteData, null, "\t")}\n`, "utf-8");
};

/**
 * Create default config with all collections and features enabled.
 * This is the implementation of the CLI's `--all` option.
 * @returns {CmsConfig} Default configuration with all options enabled
 */
export const createDefaultConfig = () => ({
  collections: ["pages", "news", "guide-categories", "guide-pages", "snippets"],
  features: {
    permalinks: true,
    redirects: true,
    faqs: true,
    galleries: true,
    external_navigation_urls: true,
    no_index: true,
  },
  hasSrcFolder: true,
  customBlocksCollections: [],
});
