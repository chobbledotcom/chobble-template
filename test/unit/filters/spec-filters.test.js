import { describe, expect, test } from "bun:test";
import specsIcons from "#data/specs-icons.json" with { type: "json" };
import { computeSpecs, getHighlightedSpecs } from "#filters/spec-filters.js";

// Use actual spec name from config so tests stay in sync
const KNOWN_SPEC = Object.keys(specsIcons)[0];

describe("spec-filters", () => {
  // ============================================
  // computeSpecs - Input Validation
  // ============================================
  test("Returns undefined when data.specs is undefined", () => {
    const result = computeSpecs({});
    expect(result).toBe(undefined);
  });

  test("Returns undefined when data.specs is null", () => {
    const result = computeSpecs({ specs: null });
    expect(result).toBe(undefined);
  });

  test("Returns empty array when specs is empty array", () => {
    const result = computeSpecs({ specs: [] });
    expect(result).toEqual([]);
  });

  // ============================================
  // computeSpecs - Transformation
  // ============================================
  test("Adds icon and highlight properties to each spec", () => {
    const data = {
      specs: [{ name: KNOWN_SPEC, value: "Yes" }],
    };

    const result = computeSpecs(data);

    expect(result.length).toBe(1);
    expect("icon" in result[0]).toBe(true);
    expect("highlight" in result[0]).toBe(true);
  });

  test("Preserves all original spec properties", () => {
    const data = {
      specs: [
        {
          name: "test spec",
          value: "test value",
          customProp: "custom",
        },
      ],
    };

    const result = computeSpecs(data);

    expect(result[0].name).toBe("test spec");
    expect(result[0].value).toBe("test value");
    expect(result[0].customProp).toBe("custom");
  });

  test("Returns empty icon and false highlight for specs without config", () => {
    const data = {
      specs: [{ name: "nonexistent-spec", value: "test" }],
    };

    const result = computeSpecs(data);

    expect(result[0].icon).toBe("");
    expect(result[0].highlight).toBe(false);
  });

  test("Returns SVG content for specs with matching icon", () => {
    const data = {
      specs: [{ name: KNOWN_SPEC, value: "Yes" }],
    };

    const result = computeSpecs(data);

    expect(result[0].icon.startsWith("<svg")).toBe(true);
  });

  test("Finds icons regardless of spec name case", () => {
    const data = {
      specs: [
        { name: KNOWN_SPEC, value: "lowercase" },
        { name: KNOWN_SPEC.toUpperCase(), value: "uppercase" },
      ],
    };

    const result = computeSpecs(data);

    expect(result[0].icon).toBe(result[1].icon);
  });

  // ============================================
  // computeSpecs - Icon resolution edge cases
  // ============================================

  test("Trims whitespace from spec name before lookup", () => {
    const data = {
      specs: [
        { name: KNOWN_SPEC, value: "normal" },
        { name: `  ${KNOWN_SPEC}  `, value: "padded" },
      ],
    };

    const result = computeSpecs(data);

    expect(result[0].icon).toBe(result[1].icon);
  });

  // ============================================
  // getHighlightedSpecs - Input Validation
  // ============================================
  test("Returns undefined when specs is undefined", () => {
    const result = getHighlightedSpecs(undefined);
    expect(result).toBe(undefined);
  });

  test("Returns null when specs is null", () => {
    const result = getHighlightedSpecs(null);
    expect(result).toBe(null);
  });

  test("Returns empty array when specs is empty", () => {
    const result = getHighlightedSpecs([]);
    expect(result).toEqual([]);
  });

  // ============================================
  // getHighlightedSpecs - Filtering Logic
  // ============================================
  test("Returns all specs when none have highlight true", () => {
    const specs = [
      { name: "spec1", value: "val1", highlight: false },
      { name: "spec2", value: "val2", highlight: false },
      { name: "spec3", value: "val3", highlight: false },
    ];

    const result = getHighlightedSpecs(specs);

    expect(result.length).toBe(3);
    expect(result).toEqual(specs);
  });

  test("Returns only highlighted specs when some have highlight true", () => {
    const specs = [
      { name: "spec1", value: "val1", highlight: true },
      { name: "spec2", value: "val2", highlight: false },
      { name: "spec3", value: "val3", highlight: true },
    ];

    const result = getHighlightedSpecs(specs);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe("spec1");
    expect(result[1].name).toBe("spec3");
  });

  test("Returns all specs when all have highlight true", () => {
    const specs = [
      { name: "spec1", value: "val1", highlight: true },
      { name: "spec2", value: "val2", highlight: true },
      { name: "spec3", value: "val3", highlight: true },
    ];

    const result = getHighlightedSpecs(specs);

    expect(result.length).toBe(3);
    expect(result).toEqual(specs);
  });

  test("Returns only one spec when only one has highlight true", () => {
    const specs = [
      { name: "spec1", value: "val1", highlight: false },
      { name: "spec2", value: "val2", highlight: true },
      { name: "spec3", value: "val3", highlight: false },
    ];

    const result = getHighlightedSpecs(specs);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe("spec2");
  });

  test("Preserves all properties of filtered specs", () => {
    const specs = [
      {
        name: "spec1",
        value: "val1",
        highlight: true,
        icon: "<svg>test</svg>",
        customProp: "custom1",
      },
      {
        name: "spec2",
        value: "val2",
        highlight: false,
        icon: "",
        customProp: "custom2",
      },
    ];

    const result = getHighlightedSpecs(specs);

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(specs[0]);
    expect(result[0].customProp).toBe("custom1");
    expect(result[0].icon).toBe("<svg>test</svg>");
  });
});
