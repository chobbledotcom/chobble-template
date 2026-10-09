#!/usr/bin/env node

/**
 * Generate Configured .pages.yml Script
 *
 * Non-interactive script that regenerates .pages.yml from the cms_config
 * saved in site.json.
 *
 * Usage: npm run generate-pages-yml
 */

import { writeFile } from "node:fs/promises";
import { loadCmsConfig } from "#scripts/customise-cms/config.js";
import {
  generateCompactYaml,
  runWithErrorHandling,
  writeCmsArtifacts,
} from "#scripts/customise-cms/writer.js";

// Freshness tests set PAGES_YML_OUTPUT_PATH to compare regenerated output
// without overwriting the committed .pages.yml mid-run.
const outputOverride = process.env.PAGES_YML_OUTPUT_PATH;

/**
 * Main entry point for the non-interactive .pages.yml generator
 * @returns {Promise<void>}
 */
const main = async () => {
  console.log("Regenerating .pages.yml from saved CMS configuration...\n");

  const config = await loadCmsConfig();
  if (!config) {
    throw new Error(
      "No saved cms_config found in site.json. Run npm run customise-cms first.",
    );
  }

  if (outputOverride) {
    await writeFile(outputOverride, generateCompactYaml(config), "utf-8");
  } else {
    await writeCmsArtifacts(config);
  }

  console.log(".pages.yml has been regenerated with:");
  console.log(`  - ${config.collections.length} collections`);
  console.log(
    `  - ${Object.values(config.features).filter(Boolean).length} enabled features`,
  );
};

runWithErrorHandling(main);
