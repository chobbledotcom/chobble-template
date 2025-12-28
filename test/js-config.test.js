import getConfig from "#data/config.js";
import { buildJsConfigScript, configureJsConfig } from "#eleventy/js-config.js";
import {
  createMockEleventyConfig,
  createTestRunner,
  expectFalse,
  expectFunctionType,
  expectStrictEqual,
  expectTrue,
} from "./test-utils.js";

const testCases = [
  {
    name: "buildJsConfigScript-empty-config",
    description: "Returns empty JSON object for empty config",
    test: () => {
      const result = buildJsConfigScript({});
      expectStrictEqual(
        result,
        '<script id="site-config" type="application/json">{}</script>',
        "Should produce empty JSON object script",
      );
    },
  },
  {
    name: "buildJsConfigScript-null-values",
    description: "Excludes keys with null values",
    test: () => {
      const config = {
        cart_mode: null,
        checkout_api_url: null,
      };
      const result = buildJsConfigScript(config);
      expectStrictEqual(
        result,
        '<script id="site-config" type="application/json">{}</script>',
        "Should exclude null values",
      );
    },
  },
  {
    name: "buildJsConfigScript-cart-mode-only",
    description: "Includes only cart_mode when checkout_api_url is null",
    test: () => {
      const config = {
        cart_mode: "quote",
        checkout_api_url: null,
      };
      const result = buildJsConfigScript(config);
      expectStrictEqual(
        result,
        '<script id="site-config" type="application/json">{"cart_mode":"quote"}</script>',
        "Should include only cart_mode",
      );
    },
  },
  {
    name: "buildJsConfigScript-checkout-api-url-only",
    description: "Includes only checkout_api_url when cart_mode is null",
    test: () => {
      const config = {
        cart_mode: null,
        checkout_api_url: "https://api.example.com",
      };
      const result = buildJsConfigScript(config);
      expectStrictEqual(
        result,
        '<script id="site-config" type="application/json">{"checkout_api_url":"https://api.example.com"}</script>',
        "Should include only checkout_api_url",
      );
    },
  },
  {
    name: "buildJsConfigScript-both-values",
    description: "Includes both cart_mode and checkout_api_url when set",
    test: () => {
      const config = {
        cart_mode: "stripe",
        checkout_api_url: "https://api.example.com",
      };
      const result = buildJsConfigScript(config);
      expectTrue(
        result.includes('"cart_mode":"stripe"'),
        "Should include cart_mode",
      );
      expectTrue(
        result.includes('"checkout_api_url":"https://api.example.com"'),
        "Should include checkout_api_url",
      );
    },
  },
  {
    name: "buildJsConfigScript-ignores-extra-keys",
    description: "Only includes specified config keys",
    test: () => {
      const config = {
        cart_mode: "paypal",
        checkout_api_url: "https://api.example.com",
        extra_key: "should be ignored",
        formspark_id: "also ignored",
      };
      const result = buildJsConfigScript(config);
      expectFalse(result.includes("extra_key"), "Should not include extra_key");
      expectFalse(
        result.includes("formspark_id"),
        "Should not include formspark_id",
      );
      expectTrue(result.includes("cart_mode"), "Should include cart_mode");
      expectTrue(
        result.includes("checkout_api_url"),
        "Should include checkout_api_url",
      );
    },
  },
  {
    name: "buildJsConfigScript-valid-cart-modes",
    description: "Works with all valid cart modes",
    test: () => {
      const validModes = ["paypal", "stripe", "quote"];
      for (const mode of validModes) {
        const result = buildJsConfigScript({ cart_mode: mode });
        expectTrue(
          result.includes(`"cart_mode":"${mode}"`),
          `Should include cart_mode: ${mode}`,
        );
      }
    },
  },
  {
    name: "buildJsConfigScript-script-tag-attributes",
    description: "Generates script tag with correct id and type",
    test: () => {
      const result = buildJsConfigScript({ cart_mode: "quote" });
      expectTrue(
        result.startsWith('<script id="site-config"'),
        "Should have correct id",
      );
      expectTrue(
        result.includes('type="application/json"'),
        "Should have correct type",
      );
      expectTrue(result.endsWith("</script>"), "Should close script tag");
    },
  },
  {
    name: "configureJsConfig-registers-shortcode",
    description: "Registers jsConfigScript shortcode on eleventyConfig",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureJsConfig(mockConfig);

      expectFunctionType(
        mockConfig.shortcodes,
        "jsConfigScript",
        "Should register jsConfigScript shortcode",
      );
    },
  },
  {
    name: "configureJsConfig-shortcode-uses-config",
    description: "Shortcode returns script based on actual config",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureJsConfig(mockConfig);

      // Call the shortcode with a mock context (the shortcode imports config directly)
      const shortcodeFn = mockConfig.shortcodes.jsConfigScript;
      const result = shortcodeFn.call({});

      // The result should be a valid script tag
      expectTrue(
        result.startsWith('<script id="site-config"'),
        "Should produce script tag",
      );
      expectTrue(
        result.includes('type="application/json"'),
        "Should have correct type",
      );
      expectTrue(result.endsWith("</script>"), "Should close script tag");
    },
  },
  {
    name: "configureJsConfig-shortcode-matches-config",
    description: "Shortcode output matches expected values from config",
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureJsConfig(mockConfig);

      const shortcodeFn = mockConfig.shortcodes.jsConfigScript;
      const result = shortcodeFn.call({});

      // Parse the JSON from the result
      const jsonMatch = result.match(/<script[^>]*>(.*)<\/script>/);
      expectTrue(jsonMatch !== null, "Should contain JSON");

      const parsed = JSON.parse(jsonMatch[1]);
      const actualConfig = getConfig();

      // Check that the values match the actual config
      if (actualConfig.cart_mode) {
        expectStrictEqual(
          parsed.cart_mode,
          actualConfig.cart_mode,
          "cart_mode should match config",
        );
      }
      if (actualConfig.checkout_api_url) {
        expectStrictEqual(
          parsed.checkout_api_url,
          actualConfig.checkout_api_url,
          "checkout_api_url should match config",
        );
      }
    },
  },
  {
    name: "buildJsConfigScript-special-characters",
    description: "Handles special characters in URLs correctly",
    test: () => {
      const config = {
        cart_mode: "stripe",
        checkout_api_url: "https://api.example.com/path?foo=bar&baz=qux",
      };
      const result = buildJsConfigScript(config);
      const jsonMatch = result.match(/<script[^>]*>(.*)<\/script>/);
      const parsed = JSON.parse(jsonMatch[1]);

      expectStrictEqual(
        parsed.checkout_api_url,
        "https://api.example.com/path?foo=bar&baz=qux",
        "Should preserve special characters in URL",
      );
    },
  },
  {
    name: "buildJsConfigScript-undefined-values",
    description: "Excludes keys with undefined values",
    test: () => {
      const config = {
        cart_mode: undefined,
        checkout_api_url: "https://api.example.com",
      };
      const result = buildJsConfigScript(config);
      const jsonMatch = result.match(/<script[^>]*>(.*)<\/script>/);
      const parsed = JSON.parse(jsonMatch[1]);

      expectStrictEqual(
        parsed.cart_mode,
        undefined,
        "Should not include undefined cart_mode",
      );
      expectStrictEqual(
        parsed.checkout_api_url,
        "https://api.example.com",
        "Should include checkout_api_url",
      );
    },
  },
  {
    name: "functional-purity",
    description: "Functions do not modify input config objects",
    test: () => {
      const config = {
        cart_mode: "quote",
        checkout_api_url: "https://api.example.com",
        extra: "value",
      };
      const configCopy = JSON.stringify(config);

      buildJsConfigScript(config);

      expectStrictEqual(
        JSON.stringify(config),
        configCopy,
        "Should not modify input config",
      );
    },
  },
];

export default createTestRunner("js-config", testCases);
