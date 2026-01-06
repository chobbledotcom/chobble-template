import { describe, expect, test } from "bun:test";
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
  validatePageFrontmatter,
  validateProductMode,
  validateQuotePages,
  validateStripePages,
} from "#config/helpers.js";
import {
  cleanupTempDir,
  createFrontmatter,
  createTempDir,
  createTempFile,
  expectObjectProps,
} from "#test/test-utils.js";

describe("config", () => {
  // DEFAULTS constant tests
  test("DEFAULTS is an object with expected properties", () => {
    expect(typeof DEFAULTS).toBe("object");
    expectObjectProps({
      sticky_mobile_nav: true,
      horizontal_nav: true,
      homepage_news: true,
      homepage_products: true,
      externalLinksTargetBlank: false,
      contact_form_target: null,
      formspark_id: null,
      botpoison_public_key: null,
      template_repo_url: "https://github.com/chobbledotcom/chobble-template",
      chobble_link: null,
      map_embed_src: null,
      cart_mode: null,
      has_products_filter: false,
    })(DEFAULTS);
  });

  // VALID_CART_MODES constant tests
  test("VALID_CART_MODES contains correct values", () => {
    expect(Array.isArray(VALID_CART_MODES)).toBe(true);
    expect(VALID_CART_MODES).toEqual(["paypal", "stripe", "quote"]);
  });

  // DEFAULT_PRODUCT_DATA constant tests
  test("DEFAULT_PRODUCT_DATA has correct image width defaults", () => {
    expectObjectProps({
      item_widths: "240,480,640",
      gallery_thumb_widths: "240,480",
      gallery_image_widths: "900,1300,1800",
      header_image_widths: "640,900,1300",
    })(DEFAULT_PRODUCT_DATA);
  });

  // getProducts function tests
  test("getProducts returns empty object when no products", () => {
    const result = getProducts({});
    expect(result).toEqual({});
  });

  test("getProducts handles undefined products property", () => {
    const result = getProducts({ other: "value" });
    expect(result).toEqual({});
  });

  test("getProducts filters out null values", () => {
    const configData = {
      products: {
        item_widths: "100,200",
        gallery_thumb_widths: null,
        custom_field: "value",
      },
    };
    const result = getProducts(configData);
    expect(result.item_widths).toBe("100,200");
    expect(result.gallery_thumb_widths).toBe(undefined);
    expect(result.custom_field).toBe("value");
  });

  test("getProducts keeps all truthy values", () => {
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
    expect(result.a).toBe("string");
    expect(result.b).toBe(123);
    expect(result.c).toBe(true);
    expect(result.d).toEqual([]);
    expect(result.e).toEqual({});
  });

  // getFormTarget function tests
  test("getFormTarget returns contact_form_target when set", () => {
    const configData = {
      contact_form_target: "https://custom-form.com/submit",
      formspark_id: "abc123",
    };
    const result = getFormTarget(configData);
    expect(result).toBe("https://custom-form.com/submit");
  });

  test("getFormTarget builds URL from formspark_id when no target", () => {
    const configData = {
      contact_form_target: null,
      formspark_id: "abc123",
    };
    const result = getFormTarget(configData);
    expect(result).toBe("https://submit-form.com/abc123");
  });

  test("getFormTarget returns null when neither is set", () => {
    const configData = {};
    const result = getFormTarget(configData);
    expect(result).toBe(null);
  });

  test("getFormTarget handles empty strings as falsy", () => {
    const configData = {
      contact_form_target: "",
      formspark_id: "",
    };
    const result = getFormTarget(configData);
    expect(result).toBe(null);
  });

  // cartModeError function tests
  test("cartModeError returns correctly formatted error message", () => {
    const result = cartModeError("stripe", "checkout.md", "does not exist");
    expect(result).toBe(
      'cart_mode is "stripe" but src/pages/checkout.md does not exist',
    );
  });

  // getPagePath function tests
  test("getPagePath returns correct path", () => {
    const result = getPagePath("test.md");
    expect(result.endsWith("pages/test.md")).toBe(true);
    expect(result.includes("src")).toBe(true);
  });

  // extractFrontmatter function tests
  test("extractFrontmatter extracts frontmatter from valid file", () => {
    const tempDir = createTempDir("config-test");
    const content = createFrontmatter(
      { layout: "test.html", permalink: "/test/" },
      "Content here",
    );
    const filePath = createTempFile(tempDir, "test.md", content);

    const result = extractFrontmatter(filePath, "test.md", "stripe");
    expect(result.layout).toBe("test.html");
    expect(result.permalink).toBe("/test/");

    cleanupTempDir(tempDir);
  });

  test("extractFrontmatter throws when file does not exist", () => {
    expect(() =>
      extractFrontmatter("/nonexistent/path/file.md", "file.md", "stripe"),
    ).toThrow(/does not exist/);
  });

  test("extractFrontmatter throws when no frontmatter present", () => {
    const tempDir = createTempDir("config-test-no-fm");
    const content = "Just plain content without frontmatter";
    const filePath = createTempFile(tempDir, "plain.md", content);

    expect(() => extractFrontmatter(filePath, "plain.md", "stripe")).toThrow(
      /has no frontmatter/,
    );

    cleanupTempDir(tempDir);
  });

  // checkFrontmatterField function tests
  test("checkFrontmatterField passes when field exists", () => {
    const frontmatter = { layout: "test.html", permalink: "/test/" };
    // Should not throw
    checkFrontmatterField(
      frontmatter,
      "layout",
      "test.html",
      "stripe",
      "test.md",
    );
    expect(true).toBe(true);
  });

  test("checkFrontmatterField throws when field is missing", () => {
    const frontmatter = { layout: "other.html" };
    expect(() =>
      checkFrontmatterField(
        frontmatter,
        "layout",
        "test.html",
        "stripe",
        "test.md",
      ),
    ).toThrow(/does not have layout: test.html/);
  });

  // validateCartConfig function tests
  test("validateCartConfig passes with null cart_mode", () => {
    const config = { cart_mode: null };
    // Should not throw
    validateCartConfig(config);
    expect(true).toBe(true);
  });

  test("validateCartConfig passes with undefined cart_mode", () => {
    const config = {};
    // Should not throw
    validateCartConfig(config);
    expect(true).toBe(true);
  });

  test("validateCartConfig throws for invalid cart_mode", () => {
    const config = { cart_mode: "invalid" };
    expect(() => validateCartConfig(config)).toThrow(
      /Invalid cart_mode: "invalid"/,
    );
  });

  test("validateCartConfig throws when paypal mode has no checkout_api_url", () => {
    const config = { cart_mode: "paypal", checkout_api_url: null };
    expect(() => validateCartConfig(config)).toThrow(
      /checkout_api_url is not set/,
    );
  });

  test("validateCartConfig throws when stripe mode has no checkout_api_url", () => {
    const config = { cart_mode: "stripe", checkout_api_url: null };
    expect(() => validateCartConfig(config)).toThrow(
      /checkout_api_url is not set/,
    );
  });

  test("validateCartConfig throws when quote mode has no form_target", () => {
    const config = { cart_mode: "quote", form_target: null };
    expect(() => validateCartConfig(config)).toThrow(
      /formspark_id nor contact_form_target is set/,
    );
  });

  test("validateCartConfig passes for paypal with checkout_api_url", () => {
    const config = {
      cart_mode: "paypal",
      checkout_api_url: "https://api.example.com",
    };
    // Should not throw
    validateCartConfig(config);
    expect(true).toBe(true);
  });

  // Integration test: verify config data file exports default function
  test("config.js data file exports a default function for Eleventy", async () => {
    const configModule = await import("#data/config.js");
    expect(typeof configModule.default).toBe("function");
    // Verify it only has default export (no named exports that would break Eleventy)
    const exportNames = Object.keys(configModule);
    expect(exportNames).toHaveLength(1);
    expect(exportNames[0]).toBe("default");
  });

  test("config.js returns computed form_target when formspark_id is set", () => {
    // Test that getFormTarget properly computes form_target
    // This ensures the config data file will return form_target to templates
    const configWithFormspark = {
      formspark_id: "abc123",
      contact_form_target: null,
    };
    const result = getFormTarget(configWithFormspark);
    expect(result).toBe("https://submit-form.com/abc123");
  });

  // validatePageFrontmatter function tests
  test("validatePageFrontmatter passes when file has correct frontmatter", () => {
    const tempDir = createTempDir("config-validate-page");
    const content = createFrontmatter(
      { layout: "test.html", permalink: "/test/" },
      "Content",
    );
    createTempFile(tempDir, "test.md", content);

    // Use the temp file path directly via extractFrontmatter
    // validatePageFrontmatter uses getPagePath internally, so we test through
    // its helpers since we already tested extractFrontmatter + checkFrontmatterField
    const frontmatter = extractFrontmatter(
      `${tempDir}/test.md`,
      "test.md",
      "test",
    );
    checkFrontmatterField(
      frontmatter,
      "layout",
      "test.html",
      "test",
      "test.md",
    );
    checkFrontmatterField(
      frontmatter,
      "permalink",
      "/test/",
      "test",
      "test.md",
    );
    expect(true).toBe(true);

    cleanupTempDir(tempDir);
  });

  test("validatePageFrontmatter throws when layout is incorrect", () => {
    const tempDir = createTempDir("config-wrong-layout");
    const content = createFrontmatter(
      { layout: "wrong.html", permalink: "/test/" },
      "Content",
    );
    const filePath = createTempFile(tempDir, "test.md", content);

    expect(() => {
      const frontmatter = extractFrontmatter(filePath, "test.md", "stripe");
      checkFrontmatterField(
        frontmatter,
        "layout",
        "expected.html",
        "stripe",
        "test.md",
      );
    }).toThrow(/does not have layout: expected.html/);

    cleanupTempDir(tempDir);
  });

  test("validatePageFrontmatter throws when permalink is incorrect", () => {
    const tempDir = createTempDir("config-wrong-permalink");
    const content = createFrontmatter(
      { layout: "test.html", permalink: "/wrong/" },
      "Content",
    );
    const filePath = createTempFile(tempDir, "test.md", content);

    expect(() => {
      const frontmatter = extractFrontmatter(filePath, "test.md", "stripe");
      checkFrontmatterField(
        frontmatter,
        "permalink",
        "/expected/",
        "stripe",
        "test.md",
      );
    }).toThrow(/does not have permalink/);

    cleanupTempDir(tempDir);
  });

  // validatePageFrontmatter function tests
  test("validatePageFrontmatter passes when file has correct frontmatter", () => {
    // stripe-checkout.md exists with correct frontmatter
    validatePageFrontmatter(
      "stripe-checkout.md",
      "stripe-checkout.html",
      "/stripe-checkout/",
      "stripe",
    );
    expect(true).toBe(true);
  });

  test("validatePageFrontmatter throws when file does not exist", () => {
    expect(() =>
      validatePageFrontmatter(
        "nonexistent.md",
        "test.html",
        "/test/",
        "stripe",
      ),
    ).toThrow(/does not exist/);
  });

  test("validatePageFrontmatter throws when layout is incorrect", () => {
    expect(() =>
      validatePageFrontmatter(
        "stripe-checkout.md",
        "wrong-layout.html",
        "/stripe-checkout/",
        "stripe",
      ),
    ).toThrow(/does not have layout: wrong-layout.html/);
  });

  test("validatePageFrontmatter throws when permalink is incorrect", () => {
    expect(() =>
      validatePageFrontmatter(
        "stripe-checkout.md",
        "stripe-checkout.html",
        "/wrong-permalink/",
        "stripe",
      ),
    ).toThrow(/does not have permalink: \/wrong-permalink\//);
  });

  // validateStripePages function tests
  test("validateStripePages passes with real stripe-checkout.md and order-complete.md", () => {
    // These pages exist in src/pages with correct frontmatter
    validateStripePages();
    expect(true).toBe(true);
  });

  // validateQuotePages function tests
  test("validateQuotePages passes with real checkout.md page", () => {
    // checkout.md exists in src/pages with correct frontmatter
    validateQuotePages();
    expect(true).toBe(true);
  });

  // validateCartConfig with valid stripe config (triggers validateStripePages)
  test("validateCartConfig passes for stripe with checkout_api_url and valid pages", () => {
    const config = {
      cart_mode: "stripe",
      checkout_api_url: "https://api.example.com/checkout",
    };
    // This should not throw - it validates the real stripe pages exist
    validateCartConfig(config);
    expect(true).toBe(true);
  });

  // validateCartConfig with valid quote config (triggers validateQuotePages)
  test("validateCartConfig passes for quote with form_target and valid pages", () => {
    const config = {
      cart_mode: "quote",
      form_target: "https://forms.example.com/submit",
    };
    // This should not throw - it validates the real quote checkout page exists
    validateCartConfig(config);
    expect(true).toBe(true);
  });

  // validateProductMode function tests
  test("validateProductMode passes with null product_mode", () => {
    const config = { product_mode: null };
    validateProductMode(config);
    expect(true).toBe(true);
  });

  test("validateProductMode passes with undefined product_mode", () => {
    const config = {};
    validateProductMode(config);
    expect(true).toBe(true);
  });

  test("validateProductMode passes with valid buy mode", () => {
    const config = { product_mode: "buy" };
    validateProductMode(config);
    expect(true).toBe(true);
  });

  test("validateProductMode passes with valid hire mode", () => {
    const config = { product_mode: "hire" };
    validateProductMode(config);
    expect(true).toBe(true);
  });

  test("validateProductMode throws for invalid product_mode", () => {
    const config = { product_mode: "invalid" };
    expect(() => validateProductMode(config)).toThrow(
      /Invalid product_mode: "invalid"/,
    );
  });
});
