/**
 * File writer for .pages.yml
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const PAGES_YML_PATH = join(process.cwd(), ".pages.yml");

/**
 * Write generated YAML content to .pages.yml
 */
export const writePagesYaml = async (content) => {
  await writeFile(PAGES_YML_PATH, content, "utf-8");
};
