import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
  validateCartConfig,
  validatePageFrontmatter,
} from "#config/helpers.js";
import {
  cleanupTempDir,
  createTempDir,
  createTempFile,
  expectObjectProps,
} from "#test/test-utils.js";

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

describe("validateCartConfig", () => {
  test("does nothing when cart_mode is not set", () => {
    expect(() => validateCartConfig({})).not.toThrow();
    expect(() => validateCartConfig({ cart_mode: null })).not.toThrow();
  });

  test("throws for invalid cart_mode with available options in message", () => {
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

  test("passes for paypal with checkout_api_url", () => {
    expect(() =>
      validateCartConfig({
        cart_mode: "paypal",
        checkout_api_url: "https://api.example.com",
      }),
    ).not.toThrow();
  });

  test("passes for stripe with checkout_api_url", () => {
    expect(() =>
      validateCartConfig({
        cart_mode: "stripe",
        checkout_api_url: "https://api.example.com",
      }),
    ).not.toThrow();
  });

  test("passes for quote with form_target", () => {
    expect(() =>
      validateCartConfig({
        cart_mode: "quote",
        form_target: "https://forms.example.com",
      }),
    ).not.toThrow();
  });

  test("validates product_mode when set to invalid value", () => {
    expect(() => validateCartConfig({ product_mode: "invalid" })).toThrow(
      /Invalid product_mode: "invalid". Must be one of: buy, hire/,
    );
  });

  test("accepts valid product_mode buy", () => {
    expect(() => validateCartConfig({ product_mode: "buy" })).not.toThrow();
  });

  test("accepts valid product_mode hire", () => {
    expect(() => validateCartConfig({ product_mode: "hire" })).not.toThrow();
  });

  test("accepts null or undefined product_mode", () => {
    expect(() => validateCartConfig({ product_mode: null })).not.toThrow();
    expect(() => validateCartConfig({ product_mode: undefined })).not.toThrow();
  });
});

describe("DEFAULTS", () => {
  test("includes expected navigation defaults", () => {
    expectObjectProps({
      sticky_mobile_nav: true,
      horizontal_nav: true,
    })(DEFAULTS);
  });

  test("has null contact form configuration by default", () => {
    expectObjectProps({
      contact_form_target: null,
      formspark_id: null,
    })(DEFAULTS);
  });

  test("has design_system_layouts default with design-system-base.html", () => {
    expect(DEFAULTS.design_system_layouts).toEqual(["design-system-base.html"]);
  });

  test("has null cart_mode by default", () => {
    expect(DEFAULTS.cart_mode).toBe(null);
  });

  test("has null product_mode by default", () => {
    expect(DEFAULTS.product_mode).toBe(null);
  });
});

describe("DEFAULT_PRODUCT_DATA", () => {
  test("has image width configurations", () => {
    expectObjectProps({
      item_widths: "240,480,640",
      gallery_thumb_widths: "240,480",
      gallery_image_widths: "900,1300,1800",
      header_image_widths: "640,900,1300",
    })(DEFAULT_PRODUCT_DATA);
  });
});

describe("validatePageFrontmatter", () => {
  test("throws when page file does not exist", () => {
    expect(() =>
      validatePageFrontmatter(
        "nonexistent-page.md",
        "some-layout.html",
        "/some-path/",
        "stripe",
      ),
    ).toThrow(/does not exist/);
  });

  test("throws when page has no frontmatter", () => {
    const tempDir = createTempDir("validate-page-test");
    try {
      createTempFile(tempDir, "no-frontmatter.md", "Just content, no YAML");
      expect(() =>
        validatePageFrontmatter(
          `${tempDir}/no-frontmatter.md`,
          "layout.html",
          "/path/",
          "test",
        ),
      ).toThrow(/has no frontmatter/);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("throws when layout does not match", () => {
    const tempDir = createTempDir("validate-page-layout");
    try {
      createTempFile(
        tempDir,
        "wrong-layout.md",
        "---\nlayout: wrong.html\npermalink: /correct/\n---\nContent",
      );
      expect(() =>
        validatePageFrontmatter(
          `${tempDir}/wrong-layout.md`,
          "expected.html",
          "/correct/",
          "test",
        ),
      ).toThrow(/does not have layout: expected.html/);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("throws when permalink does not match", () => {
    const tempDir = createTempDir("validate-page-permalink");
    try {
      createTempFile(
        tempDir,
        "wrong-permalink.md",
        "---\nlayout: correct.html\npermalink: /wrong/\n---\nContent",
      );
      expect(() =>
        validatePageFrontmatter(
          `${tempDir}/wrong-permalink.md`,
          "correct.html",
          "/expected/",
          "test",
        ),
      ).toThrow(/does not have permalink: \/expected\//);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test("passes when frontmatter matches expected values", () => {
    const tempDir = createTempDir("validate-page-success");
    try {
      createTempFile(
        tempDir,
        "correct.md",
        "---\nlayout: expected.html\npermalink: /expected/\n---\nContent",
      );
      expect(() =>
        validatePageFrontmatter(
          `${tempDir}/correct.md`,
          "expected.html",
          "/expected/",
          "test",
        ),
      ).not.toThrow();
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});
