/**
 * Shared test helpers for customise-cms tests.
 *
 * @module test/unit/scripts/customise-cms/test-helpers
 */

import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Default features object with all features disabled.
 * @type {import('#scripts/customise-cms/config.js').CmsFeatures}
 */
export const DISABLED_FEATURES = {
  permalinks: false,
  redirects: false,
  faqs: false,
  specs: false,
  features: false,
  galleries: false,
  add_ons: false,
  header_images: false,
  event_locations_and_dates: false,
  use_visual_editor: false,
  below_products: false,
};

/**
 * Create a minimal test configuration with optional overrides.
 * @param {Object} [overrides={}]
 * @param {string[]} [overrides.collections]
 * @param {Object} [overrides.features]
 * @param {boolean} [overrides.hasSrcFolder]
 * @param {boolean} [overrides.customHomePage]
 * @returns {import('#scripts/customise-cms/config.js').CmsConfig}
 */
export const createTestConfig = (overrides = {}) => ({
  collections: overrides.collections ?? ["pages"],
  features: { ...DISABLED_FEATURES, ...(overrides.features ?? {}) },
  hasSrcFolder: overrides.hasSrcFolder ?? true,
  customHomePage: overrides.customHomePage ?? false,
});

/**
 * Extract a collection section from generated YAML.
 * Returns the section from "name: {collectionName}" to the next top-level collection.
 * @param {string} collectionName
 * @returns {(yaml: string) => string}
 */
export const getSection = (collectionName) => (yaml) => {
  const marker = `name: ${collectionName}`;
  const start = yaml.indexOf(marker);
  if (start === -1) return "";
  const remainder = yaml.substring(start + 1);
  const nextCollectionMatch = remainder.match(/\n {2}- name: /);
  return nextCollectionMatch
    ? yaml.substring(start, start + 1 + nextCollectionMatch.index)
    : yaml.substring(start);
};

/**
 * Set up a test directory with _data folder and site.json file.
 * @param {string} tempDir
 * @param {Object} siteData
 */
export const setupSiteJson = (tempDir, siteData) => {
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(siteData));
};

/**
 * Set up a test directory with both _data and src/_data folders.
 * @param {string} tempDir
 * @param {Object} rootData
 * @param {Object} srcData
 */
export const setupSiteJsonWithSrc = (tempDir, rootData, srcData) => {
  mkdirSync(`${tempDir}/_data`, { recursive: true });
  mkdirSync(`${tempDir}/src/_data`, { recursive: true });
  writeFileSync(`${tempDir}/_data/site.json`, JSON.stringify(rootData));
  writeFileSync(`${tempDir}/src/_data/site.json`, JSON.stringify(srcData));
};
