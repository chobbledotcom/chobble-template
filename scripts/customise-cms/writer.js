/**
 * File writer for .pages.yml
 */

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";
import { compactYaml } from "#scripts/customise-cms/compact-yaml.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";
import { generateTypeDefinitions } from "#scripts/generate-pages-cms-types.js";

/**
 * Path to the .pages.yml file
 * @type {string}
 */
const PAGES_YML_PATH = join(ROOT_DIR, ".pages.yml");
const CMS_TYPES_PATH = join(
  ROOT_DIR,
  "src/_lib/types/pages-cms-generated.d.ts",
);

/**
 * Write generated YAML content to .pages.yml
 * @param {string} content - YAML content to write
 * @param {string} [outputPath] - Override destination (primarily for callers generating elsewhere)
 * @returns {Promise<void>}
 */
export const writePagesYaml = async (content, outputPath = PAGES_YML_PATH) => {
  await writeFile(outputPath, content, "utf-8");
};

/**
 * Generate and compact YAML from config
 * @param {import('./config.js').CmsConfig} config - CMS configuration
 * @returns {string} Compacted YAML string
 */
export const generateCompactYaml = (config) =>
  compactYaml(generatePagesYaml(config));

/**
 * Regenerate both CMS artifacts from one configuration.
 * @param {import('./config.js').CmsConfig} config
 * @param {{ pagesYaml: string, cmsTypes: string }} [outputPaths]
 */
export const writeCmsArtifacts = async (
  config,
  outputPaths = { pagesYaml: PAGES_YML_PATH, cmsTypes: CMS_TYPES_PATH },
) => {
  const pagesYaml = generateCompactYaml(config);
  await Promise.all([
    writePagesYaml(pagesYaml, outputPaths.pagesYaml),
    writeFile(
      outputPaths.cmsTypes,
      generateTypeDefinitions(pagesYaml),
      "utf-8",
    ),
  ]);
};

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
