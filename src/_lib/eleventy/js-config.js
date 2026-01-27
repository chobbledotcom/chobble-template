// Generates JSON config for JavaScript consumption
// Only includes keys that have non-null values

import { toObject } from "#toolkit/fp/object.js";

const JS_CONFIG_KEYS = ["cart_mode", "checkout_api_url", "product_mode"];

export const configureJsConfig = (eleventyConfig) => {
  eleventyConfig.addFilter("jsConfigJson", (config) => {
    const jsConfig = toObject(
      JS_CONFIG_KEYS.filter((key) => config[key] != null),
      (key) => [key, config[key]],
    );
    return JSON.stringify(jsConfig);
  });
};
