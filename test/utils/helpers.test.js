import { describe, expect, test } from "bun:test";
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
  test("builds error message with cart mode, filename, and issue", () => {
    const result = cartModeError("stripe", "checkout.md", "does not exist");
    expect(result).toBe(
      'cart_mode is "stripe" but src/pages/checkout.md does not exist',
    );
  });

  test("handles different cart modes", () => {
    const result = cartModeError("quote", "order.md", "is missing layout");
    expect(result).toBe(
      'cart_mode is "quote" but src/pages/order.md is missing layout',
    );
  });
});

describe("getProducts", () => {
  test("returns empty object when no products key", () => {
    const result = getProducts({});
    expect(result).toEqual({});
  });

  test("returns empty object when products is empty", () => {
    const result = getProducts({ products: {} });
    expect(result).toEqual({});
  });

  test("filters out null values", () => {
    const result = getProducts({
      products: {
        item_widths: "240,480",
        gallery_widths: null,
      },
    });
    expect(result).toEqual({ item_widths: "240,480" });
  });

  test("filters out undefined values", () => {
    const result = getProducts({
      products: {
        header_image_widths: "640,900",
        gallery_thumb_widths: undefined,
      },
    });
    expect(result).toEqual({ header_image_widths: "640,900" });
  });

  test("preserves all non-null values", () => {
    const input = {
      products: {
        item_widths: "240,480,640",
        gallery_thumb_widths: "240,480",
        gallery_image_widths: "900,1300,1800",
      },
    };
    const result = getProducts(input);
    expect(result).toEqual(input.products);
  });

  test("filters out all falsy values including empty string, zero, and false", () => {
    const result = getProducts({
      products: {
        empty_string: "",
        zero_value: 0,
        false_value: false,
        null_value: null,
        valid_value: "keep",
      },
    });
    expect(result).toEqual({ valid_value: "keep" });
  });
});

describe("getFormTarget", () => {
  test("returns null when neither contact_form_target nor formspark_id set", () => {
    const result = getFormTarget({});
    expect(result).toBe(null);
  });

  test("returns contact_form_target when set", () => {
    const result = getFormTarget({
      contact_form_target: "https://custom-form.example.com/submit",
    });
    expect(result).toBe("https://custom-form.example.com/submit");
  });

  test("builds formspark URL from formspark_id", () => {
    const result = getFormTarget({ formspark_id: "abc123" });
    expect(result).toBe("https://submit-form.com/abc123");
  });

  test("prefers contact_form_target over formspark_id", () => {
    const result = getFormTarget({
      contact_form_target: "https://custom.example.com",
      formspark_id: "ignored123",
    });
    expect(result).toBe("https://custom.example.com");
  });
});

describe("checkFrontmatterField", () => {
  test("does not throw when field matches expected value", () => {
    const frontmatter = { layout: "checkout.html", permalink: "/checkout/" };
    expect(() =>
      checkFrontmatterField(
        frontmatter,
        "layout",
        "checkout.html",
        "stripe",
        "checkout.md",
      ),
    ).not.toThrow();
  });

  test("throws when field does not match expected value", () => {
    const frontmatter = { layout: "wrong-layout.html" };
    expect(() =>
      checkFrontmatterField(
        frontmatter,
        "layout",
        "checkout.html",
        "stripe",
        "checkout.md",
      ),
    ).toThrow(
      /cart_mode is "stripe" but src\/pages\/checkout.md does not have layout: checkout.html/,
    );
  });

  test("throws when field is missing from frontmatter", () => {
    const frontmatter = {};
    expect(() =>
      checkFrontmatterField(
        frontmatter,
        "permalink",
        "/checkout/",
        "quote",
        "checkout.md",
      ),
    ).toThrow(/does not have permalink/);
  });
});

describe("extractFrontmatter", () => {
  test("throws when file does not exist", () => {
    expect(() =>
      extractFrontmatter(
        "/nonexistent/path/to/file.md",
        "nonexistent.md",
        "stripe",
      ),
    ).toThrow(/does not exist/);
  });

  test("throws when file has no frontmatter", () => {
    const tempDir = createTempDir("extractFrontmatter");
    try {
      const filePath = createTempFile(
        tempDir,
        "empty.md",
        "Just content, no frontmatter",
      );
      expect(() => extractFrontmatter(filePath, "empty.md", "stripe")).toThrow(
        /has no frontmatter/,
      );
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("returns frontmatter data when file has valid frontmatter", () => {
    const tempDir = createTempDir("extractFrontmatter-valid");
    try {
      const content = `---
layout: test-layout.html
permalink: /test/
---
Content here`;
      const filePath = createTempFile(tempDir, "valid.md", content);
      const result = extractFrontmatter(filePath, "valid.md", "stripe");
      expect(result).toEqual({
        layout: "test-layout.html",
        permalink: "/test/",
      });
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe("validateCartConfig", () => {
  test("does nothing when cart_mode is not set", () => {
    expect(() => validateCartConfig({})).not.toThrow();
    expect(() => validateCartConfig({ cart_mode: null })).not.toThrow();
  });

  test("throws for invalid cart_mode", () => {
    expect(() => validateCartConfig({ cart_mode: "invalid" })).toThrow(
      /Invalid cart_mode: "invalid". Must be one of: paypal, stripe, quote/,
    );
  });

  test("throws for paypal mode without checkout_api_url", () => {
    expect(() => validateCartConfig({ cart_mode: "paypal" })).toThrow(
      /cart_mode is "paypal" but checkout_api_url is not set/,
    );
  });

  test("throws for stripe mode without checkout_api_url", () => {
    expect(() => validateCartConfig({ cart_mode: "stripe" })).toThrow(
      /cart_mode is "stripe" but checkout_api_url is not set/,
    );
  });

  test("throws for quote mode without form_target", () => {
    expect(() => validateCartConfig({ cart_mode: "quote" })).toThrow(
      /cart_mode is "quote" but neither formspark_id nor contact_form_target is set/,
    );
  });
});

describe("DEFAULTS", () => {
  test("includes expected default values", () => {
    expect(DEFAULTS.sticky_mobile_nav).toBe(true);
    expect(DEFAULTS.horizontal_nav).toBe(true);
    expect(DEFAULTS.externalLinksTargetBlank).toBe(false);
    expect(DEFAULTS.cart_mode).toBe(null);
    expect(DEFAULTS.has_products_filter).toBe(false);
  });

  test("has null contact form configuration by default", () => {
    expect(DEFAULTS.contact_form_target).toBe(null);
    expect(DEFAULTS.formspark_id).toBe(null);
  });
});

describe("VALID_CART_MODES", () => {
  test("contains exactly paypal, stripe, and quote", () => {
    expect(VALID_CART_MODES).toEqual(["paypal", "stripe", "quote"]);
  });
});

describe("DEFAULT_PRODUCT_DATA", () => {
  test("has image width configurations", () => {
    expect(DEFAULT_PRODUCT_DATA.item_widths).toBe("240,480,640");
    expect(DEFAULT_PRODUCT_DATA.gallery_thumb_widths).toBe("240,480");
    expect(DEFAULT_PRODUCT_DATA.gallery_image_widths).toBe("900,1300,1800");
    expect(DEFAULT_PRODUCT_DATA.header_image_widths).toBe("640,900,1300");
  });
});
