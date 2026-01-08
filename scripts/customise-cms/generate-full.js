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
import { generatePagesYaml } from "#scripts/customise-cms/generator.js";
import { writePagesYaml } from "#scripts/customise-cms/writer.js";

const main = async () => {
  console.log(
    "Generating complete .pages.yml with all collections and features...\n",
  );

  const config = createDefaultConfig();
  const yaml = generatePagesYaml(config);

  await writePagesYaml(yaml);

  console.log(".pages.yml has been generated with:");
  console.log(`  - ${config.collections.length} collections`);
  console.log(
    "  - All features enabled (permalinks, redirects, faqs, specs, features, galleries)",
  );
};

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
