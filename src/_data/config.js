/** @typedef {import("#lib/types.js").SiteConfig} SiteConfig */

import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
  validateCartConfig,
} from "#config/helpers.js";
import { pickNonNull } from "#utils/object-entries.js";
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
};

validateCartConfig(config);

/**
 * Get site configuration with defaults applied.
 * For use in Eleventy data cascade (called as function).
 * @returns {SiteConfig} Fully merged site configuration
 */
export default function () {
  return config;
}
