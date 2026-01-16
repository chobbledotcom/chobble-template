import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
  validateCartConfig,
} from "#config/helpers.js";
import { expectObjectProps } from "#test/test-utils.js";
import { pickNonNull } from "#utils/object-entries.js";

describe("config", () => {
  test("DEFAULTS has all expected keys", () => {
    const expectedKeys = [
      "sticky_mobile_nav",
      "horizontal_nav",
      "homepage_news",
      "homepage_products",
      "externalLinksTargetBlank",
      "contact_form_target",
      "formspark_id",
      "botpoison_public_key",
      "template_repo_url",
      "chobble_link",
      "map_embed_src",
      "cart_mode",
      "checkout_api_url",
      "product_mode",
      "has_products_filter",
      "has_properties_filter",
      "placeholder_images",
      "enable_theme_switcher",
      "timezone",
      "reviews_truncate_limit",
      "list_item_fields",
      "navigation_content_anchor",
      "category_order",
      "screenshots",
      "design_system_layouts",
    ];
    expect(Object.keys(DEFAULTS).sort()).toEqual(expectedKeys.sort());
  });

  test("DEFAULTS has correct critical values", () => {
    expect(DEFAULTS.externalLinksTargetBlank).toBe(false);
    expect(DEFAULTS.template_repo_url).toBe(
      "https://github.com/chobbledotcom/chobble-template",
    );
    expect(DEFAULTS.cart_mode).toBe(null);
    expect(DEFAULTS.product_mode).toBe(null);
  });

  test("DEFAULT_PRODUCT_DATA has correct image width defaults", () => {
    expectObjectProps({
      item_widths: "240,480,640",
      gallery_thumb_widths: "240,480",
      gallery_image_widths: "900,1300,1800",
      header_image_widths: "640,900,1300",
    })(DEFAULT_PRODUCT_DATA);
  });

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
    expectObjectProps({
      item_widths: "100,200",
      gallery_thumb_widths: undefined,
      custom_field: "value",
    })(result);
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
    expectObjectProps({
      a: "string",
      b: 123,
      c: true,
    })(result);
    expect(result.d).toEqual([]);
    expect(result.e).toEqual({});
  });

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

  test("validateCartConfig passes with null cart_mode", () => {
    const config = { cart_mode: null };
    validateCartConfig(config);
  });

  test("validateCartConfig passes with undefined cart_mode", () => {
    const config = {};
    validateCartConfig(config);
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
    validateCartConfig(config);
  });

  test("config.js data file exports a default function for Eleventy", async () => {
    const configModule = await import("#data/config.js");
    expect(typeof configModule.default).toBe("function");
    const exportNames = Object.keys(configModule);
    expect(exportNames).toHaveLength(1);
    expect(exportNames[0]).toBe("default");
  });

  test("config.js returns computed form_target when formspark_id is set", () => {
    const configWithFormspark = {
      formspark_id: "abc123",
      contact_form_target: null,
    };
    const result = getFormTarget(configWithFormspark);
    expect(result).toBe("https://submit-form.com/abc123");
  });

  test("validateCartConfig passes for stripe with checkout_api_url", () => {
    const config = {
      cart_mode: "stripe",
      checkout_api_url: "https://api.example.com/checkout",
    };
    validateCartConfig(config);
  });

  test("validateCartConfig passes for quote with form_target", () => {
    const config = {
      cart_mode: "quote",
      form_target: "https://forms.example.com/submit",
    };
    validateCartConfig(config);
  });

  test("validateCartConfig passes with null product_mode", () => {
    validateCartConfig({ product_mode: null });
  });

  test("validateCartConfig passes with undefined product_mode", () => {
    validateCartConfig({});
  });

  test("validateCartConfig passes with valid buy mode", () => {
    validateCartConfig({ product_mode: "buy" });
  });

  test("validateCartConfig passes with valid hire mode", () => {
    validateCartConfig({ product_mode: "hire" });
  });

  test("validateCartConfig throws for invalid product_mode", () => {
    const config = { product_mode: "invalid" };
    expect(() => validateCartConfig(config)).toThrow(
      /Invalid product_mode: "invalid"/,
    );
  });

  test("config merging uses defaults when config values are null", () => {
    const userConfig = {
      placeholder_images: null,
      sticky_mobile_nav: null,
      custom_setting: "custom_value",
    };

    const filtered = pickNonNull(userConfig);
    const merged = { ...DEFAULTS, ...filtered };

    expect(merged.placeholder_images).toBe(DEFAULTS.placeholder_images);
    expect(merged.sticky_mobile_nav).toBe(DEFAULTS.sticky_mobile_nav);
    expect(merged.custom_setting).toBe("custom_value");
  });

  test("config merging preserves falsy but non-null values", () => {
    const userConfig = {
      externalLinksTargetBlank: false,
      reviews_truncate_limit: 0,
      empty_string: "",
      null_value: null,
    };

    const filtered = pickNonNull(userConfig);
    const merged = { ...DEFAULTS, ...filtered };

    expect(merged.externalLinksTargetBlank).toBe(false);
    expect(merged.reviews_truncate_limit).toBe(0);
    expect(merged.empty_string).toBe("");
    expect(merged).not.toHaveProperty("null_value");
  });
});
