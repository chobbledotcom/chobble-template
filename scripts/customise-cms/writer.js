/**
 * File writer for .pages.yml
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

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
