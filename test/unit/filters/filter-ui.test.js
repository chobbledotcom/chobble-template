import { describe, expect, test } from "bun:test";
import { buildFilterUIData } from "#filters/filter-ui.js";

// ============================================
// Test helpers
// ============================================

/** Build UI with optional active filters */
const buildUI = (activeFilters = {}) =>
  buildFilterUIData(
    {
      attributes: { colour: ["red", "blue"], size: ["small", "large"] },
      displayLookup: {
        colour: "Colour",
        red: "Red",
        blue: "Blue",
        size: "Size",
        small: "Small",
        large: "Large",
      },
    },
    activeFilters,
    [
      "colour/blue",
      "colour/red",
      "size/large",
      "size/small",
      "colour/blue/size/large",
      "colour/blue/size/small",
      "colour/red/size/large",
      "colour/red/size/small",
    ].map((path) => ({ path })),
    "/products",
  );

/** Find an option by group name and filter value */
const findOption = (ui, groupName, filterValue) =>
  ui.groups
    .find((g) => g.name === groupName)
    .options.find((o) => o.filterValue === filterValue);

// ============================================
// Attribute options include filterKey/filterValue metadata
// ============================================

describe("attribute option metadata", () => {
  test("options include filterKey and filterValue slugs", () => {
    const redOption = findOption(buildUI(), "colour", "red");

    expect(redOption.filterKey).toBe("colour");
    expect(redOption.filterValue).toBe("red");
  });

  test("options include filterKeyLabel and filterValueLabel display text", () => {
    const redOption = findOption(buildUI(), "colour", "red");

    expect(redOption.filterKeyLabel).toBe("Colour");
    expect(redOption.filterValueLabel).toBe("Red");
  });

  test("active option also has filter metadata", () => {
    const redOption = findOption(buildUI({ colour: "red" }), "colour", "red");

    expect(redOption.active).toBe(true);
    expect(redOption.filterKey).toBe("colour");
    expect(redOption.filterKeyLabel).toBe("Colour");
    expect(redOption.filterValueLabel).toBe("Red");
  });
});

// ============================================
// Sort options include sortKey
// ============================================

describe("sort option metadata", () => {
  test("sort options include sortKey", () => {
    const ui = buildUI();
    const sortGroup = ui.groups.find((g) => g.name === "sort");

    expect(sortGroup.options.find((o) => o.sortKey === "default").sortKey).toBe(
      "default",
    );
    expect(
      sortGroup.options.find((o) => o.sortKey === "price-asc").sortKey,
    ).toBe("price-asc");
  });

  test("all sort options have a sortKey", () => {
    const sortGroup = buildUI().groups.find((g) => g.name === "sort");

    for (const option of sortGroup.options) {
      expect(option.sortKey).toBeDefined();
      expect(typeof option.sortKey).toBe("string");
    }
  });
});

// ============================================
// Active filters include removeFilterKey
// ============================================

describe("active filter metadata", () => {
  test("active filters include removeFilterKey", () => {
    const ui = buildUI({ colour: "red" });

    expect(ui.activeFilters.length).toBe(1);
    expect(ui.activeFilters[0].removeFilterKey).toBe("colour");
  });

  test("multiple active filters each have their removeFilterKey", () => {
    const ui = buildUI({ colour: "red", size: "small" });

    expect(ui.activeFilters.length).toBe(2);
    expect(
      ui.activeFilters.find((f) => f.removeFilterKey === "colour"),
    ).toBeDefined();
    expect(
      ui.activeFilters.find((f) => f.removeFilterKey === "size"),
    ).toBeDefined();
  });

  test("removeFilterKey matches the filter attribute slug", () => {
    const ui = buildUI({ colour: "blue", size: "large" });

    const keys = ui.activeFilters.map((f) => f.removeFilterKey).sort();
    expect(keys).toEqual(["colour", "size"]);
  });
});
