import { computeSpecs, getSpecIcon } from "#filters/spec-filters.js";
import {
  createTestRunner,
  expectDeepEqual,
  expectStrictEqual,
  expectTrue,
} from "#test/test-utils.js";

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
      const lowerResult = getSpecIcon("has dongle");
      const upperResult = getSpecIcon("HAS DONGLE");
      const mixedResult = getSpecIcon("Has Dongle");

      expectStrictEqual(
        lowerResult,
        upperResult,
        "Lowercase and uppercase spec names should return same icon",
      );
      expectStrictEqual(
        lowerResult,
        mixedResult,
        "Lowercase and mixed-case spec names should return same icon",
      );
    },
  },
  {
    name: "getSpecIcon-trims-whitespace",
    description: "Trims whitespace from spec name before lookup",
    test: () => {
      const normalResult = getSpecIcon("has dongle");
      const paddedResult = getSpecIcon("  has dongle  ");

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
      const result = getSpecIcon("has dongle");

      expectTrue(
        result.length > 0,
        "Known spec should return non-empty content",
      );
      expectTrue(
        result.includes("<svg") || result.includes("<SVG"),
        "Icon content should contain SVG markup",
      );
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
        specs: [{ name: "has dongle", value: "Yes" }],
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
            nested: { a: 1 },
          },
        ],
      };

      const result = computeSpecs(data);

      expectStrictEqual(
        result[0].name,
        "test spec",
        "Name property should be preserved",
      );
      expectStrictEqual(
        result[0].value,
        "test value",
        "Value property should be preserved",
      );
      expectStrictEqual(
        result[0].customProp,
        "custom",
        "Custom properties should be preserved",
      );
      expectDeepEqual(
        result[0].nested,
        { a: 1 },
        "Nested objects should be preserved",
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
        specs: [{ name: "has dongle", value: "Yes" }],
      };

      const result = computeSpecs(data);

      expectTrue(
        result[0].icon.length > 0,
        "Icon should be non-empty for known spec",
      );
      expectTrue(
        result[0].icon.includes("<svg") || result[0].icon.includes("<SVG"),
        "Icon should contain SVG markup",
      );
    },
  },
  {
    name: "computeSpecs-handles-multiple-specs",
    description: "Handles multiple specs with mixed icon availability",
    test: () => {
      const data = {
        specs: [
          { name: "has dongle", value: "Yes" },
          { name: "no-icon-spec", value: "test" },
          { name: "HAS DONGLE", value: "Also yes" },
        ],
      };

      const result = computeSpecs(data);

      expectStrictEqual(result.length, 3, "Should return all three specs");
      expectTrue(result[0].icon.length > 0, "First spec should have icon");
      expectStrictEqual(
        result[1].icon,
        "",
        "Second spec should have empty icon (no match)",
      );
      expectTrue(result[2].icon.length > 0, "Third spec should have icon");
      expectStrictEqual(
        result[0].icon,
        result[2].icon,
        "Case-normalized specs should have identical icons",
      );
    },
  },

  // ============================================
  // Immutability
  // ============================================
  {
    name: "computeSpecs-does-not-mutate-input",
    description: "Does not modify the input data object",
    test: () => {
      const originalData = {
        specs: [{ name: "has dongle", value: "Yes" }],
      };
      const dataCopy = JSON.parse(JSON.stringify(originalData));

      computeSpecs(dataCopy);

      expectDeepEqual(
        dataCopy,
        originalData,
        "Input data should not be mutated by computeSpecs",
      );
    },
  },
];

export default createTestRunner("spec-filters", testCases);
