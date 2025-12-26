// Generates a JSON script tag with site config for JavaScript consumption
// Only includes keys that have non-null values

const JS_CONFIG_KEYS = ["cart_mode", "checkout_api_url"];

// Core function to build the config script HTML - exported for use in tests
export function buildJsConfigScript(config) {
  const jsConfig = {};
  for (const key of JS_CONFIG_KEYS) {
    if (config[key] != null) {
      jsConfig[key] = config[key];
    }
  }
  return `<script id="site-config" type="application/json">${JSON.stringify(jsConfig)}</script>`;
}

export function configureJsConfig(eleventyConfig) {
  eleventyConfig.addShortcode("jsConfigScript", function () {
    const config = this.ctx.config || {};
    return buildJsConfigScript(config);
  });
}
