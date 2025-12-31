import {
  cartModeError,
  checkFrontmatterField,
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  extractFrontmatter,
  getFormTarget,
  getPagePath,
  getProducts,
  VALID_CART_MODES,
  validateCartConfig,
} from "#data/config.js";
import {
  cleanupTempDir,
  createTempDir,
  createTempFile,
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectThrows,
  expectTrue,
} from "#test/test-utils.js";

const testCases = [
  // DEFAULTS constant tests
  {
    name: "defaults-is-object",
    description: "DEFAULTS is an object with expected properties",
    test: () => {
      expectStrictEqual(typeof DEFAULTS, "object", "DEFAULTS should be object");
      expectStrictEqual(
        DEFAULTS.sticky_mobile_nav,
        true,
        "sticky_mobile_nav should default to true",
      );
      expectStrictEqual(
        DEFAULTS.horizontal_nav,
        true,
        "horizontal_nav should default to true",
      );
      expectStrictEqual(
        DEFAULTS.homepage_news,
        true,
        "homepage_news should default to true",
      );
      expectStrictEqual(
        DEFAULTS.homepage_products,
        true,
        "homepage_products should default to true",
      );
      expectStrictEqual(
        DEFAULTS.externalLinksTargetBlank,
        false,
        "externalLinksTargetBlank should default to false",
      );
      expectStrictEqual(
        DEFAULTS.contact_form_target,
        null,
        "contact_form_target should default to null",
      );
      expectStrictEqual(
        DEFAULTS.formspark_id,
        null,
        "formspark_id should default to null",
      );
      expectStrictEqual(
        DEFAULTS.botpoison_public_key,
        null,
        "botpoison_public_key should default to null",
      );
      expectStrictEqual(
        DEFAULTS.template_repo_url,
        "https://github.com/chobbledotcom/chobble-template",
        "template_repo_url should have correct default",
      );
      expectStrictEqual(
        DEFAULTS.chobble_link,
        null,
        "chobble_link should default to null",
      );
      expectStrictEqual(
        DEFAULTS.map_embed_src,
        null,
        "map_embed_src should default to null",
      );
      expectStrictEqual(
        DEFAULTS.cart_mode,
        null,
        "cart_mode should default to null",
      );
      expectStrictEqual(
        DEFAULTS.has_products_filter,
        false,
        "has_products_filter should default to false",
      );
    },
  },

  // VALID_CART_MODES constant tests
  {
    name: "valid-cart-modes",
    description: "VALID_CART_MODES contains correct values",
    test: () => {
      expectTrue(Array.isArray(VALID_CART_MODES), "Should be an array");
      expectDeepEqual(
        VALID_CART_MODES,
        ["paypal", "stripe", "quote"],
        "Should contain paypal, stripe, quote",
      );
    },
  },

  // DEFAULT_PRODUCT_DATA constant tests
  {
    name: "default-product-data",
    description: "DEFAULT_PRODUCT_DATA has correct image width defaults",
    test: () => {
      expectStrictEqual(
        DEFAULT_PRODUCT_DATA.item_widths,
        "240,480,640",
        "item_widths should have correct default",
      );
      expectStrictEqual(
        DEFAULT_PRODUCT_DATA.gallery_thumb_widths,
        "240,480",
        "gallery_thumb_widths should have correct default",
      );
      expectStrictEqual(
        DEFAULT_PRODUCT_DATA.gallery_image_widths,
        "900,1300,1800",
        "gallery_image_widths should have correct default",
      );
      expectStrictEqual(
        DEFAULT_PRODUCT_DATA.header_image_widths,
        "640,900,1300",
        "header_image_widths should have correct default",
      );
    },
  },

  // getProducts function tests
  {
    name: "getProducts-empty",
    description: "getProducts returns empty object when no products",
    test: () => {
      const result = getProducts({});
      expectDeepEqual(result, {}, "Should return empty object");
    },
  },
  {
    name: "getProducts-undefined-products",
    description: "getProducts handles undefined products property",
    test: () => {
      const result = getProducts({ other: "value" });
      expectDeepEqual(result, {}, "Should return empty object");
    },
  },
  {
    name: "getProducts-filters-null",
    description: "getProducts filters out null values",
    test: () => {
      const configData = {
        products: {
          item_widths: "100,200",
          gallery_thumb_widths: null,
          custom_field: "value",
        },
      };
      const result = getProducts(configData);
      expectStrictEqual(result.item_widths, "100,200", "Should keep non-null");
      expectStrictEqual(
        result.gallery_thumb_widths,
        undefined,
        "Should filter null",
      );
      expectStrictEqual(result.custom_field, "value", "Should keep non-null");
    },
  },
  {
    name: "getProducts-keeps-all-truthy",
    description: "getProducts keeps all truthy values",
    test: () => {
      const configData = {
        products: {
          a: "string",
          b: 123,
          c: true,
          d: [],
          e: {},
        },
      };
      const result = getProducts(configData);
      expectStrictEqual(result.a, "string", "Should keep string");
      expectStrictEqual(result.b, 123, "Should keep number");
      expectStrictEqual(result.c, true, "Should keep boolean");
      expectDeepEqual(result.d, [], "Should keep array");
      expectDeepEqual(result.e, {}, "Should keep object");
    },
  },

  // getFormTarget function tests
  {
    name: "getFormTarget-contact-form-target",
    description: "getFormTarget returns contact_form_target when set",
    test: () => {
      const configData = {
        contact_form_target: "https://custom-form.com/submit",
        formspark_id: "abc123",
      };
      const result = getFormTarget(configData);
      expectStrictEqual(
        result,
        "https://custom-form.com/submit",
        "Should prefer contact_form_target",
      );
    },
  },
  {
    name: "getFormTarget-formspark-id",
    description: "getFormTarget builds URL from formspark_id when no target",
    test: () => {
      const configData = {
        contact_form_target: null,
        formspark_id: "abc123",
      };
      const result = getFormTarget(configData);
      expectStrictEqual(
        result,
        "https://submit-form.com/abc123",
        "Should build formspark URL",
      );
    },
  },
  {
    name: "getFormTarget-null",
    description: "getFormTarget returns null when neither is set",
    test: () => {
      const configData = {};
      const result = getFormTarget(configData);
      expectStrictEqual(result, null, "Should return null");
    },
  },
  {
    name: "getFormTarget-empty-strings",
    description: "getFormTarget handles empty strings as falsy",
    test: () => {
      const configData = {
        contact_form_target: "",
        formspark_id: "",
      };
      const result = getFormTarget(configData);
      expectStrictEqual(result, null, "Should return null for empty strings");
    },
  },

  // cartModeError function tests
  {
    name: "cartModeError-format",
    description: "cartModeError returns correctly formatted error message",
    test: () => {
      const result = cartModeError("stripe", "checkout.md", "does not exist");
      expectStrictEqual(
        result,
        'cart_mode is "stripe" but src/pages/checkout.md does not exist',
        "Should format error correctly",
      );
    },
  },

  // getPagePath function tests
  {
    name: "getPagePath-format",
    description: "getPagePath returns correct path",
    test: () => {
      const result = getPagePath("test.md");
      expectTrue(
        result.endsWith("pages/test.md"),
        "Should end with pages/filename",
      );
      expectTrue(result.includes("src"), "Should include src directory");
    },
  },

  // extractFrontmatter function tests
  {
    name: "extractFrontmatter-valid",
    description: "extractFrontmatter extracts frontmatter from valid file",
    test: () => {
      const tempDir = createTempDir("config-test");
      const content = `---
layout: test.html
permalink: /test/
---
Content here`;
      const filePath = createTempFile(tempDir, "test.md", content);

      const result = extractFrontmatter(filePath, "test.md", "stripe");
      expectTrue(result.includes("layout: test.html"), "Should contain layout");
      expectTrue(
        result.includes("permalink: /test/"),
        "Should contain permalink",
      );

      cleanupTempDir(tempDir);
    },
  },
  {
    name: "extractFrontmatter-file-not-found",
    description: "extractFrontmatter throws when file does not exist",
    test: () => {
      expectThrows(
        () =>
          extractFrontmatter("/nonexistent/path/file.md", "file.md", "stripe"),
        /does not exist/,
        "Should throw file not found error",
      );
    },
  },
  {
    name: "extractFrontmatter-no-frontmatter",
    description: "extractFrontmatter throws when no frontmatter present",
    test: () => {
      const tempDir = createTempDir("config-test-no-fm");
      const content = "Just plain content without frontmatter";
      const filePath = createTempFile(tempDir, "plain.md", content);

      expectThrows(
        () => extractFrontmatter(filePath, "plain.md", "stripe"),
        /has no frontmatter/,
        "Should throw no frontmatter error",
      );

      cleanupTempDir(tempDir);
    },
  },

  // checkFrontmatterField function tests
  {
    name: "checkFrontmatterField-valid",
    description: "checkFrontmatterField passes when field exists",
    test: () => {
      const frontmatter = "layout: test.html\npermalink: /test/";
      // Should not throw
      checkFrontmatterField(
        frontmatter,
        "layout",
        "test.html",
        "stripe",
        "test.md",
      );
      expectTrue(true, "Should not throw for valid field");
    },
  },
  {
    name: "checkFrontmatterField-missing",
    description: "checkFrontmatterField throws when field is missing",
    test: () => {
      const frontmatter = "layout: other.html";
      expectThrows(
        () =>
          checkFrontmatterField(
            frontmatter,
            "layout",
            "test.html",
            "stripe",
            "test.md",
          ),
        /does not have layout: test.html/,
        "Should throw for missing field value",
      );
    },
  },

  // validateCartConfig function tests
  {
    name: "validateCartConfig-null-mode",
    description: "validateCartConfig passes with null cart_mode",
    test: () => {
      const config = { cart_mode: null };
      // Should not throw
      validateCartConfig(config);
      expectTrue(true, "Should not throw for null cart_mode");
    },
  },
  {
    name: "validateCartConfig-undefined-mode",
    description: "validateCartConfig passes with undefined cart_mode",
    test: () => {
      const config = {};
      // Should not throw
      validateCartConfig(config);
      expectTrue(true, "Should not throw for undefined cart_mode");
    },
  },
  {
    name: "validateCartConfig-invalid-mode",
    description: "validateCartConfig throws for invalid cart_mode",
    test: () => {
      const config = { cart_mode: "invalid" };
      expectThrows(
        () => validateCartConfig(config),
        /Invalid cart_mode: "invalid"/,
        "Should throw for invalid cart_mode",
      );
    },
  },
  {
    name: "validateCartConfig-paypal-no-url",
    description:
      "validateCartConfig throws when paypal mode has no checkout_api_url",
    test: () => {
      const config = { cart_mode: "paypal", checkout_api_url: null };
      expectThrows(
        () => validateCartConfig(config),
        /checkout_api_url is not set/,
        "Should throw for paypal without checkout_api_url",
      );
    },
  },
  {
    name: "validateCartConfig-stripe-no-url",
    description:
      "validateCartConfig throws when stripe mode has no checkout_api_url",
    test: () => {
      const config = { cart_mode: "stripe", checkout_api_url: null };
      expectThrows(
        () => validateCartConfig(config),
        /checkout_api_url is not set/,
        "Should throw for stripe without checkout_api_url",
      );
    },
  },
  {
    name: "validateCartConfig-quote-no-form-target",
    description: "validateCartConfig throws when quote mode has no form_target",
    test: () => {
      const config = { cart_mode: "quote", form_target: null };
      expectThrows(
        () => validateCartConfig(config),
        /formspark_id nor contact_form_target is set/,
        "Should throw for quote without form_target",
      );
    },
  },
  {
    name: "validateCartConfig-paypal-with-url",
    description: "validateCartConfig passes for paypal with checkout_api_url",
    test: () => {
      const config = {
        cart_mode: "paypal",
        checkout_api_url: "https://api.example.com",
      };
      // Should not throw
      validateCartConfig(config);
      expectTrue(true, "Should not throw for valid paypal config");
    },
  },
];

export default createTestRunner("config", testCases);
