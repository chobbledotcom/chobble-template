/**
 * Typed config getter for JS module imports.
 * Use this instead of importing config.json directly to get typed config with defaults applied.
 *
 * @module #config/site-config
 */

/** @typedef {import("#lib/types.js").SiteConfig} SiteConfig */

import configFn from "#data/config.js";

/**
 * Get site configuration with defaults applied.
 * This is a typed wrapper around the Eleventy data cascade config.
 *
 * @returns {SiteConfig} Fully merged site configuration
 * @example
 * import { getConfig } from "#config/site-config.js";
 * const timezone = getConfig().timezone; // string, guaranteed by DEFAULTS
 */
export const getConfig = configFn;
