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
import {
  createDefaultConfig,
  createEmptyConfig,
} from "#scripts/customise-cms/config.js";
import { map, unique } from "#utils/fp/array.js";

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
  "galleries",
  "external_navigation_urls",
  "no_index",
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

Usage: npm run customise-cms -- [options]

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

BLOCKS LAYOUT:
  --custom-blocks-collections LIST  Comma-separated custom blocks collections (e.g., clients,services)

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
  npm run customise-cms -- --regenerate

  # Enable news and guides with FAQs and galleries
  npm run customise-cms -- --collections news,guide-categories,guide-pages --enable faqs,galleries

  # Enable all collections but leave out FAQs
  npm run customise-cms -- --all --disable faqs

  # Preview configuration without saving
  npm run customise-cms -- --collections pages,news --dry-run

  # Use all defaults for a simple site
  npm run customise-cms -- --collections news
`;

/**
 * Parse a comma-separated string into an array of trimmed values
 * @param {string | undefined} input - Comma-separated string
 * @returns {string[]} Array of trimmed values
 */
const parseCommaSeparated = (input) =>
  input
    ? input
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

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
 * @param {Record<string, any>} values - Parsed CLI values
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
    "custom-blocks-collections",
    "save-config",
    "no-save-config",
    "dry-run",
    "quiet",
  ];

  return nonInteractiveFlags.some((flag) => values[flag] != null);
};

/**
 * Format a collection for display with optional flags
 * @param {{ name: string, description: string, required?: boolean, internal?: boolean }} collection - Collection definition
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
 * @param {Record<string, any>} values - Parsed CLI values
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
 * @param {Record<string, any>} values - Parsed CLI values
 * @param {import('./config.js').CmsConfig | null} baseConfig - Base config if --all was used
 * @returns {string[]} List of collection names
 */
const buildCollections = (values, baseConfig) => {
  if (values.all) {
    if (!baseConfig) throw new Error("--all requires a base config");
    return baseConfig.collections;
  }

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
 * @param {import('./config.js').CmsConfig | null} baseConfig - Base config if --all was used
 * @returns {import('./config.js').CmsFeatures} Features object
 */
const createBaseFeatures = (allEnabled, baseConfig) => {
  if (!allEnabled) return createEmptyConfig().features;
  if (!baseConfig) throw new Error("--all requires a base config");
  return { ...baseConfig.features };
};

/**
 * Apply feature overrides (enables and disables) to a features object,
 * returning a new object (validateFeatures has vetted every name).
 * @param {import('./config.js').CmsFeatures} features - Base feature flags
 * @param {string[]} enables - Features to enable
 * @param {string[]} disables - Features to disable
 * @returns {import('./config.js').CmsFeatures} Modified features object
 */
const applyFeatureOverrides = (features, enables, disables) => ({
  ...features,
  ...Object.fromEntries(enables.map((f) => [f, true])),
  ...Object.fromEntries(disables.map((f) => [f, false])),
});

/**
 * Resolve boolean flag pair (e.g., --src-folder / --no-src-folder)
 * @param {Record<string, any>} values - Parsed CLI values
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
 * Resolve the feature set from the --all/--enable/--disable flags
 * @param {Record<string, any>} values - Parsed CLI values
 * @param {import('./config.js').CmsConfig | null} baseConfig
 */
const buildFeaturesFromCli = (values, baseConfig) => {
  const enabledFeatures = parseCommaSeparated(values.enable);
  const disabledFeatures = parseCommaSeparated(values.disable);
  validateFeatures(enabledFeatures);
  validateFeatures(disabledFeatures);
  return applyFeatureOverrides(
    createBaseFeatures(values.all, baseConfig),
    enabledFeatures,
    disabledFeatures,
  );
};

/**
 * Build CMS config from CLI arguments
 * @param {Record<string, any>} values - Parsed CLI values
 * @returns {import('./config.js').CmsConfig} CMS configuration
 */
export const buildConfigFromCli = (values) => {
  const baseConfig = values.all ? createDefaultConfig() : null;

  return {
    collections: buildCollections(values, baseConfig),
    features: buildFeaturesFromCli(values, baseConfig),
    hasSrcFolder: resolveBooleanFlag(
      values,
      "src-folder",
      "no-src-folder",
      true,
    ),
    customBlocksCollections: parseCommaSeparated(
      values["custom-blocks-collections"],
    ),
  };
};

/**
 * Get CLI options
 * @param {Record<string, any>} values - Parsed CLI values
 * @returns {{ saveConfig: boolean, dryRun: boolean, quiet: boolean }} CLI options object
 */
export const getCliOptions = (values) => ({
  saveConfig: values["no-save-config"] !== true,
  dryRun: values["dry-run"] === true,
  quiet: values.quiet === true,
});

export { generateHelp };
