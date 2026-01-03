import { describe, test, expect } from "bun:test";
import getConfig from "#data/config.js";
import { buildJsConfigScript, configureJsConfig } from "#eleventy/js-config.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("js-config", () => {
  test("Returns empty JSON object for empty config", () => {
    const result = buildJsConfigScript({});
    expect(result).toBe(
      '<script id="site-config" type="application/json">{}</script>',
    );
  });

  test("Excludes keys with null values", () => {
    const config = {
      cart_mode: null,
      checkout_api_url: null,
    };
    const result = buildJsConfigScript(config);
    expect(result).toBe(
      '<script id="site-config" type="application/json">{}</script>',
    );
  });

  test("Includes only cart_mode when checkout_api_url is null", () => {
    const config = {
      cart_mode: "quote",
      checkout_api_url: null,
    };
    const result = buildJsConfigScript(config);
    expect(result).toBe(
      '<script id="site-config" type="application/json">{"cart_mode":"quote"}</script>',
    );
  });

  test("Includes only checkout_api_url when cart_mode is null", () => {
    const config = {
      cart_mode: null,
      checkout_api_url: "https://api.example.com",
    };
    const result = buildJsConfigScript(config);
    expect(result).toBe(
      '<script id="site-config" type="application/json">{"checkout_api_url":"https://api.example.com"}</script>',
    );
  });

  test("Includes both cart_mode and checkout_api_url when set", () => {
    const config = {
      cart_mode: "stripe",
      checkout_api_url: "https://api.example.com",
    };
    const result = buildJsConfigScript(config);
    expect(result.includes('"cart_mode":"stripe"')).toBe(true);
    expect(result.includes('"checkout_api_url":"https://api.example.com"')).toBe(true);
  });

  test("Only includes specified config keys", () => {
    const config = {
      cart_mode: "paypal",
      checkout_api_url: "https://api.example.com",
      extra_key: "should be ignored",
      formspark_id: "also ignored",
    };
    const result = buildJsConfigScript(config);
    expect(result.includes("extra_key")).toBe(false);
    expect(result.includes("formspark_id")).toBe(false);
    expect(result.includes("cart_mode")).toBe(true);
    expect(result.includes("checkout_api_url")).toBe(true);
  });

  test("Works with all valid cart modes", () => {
    const validModes = ["paypal", "stripe", "quote"];
    for (const mode of validModes) {
      const result = buildJsConfigScript({ cart_mode: mode });
      expect(result.includes(`"cart_mode":"${mode}"`)).toBe(true);
    }
  });

  test("Generates script tag with correct id and type", () => {
    const result = buildJsConfigScript({ cart_mode: "quote" });
    expect(result.startsWith('<script id="site-config"')).toBe(true);
    expect(result.includes('type="application/json"')).toBe(true);
    expect(result.endsWith("</script>")).toBe(true);
  });

  test("Registers jsConfigScript shortcode on eleventyConfig", () => {
    const mockConfig = createMockEleventyConfig();
    configureJsConfig(mockConfig);

    expect(typeof mockConfig.shortcodes.jsConfigScript).toBe("function");
  });

  test("Shortcode returns script based on actual config", () => {
    const mockConfig = createMockEleventyConfig();
    configureJsConfig(mockConfig);

    // Call the shortcode with a mock context (the shortcode imports config directly)
    const shortcodeFn = mockConfig.shortcodes.jsConfigScript;
    const result = shortcodeFn.call({});

    // The result should be a valid script tag
    expect(result.startsWith('<script id="site-config"')).toBe(true);
    expect(result.includes('type="application/json"')).toBe(true);
    expect(result.endsWith("</script>")).toBe(true);
  });

  test("Shortcode output matches expected values from config", () => {
    const mockConfig = createMockEleventyConfig();
    configureJsConfig(mockConfig);

    const shortcodeFn = mockConfig.shortcodes.jsConfigScript;
    const result = shortcodeFn.call({});

    // Parse the JSON from the result
    const jsonMatch = result.match(/<script[^>]*>(.*)<\/script>/);
    expect(jsonMatch !== null).toBe(true);

    const parsed = JSON.parse(jsonMatch[1]);
    const actualConfig = getConfig();

    // Check that the values match the actual config
    if (actualConfig.cart_mode) {
      expect(parsed.cart_mode).toBe(actualConfig.cart_mode);
    }
    if (actualConfig.checkout_api_url) {
      expect(parsed.checkout_api_url).toBe(actualConfig.checkout_api_url);
    }
  });

  test("Handles special characters in URLs correctly", () => {
    const config = {
      cart_mode: "stripe",
      checkout_api_url: "https://api.example.com/path?foo=bar&baz=qux",
    };
    const result = buildJsConfigScript(config);
    const jsonMatch = result.match(/<script[^>]*>(.*)<\/script>/);
    const parsed = JSON.parse(jsonMatch[1]);

    expect(parsed.checkout_api_url).toBe(
      "https://api.example.com/path?foo=bar&baz=qux",
    );
  });

  test("Excludes keys with undefined values", () => {
    const config = {
      cart_mode: undefined,
      checkout_api_url: "https://api.example.com",
    };
    const result = buildJsConfigScript(config);
    const jsonMatch = result.match(/<script[^>]*>(.*)<\/script>/);
    const parsed = JSON.parse(jsonMatch[1]);

    expect(parsed.cart_mode).toBe(undefined);
    expect(parsed.checkout_api_url).toBe("https://api.example.com");
  });

  test("Functions do not modify input config objects", () => {
    const config = {
      cart_mode: "quote",
      checkout_api_url: "https://api.example.com",
      extra: "value",
    };
    const configCopy = JSON.stringify(config);

    buildJsConfigScript(config);

    expect(JSON.stringify(config)).toBe(configCopy);
  });
});
