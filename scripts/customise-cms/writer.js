/**
 * File writer for .pages.yml
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compactYaml } from "#scripts/customise-cms/compact-yaml.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";

/**
 * Path to the .pages.yml file
 * @type {string}
 */
const PAGES_YML_PATH = join(process.cwd(), ".pages.yml");

/**
 * Write generated YAML content to .pages.yml
 * @param {string} content - YAML content to write
 * @returns {Promise<void>}
 */
export const writePagesYaml = async (content) => {
  await writeFile(PAGES_YML_PATH, content, "utf-8");
};

/**
 * Generate and compact YAML from config
 * @param {import('./config.js').CmsConfig} config - CMS configuration
 * @returns {string} Compacted YAML string
 */
export const generateCompactYaml = (config) =>
  compactYaml(generatePagesYaml(config));

/**
 * Run an async main function with standard error handling
 * @param {() => Promise<void>} mainFn - Async function to run
 * @returns {void}
 */
export const runWithErrorHandling = (mainFn) => {
  mainFn().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
};
