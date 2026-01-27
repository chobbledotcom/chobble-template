/**
 * Configuration management for CMS customisation
 *
 * Reads and writes cms_config to site.json
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * @typedef {Object} CmsFeatures
 * @property {boolean} permalinks - Enable custom permalinks on items
 * @property {boolean} redirects - Enable redirect_from support
 * @property {boolean} faqs - Enable FAQs on items
 * @property {boolean} specs - Enable specifications on products/properties
 * @property {boolean} features - Enable feature lists on products/properties
 * @property {boolean} galleries - Enable image galleries on items
 * @property {boolean} header_images - Enable header images and text on items
 * @property {boolean} external_navigation_urls - Enable external URLs in navigation
 * @property {boolean} external_purchases - Enable external purchase URLs for products
 * @property {boolean} event_locations_and_dates - Enable locations and dates for events
 * @property {boolean} use_visual_editor - Use rich-text visual editor instead of markdown code editor
 * @property {boolean} no_index - Enable hiding pages/news from listings
 * @property {boolean} parent_categories - Enable parent/child category hierarchy
 * @property {boolean} videos - Enable YouTube video embeds on pages
 */

/**
 * @typedef {Object} CmsConfig
 * @property {string[]} collections - List of enabled collection names
 * @property {CmsFeatures} features - Feature flags
 * @property {boolean} hasSrcFolder - Whether the template has a src/ folder
 * @property {boolean} customHomePage - Whether template has a custom home.html layout
 */

/**
 * @typedef {Object} SiteJson
 * @property {CmsConfig} [cms_config] - CMS configuration
 * @property {string} [name] - Site name
 * @property {string} [url] - Site URL
 */

/**
 * Get the path to site.json, checking src/_data first then _data
 * @returns {string} Path to site.json
 */
const getSiteJsonPath = () => {
  const srcPath = join(process.cwd(), "src/_data/site.json");
  return existsSync(srcPath) ? srcPath : join(process.cwd(), "_data/site.json");
};

/**
 * Load existing CMS config from site.json
 * @returns {Promise<CmsConfig | null>} The CMS config or null if none exists
 */
export const loadCmsConfig = async () => {
  const content = await readFile(getSiteJsonPath(), "utf-8");
  const siteData = JSON.parse(content);
  return siteData.cms_config || null;
};

/**
 * Save CMS config to site.json
 * Preserves existing site.json data
 * @param {CmsConfig} config - The CMS configuration to save
 * @returns {Promise<void>}
 */
export const saveCmsConfig = async (config) => {
  const path = getSiteJsonPath();
  const content = await readFile(path, "utf-8");
  const siteData = JSON.parse(content);

  siteData.cms_config = config;

  await writeFile(path, `${JSON.stringify(siteData, null, "\t")}\n`, "utf-8");
};

/**
 * Create default config with all collections and features enabled
 * @returns {CmsConfig} Default configuration with all options enabled
 */
export const createDefaultConfig = () => ({
  collections: [
    "pages",
    "products",
    "categories",
    "news",
    "events",
    "team",
    "reviews",
    "locations",
    "properties",
    "guide-categories",
    "guide-pages",
    "menus",
    "menu-categories",
    "menu-items",
    "snippets",
  ],
  features: {
    permalinks: true,
    redirects: true,
    faqs: true,
    specs: true,
    features: true,
    galleries: true,
    event_locations_and_dates: true,
    use_visual_editor: false,
    no_index: true,
    parent_categories: true,
    videos: true,
  },
  hasSrcFolder: true,
  customHomePage: false,
});
