import { describe, expect, test } from "bun:test";
import specsIcons from "#data/specs-icons.json" with { type: "json" };
import {
  computeSpecs,
  getHighlightedSpecs,
  getListItemSpecs,
  prefetchSpecIcons,
  resolveIconAssetPath,
} from "#filters/spec-filters.js";

// Use actual spec name from config so tests stay in sync
const KNOWN_SPEC = Object.keys(specsIcons)[0];

// Pre-fetch iconify icons to disk so synchronous computeSpecs can read them
await prefetchSpecIcons();

describe("spec-filters", () => {
  // ============================================
  // computeSpecs - Input Validation
  // ============================================
  test("Returns empty array when specs is empty array", () => {
    const result = computeSpecs([]);
    expect(result).toEqual([]);
  });

  // ============================================
  // computeSpecs - Transformation
  // ============================================
  test("Adds icon and highlight properties to each spec", () => {
    const specs = [{ name: KNOWN_SPEC, value: "Yes" }];

    const result = computeSpecs(specs);

    expect(result.length).toBe(1);
    expect("icon" in result[0]).toBe(true);
    expect("highlight" in result[0]).toBe(true);
  });

  test("Preserves all original spec properties", () => {
    const specs = [
      {
        name: "test spec",
        value: "test value",
        customProp: "custom",
      },
    ];

    const result = computeSpecs(specs);

    expect(result[0].name).toBe("test spec");
    expect(result[0].value).toBe("test value");
    expect(result[0].customProp).toBe("custom");
  });

  test("Returns empty icon and false highlight for specs without config", () => {
    const specs = [{ name: "nonexistent-spec", value: "test" }];

    const result = computeSpecs(specs);

    expect(result[0].icon).toBe("");
    expect(result[0].highlight).toBe(false);
  });

  test("Returns SVG content for specs with matching icon", () => {
    const specs = [{ name: KNOWN_SPEC, value: "Yes" }];

    const result = computeSpecs(specs);

    expect(result[0].icon.startsWith("<svg")).toBe(true);
  });

  test("Finds icons regardless of spec name case", () => {
    const specs = [
      { name: KNOWN_SPEC, value: "lowercase" },
      { name: KNOWN_SPEC.toUpperCase(), value: "uppercase" },
    ];

    const result = computeSpecs(specs);

    expect(result[0].icon).toBe(result[1].icon);
  });

  // ============================================
  // computeSpecs - Icon resolution edge cases
  // ============================================

  test("Trims whitespace from spec name before lookup", () => {
    const specs = [
      { name: KNOWN_SPEC, value: "normal" },
      { name: `  ${KNOWN_SPEC}  `, value: "padded" },
    ];

    const result = computeSpecs(specs);

    expect(result[0].icon).toBe(result[1].icon);
  });

  // ============================================
  // getHighlightedSpecs - Input Validation
  // ============================================
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

  // ============================================
  // getListItemSpecs - Input Validation
  // ============================================
  test("getListItemSpecs returns empty array when specs is empty", () => {
    const result = getListItemSpecs([]);
    expect(result).toEqual([]);
  });

  // ============================================
  // getListItemSpecs - Filtering Logic
  // ============================================
  test("getListItemSpecs returns only specs with list_items true", () => {
    const specs = [
      { name: "spec1", value: "val1", list_items: true },
      { name: "spec2", value: "val2", list_items: false },
      { name: "spec3", value: "val3", list_items: true },
    ];

    const result = getListItemSpecs(specs);
    const names = result.map((s) => s.name);

    expect(names).toEqual(["spec1", "spec3"]);
  });

  test("getListItemSpecs returns empty array when no specs have list_items true", () => {
    const specs = [
      { name: "spec1", value: "val1", list_items: false },
      { name: "spec2", value: "val2", list_items: false },
    ];

    const result = getListItemSpecs(specs);

    expect(result).toEqual([]);
  });

  test("getListItemSpecs limits results to first 2 specs", () => {
    const specs = [
      { name: "spec1", value: "val1", list_items: true },
      { name: "spec2", value: "val2", list_items: true },
      { name: "spec3", value: "val3", list_items: true },
      { name: "spec4", value: "val4", list_items: true },
    ];

    const result = getListItemSpecs(specs);

    expect(result.length).toBe(2);
  });

  // ============================================
  // resolveIconAssetPath - Icon type detection
  // ============================================
  test("Resolves absolute path by stripping /assets/ prefix", () => {
    const result = resolveIconAssetPath("/assets/icons/players.svg");

    expect(result.assetPath).toBe("icons/players.svg");
    expect(result.isLocal).toBe(true);
  });

  test("Resolves absolute path without /assets/ prefix", () => {
    const result = resolveIconAssetPath("/icons/custom.svg");

    expect(result.assetPath).toBe("/icons/custom.svg");
    expect(result.isLocal).toBe(true);
  });

  test("Resolves iconify ID to iconify cache path", () => {
    const result = resolveIconAssetPath("hugeicons:help-circle");

    expect(result.assetPath).toBe("icons/iconify/hugeicons/help-circle.svg");
    expect(result.isLocal).toBe(false);
  });

  test("Normalizes iconify name to lowercase with hyphens", () => {
    const result = resolveIconAssetPath("HugeIcons:Help_Circle");

    expect(result.assetPath).toBe("icons/iconify/hugeicons/help-circle.svg");
    expect(result.isLocal).toBe(false);
  });

  test("getListItemSpecs sorts by order in specs-icons.json", () => {
    const specsIconsKeys = Object.keys(specsIcons);
    const specs = [
      { name: specsIconsKeys[1], value: "second", list_items: true },
      { name: specsIconsKeys[0], value: "first", list_items: true },
    ];

    const result = getListItemSpecs(specs);

    expect(result[0].name).toBe(specsIconsKeys[0]);
    expect(result[1].name).toBe(specsIconsKeys[1]);
  });
});
