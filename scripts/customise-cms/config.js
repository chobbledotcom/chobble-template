/**
 * Configuration management for CMS customisation
 *
 * Reads and writes cms_config to site.json
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const getSiteJsonPath = () => {
  const srcPath = join(process.cwd(), "src/_data/site.json");
  return existsSync(srcPath) ? srcPath : join(process.cwd(), "_data/site.json");
};

/**
 * Load existing CMS config from site.json
 * Returns null if no config exists
 */
export const loadCmsConfig = async () => {
  const content = await readFile(getSiteJsonPath(), "utf-8");
  const siteData = JSON.parse(content);
  return siteData.cms_config || null;
};

/**
 * Save CMS config to site.json
 * Preserves existing site.json data
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
    "guides",
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
  },
  dataPath: "src/_data",
  customHomePage: false,
});
