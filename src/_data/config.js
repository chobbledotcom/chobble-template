/** @typedef {import("#lib/types").SiteConfig} SiteConfig */

// Import validated-config to trigger validation at startup
import "#config/validated-config.js";
import { DEFAULTS } from "#config/config-schema.js";
import { pickNonNull } from "#utils/fp/object.js";
import configData from "./config.json" with { type: "json" };

const userConfig = pickNonNull(configData);
// validated-config has checked every set value against #config/config-schema.js,
// so the merged object is the declared type rather than the JSON's inference.
const baseConfig = /** @type {Omit<SiteConfig, "internal_link_suffix">} */ ({
  ...DEFAULTS,
  ...userConfig,
});

/** @type {SiteConfig} */
const config = {
  ...baseConfig,
  internal_link_suffix: baseConfig.navigation_content_anchor ? "#content" : "",
};

/**
 * Get site configuration with defaults applied.
 * For use in Eleventy data cascade (called as function).
 * @returns {SiteConfig} Fully merged site configuration
 */
export default function () {
  return config;
}
