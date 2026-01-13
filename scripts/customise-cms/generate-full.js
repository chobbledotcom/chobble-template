#!/usr/bin/env bun

/**
 * Generate Full .pages.yml Script
 *
 * Non-interactive script that generates the most complete .pages.yml
 * with all collections and all features enabled.
 *
 * Usage: bun run generate-pages-yml
 */

import { createDefaultConfig } from "#scripts/customise-cms/config.js";
import {
  generateCompactYaml,
  runWithErrorHandling,
  writePagesYaml,
} from "#scripts/customise-cms/writer.js";

/**
 * Main entry point for the non-interactive .pages.yml generator
 * @returns {Promise<void>}
 */
const main = async () => {
  console.log(
    "Generating complete .pages.yml with all collections and features...\n",
  );

  const config = createDefaultConfig();
  await writePagesYaml(generateCompactYaml(config));

  console.log(".pages.yml has been generated with:");
  console.log(`  - ${config.collections.length} collections`);
  console.log(
    "  - All features enabled (permalinks, redirects, faqs, specs, features, galleries)",
  );
};

runWithErrorHandling(main);
