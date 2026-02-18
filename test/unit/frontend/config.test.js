import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
} from "#config/helpers.js";
import { expectObjectProps } from "#test/test-utils.js";
import { pickNonNull } from "#toolkit/fp/object.js";

describe("config", () => {
  test("DEFAULTS has all expected keys", () => {
    const expectedKeys = [
      "sticky_mobile_nav",
      "horizontal_nav",
      "collapse_mobile_menu",
      "navigation_is_clicky",
      "homepage_news",
      "homepage_products",
      "show_breadcrumbs",
      "externalLinksTargetBlank",
      "contact_form_target",
      "formspark_id",
      "botpoison_public_key",
      "template_repo_url",
      "chobble_link",
      "map_embed_src",
      "cart_mode",
      "ecommerce_api_host",
      "product_mode",
      "has_products_filter",
      "has_properties_filter",
      "placeholder_images",
      "enable_theme_switcher",
      "timezone",
      "show_product_review_counts",
      "reviews_truncate_limit",
      "rating_stars_uses_svg",
      "list_item_fields",
      "navigation_content_anchor",
      "category_order",
      "property_order",
      "guide_page_order",
      "guide_category_order",
      "screenshots",
      "design_system_layouts",
      "phoneNumberLength",
      "use_visual_editor",
      "currency",
      "default_image_widths",
      "default_max_quantity",
      "search_collections",
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
    expect(DEFAULTS.phoneNumberLength).toBe(11);
  });

  test("DEFAULT_PRODUCT_DATA has correct product display defaults", () => {
    expectObjectProps({
      item_list_aspect_ratio: null,
      max_images: null,
    })(DEFAULT_PRODUCT_DATA);
  });

  test("getProducts filters out null values", () => {
    const configData = {
      products: {
        item_list_aspect_ratio: "1/1",
        max_images: null,
        custom_field: "value",
      },
    };
    const result = getProducts(configData);
    expectObjectProps({
      item_list_aspect_ratio: "1/1",
      max_images: undefined,
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
