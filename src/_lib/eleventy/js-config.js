// Generates a JSON script tag with site config for JavaScript consumption
// Only includes keys that have non-null values

import getConfig from "#data/config.js";
import { toObject } from "#utils/object-entries.js";

const JS_CONFIG_KEYS = ["cart_mode", "checkout_api_url", "product_mode"];

const isDefined = (config) => (key) => config[key] != null;
const toConfigEntry = (config) => (key) => [key, config[key]];

// Core function to build the config script HTML - exported for use in tests
export function buildJsConfigScript(config) {
  const jsConfig = toObject(
    JS_CONFIG_KEYS.filter(isDefined(config)),
    toConfigEntry(config),
  );
  return `<script id="site-config" type="application/json">${JSON.stringify(jsConfig)}</script>`;
}

export function configureJsConfig(eleventyConfig) {
  eleventyConfig.addShortcode("jsConfigScript", () => {
    // Import config directly rather than relying on template context
    // which may not be reliably available in all build contexts
    const config = getConfig();
    return buildJsConfigScript(config);
  });
}
