import { describe, expect, test } from "bun:test";
import specsIconsBase from "#data/specs-icons-base.json" with { type: "json" };
import {
  computeSpecs,
  getHighlightedSpecs,
  getSpecIcon,
} from "#filters/spec-filters.js";

// Use actual spec name from base config so tests stay in sync
const KNOWN_SPEC = Object.keys(specsIconsBase)[0];

describe("spec-filters", () => {
  // ============================================
  // getSpecIcon - Input Validation
  // ============================================
  test("Returns empty string for null input", () => {
    const result = getSpecIcon(null);
    expect(result).toBe("");
  });

  test("Returns empty string for undefined input", () => {
    const result = getSpecIcon(undefined);
    expect(result).toBe("");
  });

  test("Returns empty string for empty string input", () => {
    const result = getSpecIcon("");
    expect(result).toBe("");
  });

  test("Returns empty string for non-existent spec name", () => {
    const result = getSpecIcon("nonexistent-spec-name");
    expect(result).toBe("");
  });

  // ============================================
  // getSpecIcon - Normalization
  // ============================================
  test("Normalizes spec name to lowercase before lookup", () => {
    const lowerResult = getSpecIcon(KNOWN_SPEC);
    const upperResult = getSpecIcon(KNOWN_SPEC.toUpperCase());

    expect(lowerResult).toBe(upperResult);
  });

  test("Trims whitespace from spec name before lookup", () => {
    const normalResult = getSpecIcon(KNOWN_SPEC);
    const paddedResult = getSpecIcon(`  ${KNOWN_SPEC}  `);

    expect(normalResult).toBe(paddedResult);
  });

  test("Returns SVG content for spec with defined icon", () => {
    const result = getSpecIcon(KNOWN_SPEC);

    expect(result.startsWith("<svg")).toBe(true);
  });

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
  test("Adds icon property to each spec object", () => {
    const data = {
      specs: [{ name: KNOWN_SPEC, value: "Yes" }],
    };

    const result = computeSpecs(data);

    expect(result.length).toBe(1);
    expect("icon" in result[0]).toBe(true);
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

  test("Returns empty string icon for specs without matching icon", () => {
    const data = {
      specs: [{ name: "nonexistent-spec", value: "test" }],
    };

    const result = computeSpecs(data);

    expect(result[0].icon).toBe("");
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

  test("Adds highlight property to each spec", () => {
    const data = {
      specs: [{ name: KNOWN_SPEC, value: "Yes" }],
    };

    const result = computeSpecs(data);

    expect(result.length).toBe(1);
    expect("highlight" in result[0]).toBe(true);
  });

  test("Sets highlight to false for specs without highlight config", () => {
    const data = {
      specs: [{ name: "nonexistent-spec", value: "test" }],
    };

    const result = computeSpecs(data);

    expect(result[0].highlight).toBe(false);
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
