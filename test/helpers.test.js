import assert from "node:assert";
import { describe, it } from "node:test";
import {
  cartModeError,
  checkFrontmatterField,
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  extractFrontmatter,
  getFormTarget,
  getProducts,
  VALID_CART_MODES,
  validateCartConfig,
} from "#config/helpers.js";
import {
  cleanupTempDir,
  createTempDir,
  createTempFile,
} from "#test/test-utils.js";

describe("cartModeError", () => {
  it("builds error message with cart mode, filename, and issue", () => {
    const result = cartModeError("stripe", "checkout.md", "does not exist");
    assert.strictEqual(
      result,
      'cart_mode is "stripe" but src/pages/checkout.md does not exist',
      "Should include cart mode, path, and issue",
    );
  });

  it("handles different cart modes", () => {
    const result = cartModeError("quote", "order.md", "is missing layout");
    assert.strictEqual(
      result,
      'cart_mode is "quote" but src/pages/order.md is missing layout',
      "Should work with different cart modes",
    );
  });
});

describe("getProducts", () => {
  it("returns empty object when no products key", () => {
    const result = getProducts({});
    assert.deepStrictEqual(result, {}, "Empty config returns empty products");
  });

  it("returns empty object when products is empty", () => {
    const result = getProducts({ products: {} });
    assert.deepStrictEqual(result, {}, "Empty products returns empty object");
  });

  it("filters out null values", () => {
    const result = getProducts({
      products: {
        item_widths: "240,480",
        gallery_widths: null,
      },
    });
    assert.deepStrictEqual(
      result,
      { item_widths: "240,480" },
      "Null values should be filtered out",
    );
  });

  it("filters out undefined values", () => {
    const result = getProducts({
      products: {
        header_image_widths: "640,900",
        gallery_thumb_widths: undefined,
      },
    });
    assert.deepStrictEqual(
      result,
      { header_image_widths: "640,900" },
      "Undefined values should be filtered out",
    );
  });

  it("preserves all non-null values", () => {
    const input = {
      products: {
        item_widths: "240,480,640",
        gallery_thumb_widths: "240,480",
        gallery_image_widths: "900,1300,1800",
      },
    };
    const result = getProducts(input);
    assert.deepStrictEqual(
      result,
      input.products,
      "All non-null values preserved",
    );
  });

  it("filters out all falsy values including empty string, zero, and false", () => {
    const result = getProducts({
      products: {
        empty_string: "",
        zero_value: 0,
        false_value: false,
        null_value: null,
        valid_value: "keep",
      },
    });
    assert.deepStrictEqual(
      result,
      { valid_value: "keep" },
      "Only truthy values are preserved",
    );
  });
});

describe("getFormTarget", () => {
  it("returns null when neither contact_form_target nor formspark_id set", () => {
    const result = getFormTarget({});
    assert.strictEqual(result, null, "Should return null when no form config");
  });

  it("returns contact_form_target when set", () => {
    const result = getFormTarget({
      contact_form_target: "https://custom-form.example.com/submit",
    });
    assert.strictEqual(
      result,
      "https://custom-form.example.com/submit",
      "Should use contact_form_target directly",
    );
  });

  it("builds formspark URL from formspark_id", () => {
    const result = getFormTarget({ formspark_id: "abc123" });
    assert.strictEqual(
      result,
      "https://submit-form.com/abc123",
      "Should build formspark URL",
    );
  });

  it("prefers contact_form_target over formspark_id", () => {
    const result = getFormTarget({
      contact_form_target: "https://custom.example.com",
      formspark_id: "ignored123",
    });
    assert.strictEqual(
      result,
      "https://custom.example.com",
      "contact_form_target takes precedence",
    );
  });
});

describe("checkFrontmatterField", () => {
  it("does not throw when field matches expected value", () => {
    const frontmatter = { layout: "checkout.html", permalink: "/checkout/" };
    assert.doesNotThrow(
      () =>
        checkFrontmatterField(
          frontmatter,
          "layout",
          "checkout.html",
          "stripe",
          "checkout.md",
        ),
      "Should not throw when field matches",
    );
  });

  it("throws when field does not match expected value", () => {
    const frontmatter = { layout: "wrong-layout.html" };
    assert.throws(
      () =>
        checkFrontmatterField(
          frontmatter,
          "layout",
          "checkout.html",
          "stripe",
          "checkout.md",
        ),
      /cart_mode is "stripe" but src\/pages\/checkout.md does not have layout: checkout.html/,
      "Should throw with descriptive error",
    );
  });

  it("throws when field is missing from frontmatter", () => {
    const frontmatter = {};
    assert.throws(
      () =>
        checkFrontmatterField(
          frontmatter,
          "permalink",
          "/checkout/",
          "quote",
          "checkout.md",
        ),
      /does not have permalink/,
      "Should throw when field is missing",
    );
  });
});

describe("extractFrontmatter", () => {
  it("throws when file does not exist", () => {
    assert.throws(
      () =>
        extractFrontmatter(
          "/nonexistent/path/to/file.md",
          "nonexistent.md",
          "stripe",
        ),
      /does not exist/,
      "Should throw when file doesn't exist",
    );
  });

  it("throws when file has no frontmatter", () => {
    const tempDir = createTempDir("extractFrontmatter");
    try {
      const filePath = createTempFile(
        tempDir,
        "empty.md",
        "Just content, no frontmatter",
      );
      assert.throws(
        () => extractFrontmatter(filePath, "empty.md", "stripe"),
        /has no frontmatter/,
        "Should throw when frontmatter is empty",
      );
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("returns frontmatter data when file has valid frontmatter", () => {
    const tempDir = createTempDir("extractFrontmatter-valid");
    try {
      const content = `---
layout: test-layout.html
permalink: /test/
---
Content here`;
      const filePath = createTempFile(tempDir, "valid.md", content);
      const result = extractFrontmatter(filePath, "valid.md", "stripe");
      assert.deepStrictEqual(
        result,
        { layout: "test-layout.html", permalink: "/test/" },
        "Should return parsed frontmatter",
      );
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe("validateCartConfig", () => {
  it("does nothing when cart_mode is not set", () => {
    assert.doesNotThrow(
      () => validateCartConfig({}),
      "Should not throw when cart_mode is null/undefined",
    );
    assert.doesNotThrow(
      () => validateCartConfig({ cart_mode: null }),
      "Should not throw when cart_mode is null",
    );
  });

  it("throws for invalid cart_mode", () => {
    assert.throws(
      () => validateCartConfig({ cart_mode: "invalid" }),
      /Invalid cart_mode: "invalid". Must be one of: paypal, stripe, quote/,
      "Should reject invalid cart modes",
    );
  });

  it("throws for paypal mode without checkout_api_url", () => {
    assert.throws(
      () => validateCartConfig({ cart_mode: "paypal" }),
      /cart_mode is "paypal" but checkout_api_url is not set/,
      "PayPal requires checkout_api_url",
    );
  });

  it("throws for stripe mode without checkout_api_url", () => {
    assert.throws(
      () => validateCartConfig({ cart_mode: "stripe" }),
      /cart_mode is "stripe" but checkout_api_url is not set/,
      "Stripe requires checkout_api_url",
    );
  });

  it("throws for quote mode without form_target", () => {
    assert.throws(
      () => validateCartConfig({ cart_mode: "quote" }),
      /cart_mode is "quote" but neither formspark_id nor contact_form_target is set/,
      "Quote mode requires form_target",
    );
  });
});

describe("DEFAULTS", () => {
  it("includes expected default values", () => {
    assert.strictEqual(
      DEFAULTS.sticky_mobile_nav,
      true,
      "sticky_mobile_nav defaults to true",
    );
    assert.strictEqual(
      DEFAULTS.horizontal_nav,
      true,
      "horizontal_nav defaults to true",
    );
    assert.strictEqual(
      DEFAULTS.externalLinksTargetBlank,
      false,
      "externalLinksTargetBlank defaults to false",
    );
    assert.strictEqual(DEFAULTS.cart_mode, null, "cart_mode defaults to null");
    assert.strictEqual(
      DEFAULTS.has_products_filter,
      false,
      "has_products_filter defaults to false",
    );
  });

  it("has null contact form configuration by default", () => {
    assert.strictEqual(
      DEFAULTS.contact_form_target,
      null,
      "contact_form_target defaults to null",
    );
    assert.strictEqual(
      DEFAULTS.formspark_id,
      null,
      "formspark_id defaults to null",
    );
  });
});

describe("VALID_CART_MODES", () => {
  it("contains exactly paypal, stripe, and quote", () => {
    assert.deepStrictEqual(
      VALID_CART_MODES,
      ["paypal", "stripe", "quote"],
      "Should have exactly three valid modes",
    );
  });
});

describe("DEFAULT_PRODUCT_DATA", () => {
  it("has image width configurations", () => {
    assert.strictEqual(
      DEFAULT_PRODUCT_DATA.item_widths,
      "240,480,640",
      "item_widths has expected value",
    );
    assert.strictEqual(
      DEFAULT_PRODUCT_DATA.gallery_thumb_widths,
      "240,480",
      "gallery_thumb_widths has expected value",
    );
    assert.strictEqual(
      DEFAULT_PRODUCT_DATA.gallery_image_widths,
      "900,1300,1800",
      "gallery_image_widths has expected value",
    );
    assert.strictEqual(
      DEFAULT_PRODUCT_DATA.header_image_widths,
      "640,900,1300",
      "header_image_widths has expected value",
    );
  });
});
