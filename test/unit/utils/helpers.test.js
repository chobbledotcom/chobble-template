import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PRODUCT_DATA,
  DEFAULTS,
  getFormTarget,
  getProducts,
} from "#config/helpers.js";
import { expectObjectProps } from "#test/test-utils.js";

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
