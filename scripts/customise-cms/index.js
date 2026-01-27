#!/usr/bin/env bun

/**
 * CMS Customisation Script
 *
 * Interactive or non-interactive script that configures which collections and
 * features are enabled, then generates a customised .pages.yml configuration.
 *
 * Interactive mode (default): Asks questions about preferences.
 * Non-interactive mode: Uses CLI flags for automation and LLM agents.
 *
 * Results are stored in _data/site.json as "cms_config" and used as defaults
 * on subsequent runs.
 */

import {
  buildConfigFromCli,
  getCliOptions,
  handleListOptions,
  hasCliFlags,
  parseCliArguments,
  showHelp,
} from "#scripts/customise-cms/cli.js";
import { loadCmsConfig, saveCmsConfig } from "#scripts/customise-cms/config.js";
import { askQuestions } from "#scripts/customise-cms/prompts.js";
import {
  generateCompactYaml,
  runWithErrorHandling,
  writePagesYaml,
} from "#scripts/customise-cms/writer.js";

/**
 * Log a message unless quiet mode is enabled
 * @param {string} message - Message to log
 * @param {boolean} quiet - Whether to suppress output
 */
const log = (message, quiet) => {
  if (!quiet) console.log(message);
};

/**
 * Print dry-run preview of config and YAML
 * @param {import('./config.js').CmsConfig} config - CMS configuration
 */
const printDryRun = (config) => {
  console.log("Configuration (dry run):\n");
  console.log(JSON.stringify(config, null, 2));
  console.log("\nGenerated YAML preview:\n");
  console.log(generateCompactYaml(config));
};

/**
 * Get list of enabled feature names from config
 * @param {import('./config.js').CmsConfig} config - CMS configuration
 * @returns {string[]} List of enabled feature names
 */
const getEnabledFeatures = (config) =>
  Object.entries(config.features)
    .filter(([, v]) => v)
    .map(([k]) => k);

/**
 * Log config summary (collections and features)
 * @param {import('./config.js').CmsConfig} config - CMS configuration
 * @param {string} message - Header message
 * @param {boolean} quiet - Whether to suppress output
 */
const logConfigSummary = (config, message, quiet) => {
  log(message, quiet);
  log(`  Collections: ${config.collections.join(", ")}`, quiet);

  const enabledFeatures = getEnabledFeatures(config);
  if (enabledFeatures.length > 0) {
    log(`  Features: ${enabledFeatures.join(", ")}`, quiet);
  }
};

/**
 * Run in interactive mode with prompts
 * @returns {Promise<void>}
 */
const runInteractive = async () => {
  const existingConfig = await loadCmsConfig();

  console.log("\n=== Chobble Template CMS Customisation ===\n");

  if (existingConfig) {
    console.log(
      "Found existing configuration. Your previous choices will be used as defaults.\n",
    );
  }

  const config = await askQuestions(existingConfig);

  await saveCmsConfig(config);
  await writePagesYaml(generateCompactYaml(config));

  console.log("\n.pages.yml has been updated!");
  console.log("Your configuration has been saved to src/_data/site.json");
};

/**
 * Run in regenerate mode using saved config
 * @param {Object} values - Parsed CLI argument values
 * @returns {Promise<void>}
 */
const runRegenerate = async (values) => {
  const options = getCliOptions(values);
  const config = await loadCmsConfig();

  if (!config) {
    throw new Error(
      "No saved configuration found in site.json. Run without --regenerate first to create one.",
    );
  }

  if (options.dryRun) {
    printDryRun(config);
    return;
  }

  await writePagesYaml(generateCompactYaml(config));
  logConfigSummary(
    config,
    ".pages.yml has been regenerated from saved config!",
    options.quiet,
  );
};

/**
 * Run in non-interactive mode using CLI flags
 * @param {Object} values - Parsed CLI argument values
 * @returns {Promise<void>}
 */
const runNonInteractive = async (values) => {
  const config = buildConfigFromCli(values);
  const options = getCliOptions(values);

  if (options.dryRun) {
    printDryRun(config);
    return;
  }

  if (options.saveConfig) {
    await saveCmsConfig(config);
    log("Configuration saved to site.json", options.quiet);
  }

  await writePagesYaml(generateCompactYaml(config));
  logConfigSummary(config, "\n.pages.yml has been updated!", options.quiet);
};

/**
 * Main entry point
 * @returns {Promise<void>}
 */
const main = async () => {
  let values;

  try {
    const parsed = parseCliArguments();
    values = parsed.values;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error("Use --help for usage information.");
    process.exit(1);
  }

  // Handle --help
  if (values.help) {
    showHelp();
  }

  // Handle --list-* options
  if (handleListOptions(values)) {
    process.exit(0);
  }

  // Determine mode based on flags
  if (values.regenerate) {
    await runRegenerate(values);
  } else if (hasCliFlags(values)) {
    await runNonInteractive(values);
  } else {
    await runInteractive();
  }
};

runWithErrorHandling(main);
