/**
 * CLI argument parsing for non-interactive CMS customisation
 *
 * Allows the script to be run non-interactively with flags,
 * suitable for automation and LLM agents.
 */

import { parseCliArguments, showHelp } from "#scripts/customise-cms/cli-io.js";
import {
  COLLECTIONS,
  getRequiredCollections,
  resolveDependencies,
} from "#scripts/customise-cms/collections.js";
import { createDefaultConfig } from "#scripts/customise-cms/config.js";
import { map, unique } from "#toolkit/fp/array.js";

// Re-export I/O functions from cli-io.js
export { parseCliArguments, showHelp };

/**
 * All available feature names
 * @type {string[]}
 */
const ALL_FEATURES = [
  "permalinks",
  "redirects",
  "faqs",
  "specs",
  "features",
  "galleries",
  "add_ons",
  "header_images",
  "external_navigation_urls",
  "external_purchases",
  "event_locations_and_dates",
  "use_visual_editor",
  "no_index",
  "parent_categories",
  "videos",
  "below_products",
];

/**
 * All available collection names
 * @type {string[]}
 */
const ALL_COLLECTIONS = map((c) => c.name)(COLLECTIONS);

/**
 * Generate usage help text
 * @returns {string} Help text
 */
const generateHelp = () => `
CMS Customisation Script - Non-Interactive Mode

Usage: bun run customise-cms [options]

When no options are provided, runs in interactive mode.

OPTIONS:
  -h, --help              Show this help message
  -r, --regenerate        Regenerate .pages.yml using saved config from site.json
  -a, --all               Enable all collections and all features
  -c, --collections LIST  Comma-separated list of collections to enable
  -e, --enable LIST       Comma-separated list of features to enable
  -d, --disable LIST      Comma-separated list of features to disable

TEMPLATE STRUCTURE:
  --src-folder            Template has a 'src' folder (default)
  --no-src-folder         Template does not have a 'src' folder
  --custom-home           Template has a custom home.html layout
  --no-custom-home        Template uses default homepage (default)

OUTPUT CONTROL:
  --save-config           Save config to site.json (default)
  --no-save-config        Don't save config to site.json
  --dry-run               Print config without writing files
  -q, --quiet             Suppress output messages

DISCOVERY:
  --list-collections      List all available collections and exit
  --list-features         List all available features and exit

COLLECTIONS:
  ${ALL_COLLECTIONS.join(", ")}

FEATURES:
  ${ALL_FEATURES.join(", ")}

EXAMPLES:
  # Regenerate .pages.yml using saved config (after updating generator)
  bun run customise-cms --regenerate

  # Enable products, categories, and news with FAQs and galleries
  bun run customise-cms --collections products,categories,news --enable faqs,galleries

  # Enable all collections but disable visual editor
  bun run customise-cms --all --disable use_visual_editor

  # Preview configuration without saving
  bun run customise-cms --collections pages,products,categories --dry-run

  # Use all defaults for a simple site
  bun run customise-cms --collections products,categories
`;

/**
 * Parse a comma-separated string into an array of trimmed values
 * @param {string | undefined} input - Comma-separated string
 * @returns {string[]} Array of trimmed values
 */
const parseCommaSeparated = (input) => {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

/**
 * Validate collection names
 * @param {string[]} collections - Collection names to validate
 * @throws {Error} If any collection name is invalid
 */
const validateCollections = (collections) => {
  for (const name of collections) {
    if (!ALL_COLLECTIONS.includes(name)) {
      throw new Error(
        `Unknown collection: "${name}". Use --list-collections to see available options.`,
      );
    }
  }
};

/**
 * Validate feature names
 * @param {string[]} features - Feature names to validate
 * @throws {Error} If any feature name is invalid
 */
const validateFeatures = (features) => {
  for (const name of features) {
    if (!ALL_FEATURES.includes(name)) {
      throw new Error(
        `Unknown feature: "${name}". Use --list-features to see available options.`,
      );
    }
  }
};

/**
 * Check if any CLI flags were provided (excluding help and list options)
 * @param {Object} values - Parsed CLI values
 * @returns {boolean} True if non-interactive mode should be used
 */
export const hasCliFlags = (values) => {
  const nonInteractiveFlags = [
    "regenerate",
    "collections",
    "all",
    "enable",
    "disable",
    "src-folder",
    "no-src-folder",
    "custom-home",
    "no-custom-home",
    "save-config",
    "no-save-config",
    "dry-run",
    "quiet",
  ];

  return nonInteractiveFlags.some((flag) => values[flag] != null);
};

/**
 * Format a collection for display with optional flags
 * @param {Object} collection - Collection definition
 * @returns {string} Formatted collection string
 */
const formatCollection = (collection) => {
  const flags = [];
  if (collection.required) flags.push("required");
  if (collection.internal) flags.push("internal");
  const flagStr = flags.length > 0 ? ` (${flags.join(", ")})` : "";
  return `  ${collection.name}${flagStr}\n    ${collection.description}`;
};

/**
 * List all available collections
 */
const listCollections = () => {
  console.log("Available collections:\n");
  for (const collection of COLLECTIONS) {
    console.log(formatCollection(collection));
  }
};

/**
 * List all available features
 */
const listFeatures = () => {
  console.log("Available features:\n");
  for (const feature of ALL_FEATURES) {
    console.log(`  ${feature}`);
  }
};

/**
 * Handle list options (--list-collections, --list-features)
 * @param {Object} values - Parsed CLI values
 * @returns {boolean} True if a list was displayed and we should exit
 */
export const handleListOptions = (values) => {
  if (values["list-collections"]) {
    listCollections();
    return true;
  }
  if (values["list-features"]) {
    listFeatures();
    return true;
  }
  return false;
};

/**
 * Build collections list from CLI values
 * @param {Object} values - Parsed CLI values
 * @param {Object|null} baseConfig - Base config if --all was used
 * @returns {string[]} List of collection names
 */
const buildCollections = (values, baseConfig) => {
  if (values.all) return baseConfig.collections;

  const requestedCollections = parseCommaSeparated(values.collections);
  validateCollections(requestedCollections);

  const requiredNames = map((c) => c.name)(getRequiredCollections());
  return resolveDependencies(
    unique([...requiredNames, ...requestedCollections]),
  );
};

/**
 * Create base features object (all enabled or all disabled)
 * @param {boolean} allEnabled - Whether to enable all features
 * @param {Object|null} baseConfig - Base config if --all was used
 * @returns {Object} Features object
 */
const createBaseFeatures = (allEnabled, baseConfig) => {
  if (allEnabled) return { ...baseConfig.features };

  const features = {};
  for (const f of ALL_FEATURES) {
    features[f] = false;
  }
  return features;
};

/**
 * Apply feature overrides (enables and disables) to features object
 * @param {Object} features - Features object to modify
 * @param {string[]} enables - Features to enable
 * @param {string[]} disables - Features to disable
 * @returns {Object} Modified features object
 */
const applyFeatureOverrides = (features, enables, disables) => {
  for (const f of enables) features[f] = true;
  for (const f of disables) features[f] = false;
  return features;
};

/**
 * Resolve boolean flag pair (e.g., --src-folder / --no-src-folder)
 * @param {Object} values - Parsed CLI values
 * @param {string} positiveFlag - Name of positive flag
 * @param {string} negativeFlag - Name of negative flag
 * @param {boolean} defaultValue - Default value if neither is set
 * @returns {boolean} Resolved value
 */
const resolveBooleanFlag = (
  values,
  positiveFlag,
  negativeFlag,
  defaultValue,
) => {
  if (values[negativeFlag]) return false;
  if (values[positiveFlag]) return true;
  return defaultValue;
};

/**
 * Build CMS config from CLI arguments
 * @param {Object} values - Parsed CLI values
 * @returns {import('./config.js').CmsConfig} CMS configuration
 */
export const buildConfigFromCli = (values) => {
  const baseConfig = values.all ? createDefaultConfig() : null;
  const collections = buildCollections(values, baseConfig);

  const enabledFeatures = parseCommaSeparated(values.enable);
  const disabledFeatures = parseCommaSeparated(values.disable);
  validateFeatures(enabledFeatures);
  validateFeatures(disabledFeatures);

  const features = applyFeatureOverrides(
    createBaseFeatures(values.all, baseConfig),
    enabledFeatures,
    disabledFeatures,
  );

  return {
    collections,
    features,
    hasSrcFolder: resolveBooleanFlag(
      values,
      "src-folder",
      "no-src-folder",
      true,
    ),
    customHomePage: resolveBooleanFlag(
      values,
      "custom-home",
      "no-custom-home",
      false,
    ),
  };
};

/**
 * Get CLI options
 * @param {Object} values - Parsed CLI values
 * @returns {Object} CLI options object
 */
export const getCliOptions = (values) => ({
  saveConfig: values["no-save-config"] !== true,
  dryRun: values["dry-run"] === true,
  quiet: values.quiet === true,
});

/**
 * Export for testing
 */
export { ALL_COLLECTIONS, ALL_FEATURES, formatCollection, generateHelp };
