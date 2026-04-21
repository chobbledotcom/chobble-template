import { describe, expect, test } from "bun:test";
import { itemMatchesFilters } from "#public/ui/category-filter-engine.js";
import {
  addFilter,
  buildLabelLookup,
  readInitialFilters,
  readInitialSort,
  rebuildPills,
  replayLoadingAnimation,
  updateOptionActiveStates,
  updateOptionVisibility,
} from "#public/ui/category-filter-ui.js";

const makeColourSizeItems = (...specs) =>
  specs.map(([colour, size]) => ({ data: { filters: { colour, size } } }));

const buildGroupsContainer = (groupsDef) => {
  const container = document.createElement("div");
  const groupsUl = document.createElement("ul");
  groupsUl.className = "filter-groups";
  container.appendChild(groupsUl);
  for (const [key, values] of Object.entries(groupsDef)) {
    const groupLi = document.createElement("li");
    for (const value of values) {
      const optionLi = document.createElement("li");
      const link = document.createElement("a");
      link.dataset.filterKey = key;
      link.dataset.filterValue = value;
      optionLi.appendChild(link);
      groupLi.appendChild(optionLi);
    }
    groupsUl.appendChild(groupLi);
  }
  return container;
};

const runVisibility = (items, activeFilters, groupsDef) => {
  const container = buildGroupsContainer(groupsDef);
  const matchCount = items.filter((item) =>
    itemMatchesFilters(item, activeFilters),
  ).length;
  updateOptionVisibility(container, items, activeFilters, matchCount);
  return (key, value) => {
    const link = container.querySelector(
      `[data-filter-key="${key}"][data-filter-value="${value}"]`,
    );
    return link.closest("li").style.display !== "none";
  };
};

const COLOUR_SIZE_GROUPS = {
  colour: ["red", "blue", "green"],
  size: ["large", "small"],
  weight: ["heavy"],
};

// ============================================
// addFilter
// ============================================

describe("addFilter", () => {
  test("adds link's filter key/value to existing filters", () => {
    const link = { dataset: { filterKey: "size", filterValue: "large" } };
    const result = addFilter({ colour: "red" }, link);
    expect(result).toEqual({ colour: "red", size: "large" });
  });

  test("overwrites existing value for the same key", () => {
    const link = { dataset: { filterKey: "colour", filterValue: "blue" } };
    const result = addFilter({ colour: "red" }, link);
    expect(result).toEqual({ colour: "blue" });
  });

  test("does not mutate the input filters", () => {
    const filters = { colour: "red" };
    const link = { dataset: { filterKey: "size", filterValue: "large" } };
    addFilter(filters, link);
    expect(filters).toEqual({ colour: "red" });
  });
});

// ============================================
// buildLabelLookup
// ============================================

describe("buildLabelLookup", () => {
  test("builds slug-to-label map from data attributes", () => {
    const container = document.createElement("div");
    const a = document.createElement("a");
    a.dataset.filterKey = "colour";
    a.dataset.filterKeyLabel = "Colour";
    a.dataset.filterValue = "red";
    a.dataset.filterValueLabel = "Red";
    container.appendChild(a);

    const result = buildLabelLookup(container);

    expect(result).toEqual({ colour: "Colour", red: "Red" });
  });

  test("returns empty object when no label elements exist", () => {
    const container = document.createElement("div");
    expect(buildLabelLookup(container)).toEqual({});
  });

  test("merges entries from multiple label elements", () => {
    const container = document.createElement("div");
    for (const [key, keyLabel, value, valueLabel] of [
      ["colour", "Colour", "red", "Red"],
      ["size", "Size", "large", "Large"],
    ]) {
      const a = document.createElement("a");
      a.dataset.filterKey = key;
      a.dataset.filterKeyLabel = keyLabel;
      a.dataset.filterValue = value;
      a.dataset.filterValueLabel = valueLabel;
      container.appendChild(a);
    }

    const result = buildLabelLookup(container);

    expect(result).toEqual({
      colour: "Colour",
      red: "Red",
      size: "Size",
      large: "Large",
    });
  });
});

// ============================================
// readInitialFilters
// ============================================

const appendFilterOption = (container, key, value, active = false) => {
  const li = document.createElement("li");
  const link = document.createElement("a");
  link.dataset.filterKey = key;
  link.dataset.filterValue = value;
  if (active) link.classList.add("active");
  li.appendChild(link);
  container.appendChild(li);
};

describe("readInitialFilters", () => {
  const buildPillsAndOptions = (pills, options) => {
    const container = document.createElement("div");
    for (const key of pills) {
      const removeLink = document.createElement("a");
      removeLink.dataset.removeFilter = key;
      container.appendChild(removeLink);
    }
    for (const [key, value, active] of options) {
      appendFilterOption(container, key, value, active);
    }
    return container;
  };

  test("reads active filter values by matching remove-filter keys to active options", () => {
    const container = buildPillsAndOptions(
      ["colour"],
      [
        ["colour", "red", true],
        ["colour", "blue", false],
      ],
    );

    expect(readInitialFilters(container)).toEqual({ colour: "red" });
  });

  test("returns empty object when no remove-filter pills exist", () => {
    const container = buildPillsAndOptions([], [["colour", "red", true]]);

    expect(readInitialFilters(container)).toEqual({});
  });

  test("skips remove-filter pills with no matching active option", () => {
    const container = buildPillsAndOptions(["size"], [["colour", "red", true]]);

    expect(readInitialFilters(container)).toEqual({});
  });
});

// ============================================
// readInitialSort
// ============================================

describe("readInitialSort", () => {
  const buildSortContainer = (sortKeys, selectedIndex) => {
    const container = document.createElement("div");
    if (sortKeys === null) return container;
    const select = document.createElement("select");
    select.className = "sort-select";
    for (const key of sortKeys) {
      const option = document.createElement("option");
      if (key !== undefined) option.dataset.sortKey = key;
      select.appendChild(option);
    }
    select.selectedIndex = selectedIndex;
    container.appendChild(select);
    return container;
  };

  test("returns 'default' when no sort-select exists", () => {
    expect(readInitialSort(buildSortContainer(null))).toBe("default");
  });

  test("returns the selected option's sort key", () => {
    const container = buildSortContainer(["price-asc", "name-desc"], 1);
    expect(readInitialSort(container)).toBe("name-desc");
  });

  test("returns 'default' when selected option has no sort key", () => {
    const container = buildSortContainer([undefined, "name-desc"], 0);
    expect(readInitialSort(container)).toBe("default");
  });
});

// ============================================
// rebuildPills
// ============================================

describe("rebuildPills", () => {
  const getPillTexts = (pillContainer) =>
    Array.from(pillContainer.querySelectorAll("li")).map(
      (li) => li.textContent,
    );

  test("renders a pill and a clear-all link for each active filter", () => {
    const pillContainer = document.createElement("ul");
    const labels = { colour: "Colour", red: "Red" };

    rebuildPills(pillContainer, { colour: "red" }, labels);

    expect(getPillTexts(pillContainer)).toEqual([
      "Colour: Red\u00d7",
      "Clear all",
    ]);
  });

  test("wipes previous pill content before rebuilding", () => {
    const pillContainer = document.createElement("ul");
    pillContainer.innerHTML = "<li>stale</li>";

    rebuildPills(pillContainer, { colour: "red" }, { colour: "C", red: "R" });

    expect(getPillTexts(pillContainer)).toEqual(["C: R\u00d7", "Clear all"]);
  });

  test("renders no pills and no clear-all when filters are empty", () => {
    const pillContainer = document.createElement("ul");
    pillContainer.innerHTML = "<li>stale</li>";

    rebuildPills(pillContainer, {}, {});

    expect(getPillTexts(pillContainer)).toEqual([]);
  });

  test("sets remove-filter dataset and aria-label on the remove link", () => {
    const pillContainer = document.createElement("ul");
    rebuildPills(
      pillContainer,
      { colour: "red" },
      { colour: "Colour", red: "Red" },
    );

    const removeLink = pillContainer.querySelector("[data-remove-filter]");
    expect(removeLink.dataset.removeFilter).toBe("colour");
    expect(removeLink.getAttribute("aria-label")).toBe("Remove Colour filter");
  });
});

// ============================================
// updateOptionActiveStates
// ============================================

describe("updateOptionActiveStates", () => {
  const buildOptions = (specs) => {
    const container = document.createElement("div");
    for (const [key, value] of specs) {
      appendFilterOption(container, key, value);
    }
    return container;
  };

  const activeValues = (container) =>
    Array.from(container.querySelectorAll("li.active")).map(
      (li) => li.querySelector("[data-filter-key]").dataset.filterValue,
    );

  test("adds 'active' class to matching option <li>s and removes it from the rest", () => {
    const container = buildOptions([
      ["colour", "red"],
      ["colour", "blue"],
      ["size", "large"],
    ]);
    for (const li of container.querySelectorAll("li"))
      li.classList.add("active");

    updateOptionActiveStates(container, { colour: "red" });

    expect(activeValues(container)).toEqual(["red"]);
  });

  test("removes all active classes when no filters are active", () => {
    const container = buildOptions([
      ["colour", "red"],
      ["size", "large"],
    ]);
    for (const li of container.querySelectorAll("li"))
      li.classList.add("active");

    updateOptionActiveStates(container, {});

    expect(activeValues(container)).toEqual([]);
  });
});

// ============================================
// replayLoadingAnimation
// ============================================

describe("replayLoadingAnimation", () => {
  const buildAnimatedContainer = ({ withSpinner, withContent }) => {
    const container = document.createElement("div");
    if (withSpinner) {
      const spinner = document.createElement("div");
      spinner.className = "filter-spinner";
      container.appendChild(spinner);
    }
    if (withContent) {
      const content = document.createElement("div");
      content.className = "filtered-content";
      container.appendChild(content);
    }
    return container;
  };

  test("restarts animations on spinner and content elements", () => {
    const container = buildAnimatedContainer({
      withSpinner: true,
      withContent: true,
    });
    const spinner = container.querySelector(".filter-spinner");
    const content = container.querySelector(".filtered-content");
    spinner.style.animation = "spin 1s infinite";
    content.style.animation = "fade 1s";

    replayLoadingAnimation(container);

    expect(spinner.style.animation).toBe("");
    expect(content.style.animation).toBe("");
  });

  test("does nothing when filteredItems is null", () => {
    expect(() => replayLoadingAnimation(null)).not.toThrow();
  });

  test("does nothing when spinner or content is missing", () => {
    const container = buildAnimatedContainer({
      withSpinner: true,
      withContent: false,
    });
    const spinner = container.querySelector(".filter-spinner");
    spinner.style.animation = "spin 1s infinite";

    replayLoadingAnimation(container);

    expect(spinner.style.animation).toBe("spin 1s infinite");
  });
});

// ============================================
// updateOptionVisibility - exercises real production DOM walker & feasibility logic
// ============================================

describe("updateOptionVisibility", () => {
  const items = makeColourSizeItems(
    ["red", "large"],
    ["red", "small"],
    ["blue", "large"],
    ["blue", "small"],
  );

  test("hides option whose hypothetical match count is 0", () => {
    const isVisible = runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("weight", "heavy")).toBe(false);
  });

  test("shows cross-group option that narrows the unfiltered set", () => {
    const isVisible = runVisibility(items, {}, COLOUR_SIZE_GROUPS);
    expect(isVisible("size", "large")).toBe(true);
  });

  test("shows same-group replacement even when hypothetical count matches current", () => {
    const isVisible = runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("colour", "blue")).toBe(true);
  });

  test("shows cross-group option that narrows the currently matched set", () => {
    const isVisible = runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("size", "large")).toBe(true);
  });

  test("always shows the currently active option", () => {
    const isVisible = runVisibility(
      items,
      { colour: "red" },
      COLOUR_SIZE_GROUPS,
    );
    expect(isVisible("colour", "red")).toBe(true);
  });

  test("hides cross-group option that does not narrow the unfiltered set", () => {
    const uniform = makeColourSizeItems(
      ["red", "large"],
      ["blue", "large"],
      ["green", "large"],
    );
    const isVisible = runVisibility(uniform, {}, COLOUR_SIZE_GROUPS);
    expect(isVisible("size", "large")).toBe(false);
  });

  test("skips the sort-select group", () => {
    const container = buildGroupsContainer({ colour: ["red"] });
    const sortGroup = document.createElement("li");
    const sortSelect = document.createElement("select");
    sortSelect.className = "sort-select";
    sortGroup.appendChild(sortSelect);
    container.querySelector(".filter-groups").appendChild(sortGroup);

    updateOptionVisibility(container, [], {}, 0);

    expect(sortGroup.style.display).toBe("");
  });

  test("hides whole group when all its options are infeasible", () => {
    const container = buildGroupsContainer({ weight: ["heavy"] });
    const allItems = makeColourSizeItems(["red", "large"]);

    updateOptionVisibility(container, allItems, {}, allItems.length);

    const group = container.querySelector(".filter-groups > li");
    expect(group.style.display).toBe("none");
  });
});
