/** @typedef {import("#lib/types").SiteConfig} SiteConfig */

// Import validated-config to trigger validation at startup
import "#config/validated-config.js";
import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
} from "#config/helpers.js";
import { pickNonNull } from "#toolkit/fp/object.js";
import configData from "./config.json" with { type: "json" };

const products = { ...DEFAULT_PRODUCT_DATA, ...getProducts(configData) };
const userConfig = pickNonNull(configData);
const baseConfig = {
  ...DEFAULTS,
  ...userConfig,
  products,
};

/** @type {SiteConfig} */
const config = {
  ...baseConfig,
  form_target: getFormTarget(baseConfig),
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
