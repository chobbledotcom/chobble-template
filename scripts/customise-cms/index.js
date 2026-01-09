#!/usr/bin/env bun

/**
 * CMS Customisation Script
 *
 * Interactive script that asks questions about which collections and features
 * the user wants, then generates a customised .pages.yml configuration.
 *
 * Results are stored in _data/site.json as "cms_config" and used as defaults
 * on subsequent runs.
 */

import { compactYaml } from "#scripts/customise-cms/compact-yaml.js";
import { loadCmsConfig, saveCmsConfig } from "#scripts/customise-cms/config.js";
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";
import { askQuestions } from "#scripts/customise-cms/prompts.js";
import { writePagesYaml } from "#scripts/customise-cms/writer.js";

/**
 * Main entry point for the interactive CMS customisation script
 * @returns {Promise<void>}
 */
const main = async () => {
  const existingConfig = await loadCmsConfig();

  console.log("\n=== Chobble Template CMS Customisation ===\n");

  if (existingConfig) {
    console.log(
      "Found existing configuration. Your previous choices will be used as defaults.\n",
    );
  }

  const config = await askQuestions(existingConfig);
  let yaml = generatePagesYaml(config);
  yaml = compactYaml(yaml);

  await saveCmsConfig(config);
  await writePagesYaml(yaml);

  console.log("\n.pages.yml has been updated!");
  console.log("Your configuration has been saved to src/_data/site.json");
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
