import specsIconsBase from "#data/specs-icons-base.json" with { type: "json" };
import { computeSpecs, getSpecIcon } from "#filters/spec-filters.js";
import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

// Use actual spec name from base config so tests stay in sync
const KNOWN_SPEC = Object.keys(specsIconsBase)[0];

const testCases = [
  // ============================================
  // getSpecIcon - Input Validation
  // ============================================
  {
    name: "getSpecIcon-null-returns-empty",
    description: "Returns empty string for null input",
    test: () => {
      const result = getSpecIcon(null);
      expectStrictEqual(
        result,
        "",
        "getSpecIcon(null) should return empty string",
      );
    },
  },
  {
    name: "getSpecIcon-undefined-returns-empty",
    description: "Returns empty string for undefined input",
    test: () => {
      const result = getSpecIcon(undefined);
      expectStrictEqual(
        result,
        "",
        "getSpecIcon(undefined) should return empty string",
      );
    },
  },
  {
    name: "getSpecIcon-empty-string-returns-empty",
    description: "Returns empty string for empty string input",
    test: () => {
      const result = getSpecIcon("");
      expectStrictEqual(
        result,
        "",
        "getSpecIcon('') should return empty string",
      );
    },
  },
  {
    name: "getSpecIcon-unknown-spec-returns-empty",
    description: "Returns empty string for non-existent spec name",
    test: () => {
      const result = getSpecIcon("nonexistent-spec-name");
      expectStrictEqual(
        result,
        "",
        "Unknown spec name should return empty string",
      );
    },
  },

  // ============================================
  // getSpecIcon - Normalization
  // ============================================
  {
    name: "getSpecIcon-normalizes-to-lowercase",
    description: "Normalizes spec name to lowercase before lookup",
    test: () => {
      const lowerResult = getSpecIcon(KNOWN_SPEC);
      const upperResult = getSpecIcon(KNOWN_SPEC.toUpperCase());

      expectStrictEqual(
        lowerResult,
        upperResult,
        "Lowercase and uppercase spec names should return same icon",
      );
    },
  },
  {
    name: "getSpecIcon-trims-whitespace",
    description: "Trims whitespace from spec name before lookup",
    test: () => {
      const normalResult = getSpecIcon(KNOWN_SPEC);
      const paddedResult = getSpecIcon(`  ${KNOWN_SPEC}  `);

      expectStrictEqual(
        normalResult,
        paddedResult,
        "Padded spec name should return same icon as trimmed name",
      );
    },
  },
  {
    name: "getSpecIcon-returns-svg-for-known-spec",
    description: "Returns SVG content for spec with defined icon",
    test: () => {
      const result = getSpecIcon(KNOWN_SPEC);

      expectTrue(result.startsWith("<svg"), "Icon should start with <svg");
    },
  },

  // ============================================
  // computeSpecs - Input Validation
  // ============================================
  {
    name: "computeSpecs-undefined-specs-returns-undefined",
    description: "Returns undefined when data.specs is undefined",
    test: () => {
      const result = computeSpecs({});
      expectStrictEqual(
        result,
        undefined,
        "computeSpecs should return undefined when specs is missing",
      );
    },
  },
  {
    name: "computeSpecs-null-specs-returns-undefined",
    description: "Returns undefined when data.specs is null",
    test: () => {
      const result = computeSpecs({ specs: null });
      expectStrictEqual(
        result,
        undefined,
        "computeSpecs should return undefined when specs is null",
      );
    },
  },
  {
    name: "computeSpecs-empty-array-returns-empty-array",
    description: "Returns empty array when specs is empty array",
    test: () => {
      const result = computeSpecs({ specs: [] });
      expectDeepEqual(
        result,
        [],
        "computeSpecs should return empty array for empty specs input",
      );
    },
  },

  // ============================================
  // computeSpecs - Transformation
  // ============================================
  {
    name: "computeSpecs-adds-icon-property",
    description: "Adds icon property to each spec object",
    test: () => {
      const data = {
        specs: [{ name: KNOWN_SPEC, value: "Yes" }],
      };

      const result = computeSpecs(data);

      expectStrictEqual(result.length, 1, "Result should contain one spec");
      expectTrue("icon" in result[0], "Spec should have icon property");
    },
  },
  {
    name: "computeSpecs-preserves-original-properties",
    description: "Preserves all original spec properties",
    test: () => {
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

      expectStrictEqual(
        result[0].name,
        "test spec",
        "Name should be preserved",
      );
      expectStrictEqual(
        result[0].value,
        "test value",
        "Value should be preserved",
      );
      expectStrictEqual(
        result[0].customProp,
        "custom",
        "Custom props should be preserved",
      );
    },
  },
  {
    name: "computeSpecs-unknown-spec-gets-empty-icon",
    description: "Returns empty string icon for specs without matching icon",
    test: () => {
      const data = {
        specs: [{ name: "nonexistent-spec", value: "test" }],
      };

      const result = computeSpecs(data);

      expectStrictEqual(
        result[0].icon,
        "",
        "Icon should be empty string for unknown spec",
      );
    },
  },
  {
    name: "computeSpecs-known-spec-gets-svg-icon",
    description: "Returns SVG content for specs with matching icon",
    test: () => {
      const data = {
        specs: [{ name: KNOWN_SPEC, value: "Yes" }],
      };

      const result = computeSpecs(data);

      expectTrue(
        result[0].icon.startsWith("<svg"),
        "Icon should start with <svg",
      );
    },
  },
  {
    name: "computeSpecs-case-insensitive-icon-lookup",
    description: "Finds icons regardless of spec name case",
    test: () => {
      const data = {
        specs: [
          { name: KNOWN_SPEC, value: "lowercase" },
          { name: KNOWN_SPEC.toUpperCase(), value: "uppercase" },
        ],
      };

      const result = computeSpecs(data);

      expectStrictEqual(
        result[0].icon,
        result[1].icon,
        "Same spec in different cases should get same icon",
      );
    },
  },
];

export default createTestRunner("spec-filters", testCases);
