import { describe, test, expect } from "bun:test";
import specsIconsBase from "#data/specs-icons-base.json" with { type: "json" };
import { computeSpecs, getSpecIcon } from "#filters/spec-filters.js";

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
});
