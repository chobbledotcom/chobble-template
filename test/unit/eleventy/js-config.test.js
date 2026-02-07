import { describe, expect, test } from "bun:test";
import getConfig from "#data/config.js";
import { configureJsConfig } from "#eleventy/js-config.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

/**
 * Helper to get the jsConfigJson filter via Eleventy registration
 */
const getJsConfigFilter = () => {
  const mockConfig = createMockEleventyConfig();
  configureJsConfig(mockConfig);
  return mockConfig.filters.jsConfigJson;
};

describe("js-config", () => {
  test("Returns empty JSON object for empty config", () => {
    const jsConfigJson = getJsConfigFilter();
    const result = jsConfigJson({});
    expect(result).toBe("{}");
  });

  test("Excludes keys with null values", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: null,
      ecommerce_api_host: null,
    };
    const result = jsConfigJson(config);
    expect(result).toBe("{}");
  });

  test("Includes only cart_mode when ecommerce_api_host is null", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: "quote",
      ecommerce_api_host: null,
    };
    const result = jsConfigJson(config);
    expect(result).toBe('{"cart_mode":"quote"}');
  });

  test("Includes only ecommerce_api_host when cart_mode is null", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: null,
      ecommerce_api_host: "api.example.com",
    };
    const result = jsConfigJson(config);
    expect(result).toBe('{"ecommerce_api_host":"api.example.com"}');
  });

  test("Includes both cart_mode and ecommerce_api_host when set", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: "stripe",
      ecommerce_api_host: "api.example.com",
    };
    const result = jsConfigJson(config);
    expect(result.includes('"cart_mode":"stripe"')).toBe(true);
    expect(result.includes('"ecommerce_api_host":"api.example.com"')).toBe(
      true,
    );
  });

  test("Only includes specified config keys", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: "stripe",
      ecommerce_api_host: "api.example.com",
      currency: "GBP",
      extra_key: "should be ignored",
      formspark_id: "also ignored",
    };
    const result = jsConfigJson(config);
    expect(result.includes("extra_key")).toBe(false);
    expect(result.includes("formspark_id")).toBe(false);
    expect(result.includes("cart_mode")).toBe(true);
    expect(result.includes("ecommerce_api_host")).toBe(true);
    expect(result.includes("currency")).toBe(true);
  });

  test("Works with all valid cart modes", () => {
    const jsConfigJson = getJsConfigFilter();
    const validModes = ["stripe", "quote"];
    for (const mode of validModes) {
      const result = jsConfigJson({ cart_mode: mode });
      expect(result.includes(`"cart_mode":"${mode}"`)).toBe(true);
    }
  });

  test("Returns valid JSON string", () => {
    const jsConfigJson = getJsConfigFilter();
    const result = jsConfigJson({ cart_mode: "quote" });
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test("Registers jsConfigJson filter on eleventyConfig", () => {
    const mockConfig = createMockEleventyConfig();
    configureJsConfig(mockConfig);

    expect(typeof mockConfig.filters.jsConfigJson).toBe("function");
  });

  test("Filter returns JSON based on config input", () => {
    const jsConfigJson = getJsConfigFilter();
    const result = jsConfigJson({ cart_mode: "stripe" });

    expect(() => JSON.parse(result)).not.toThrow();
    expect(result.includes('"cart_mode":"stripe"')).toBe(true);
  });

  test("Filter output matches expected values from config", () => {
    const jsConfigJson = getJsConfigFilter();
    const actualConfig = getConfig();
    const result = jsConfigJson(actualConfig);

    const parsed = JSON.parse(result);

    // Check that the values match the actual config
    if (actualConfig.cart_mode) {
      expect(parsed.cart_mode).toBe(actualConfig.cart_mode);
    }
    if (actualConfig.ecommerce_api_host) {
      expect(parsed.ecommerce_api_host).toBe(actualConfig.ecommerce_api_host);
    }
  });

  test("Handles hostnames with subdomains correctly", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: "stripe",
      ecommerce_api_host: "ecom.shop.example.com",
    };
    const result = jsConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.ecommerce_api_host).toBe("ecom.shop.example.com");
  });

  test("Excludes keys with undefined values", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: undefined,
      ecommerce_api_host: "api.example.com",
    };
    const result = jsConfigJson(config);
    const parsed = JSON.parse(result);

    expect(parsed.cart_mode).toBe(undefined);
    expect(parsed.ecommerce_api_host).toBe("api.example.com");
  });

  test("Filter does not modify input config objects", () => {
    const jsConfigJson = getJsConfigFilter();
    const config = {
      cart_mode: "quote",
      ecommerce_api_host: "api.example.com",
      extra: "value",
    };
    const configCopy = JSON.stringify(config);

    jsConfigJson(config);

    expect(JSON.stringify(config)).toBe(configCopy);
  });
});
