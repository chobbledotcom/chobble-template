# Stage 1: Foundation - Data Attribute Infrastructure

## Goal

Add `data-filter-item` JSON attributes to filterable list items. This stage creates the data layer that powers client-side filtering.

## Success Criteria

- Each product/property `<li>` has `data-filter-item` with valid JSON
- JSON includes: slug, title, price, filters
- Non-filterable items (events, news) are untouched
- Build completes, existing filter pages still work
- Unit tests pass

---

## Implementation Steps

### 1. Create Eleventy filter plugin

**File**: `/src/_lib/eleventy/item-filter-data.js` (NEW)

```javascript
import { parseFilterAttributes } from "#filters/filter-core.js";

const getLowestPrice = (options) => {
  if (!options?.length) return 0;
  return Math.min(...options.map((o) => o.unit_price || 0));
};

const buildFilterData = (item) => ({
  slug: item.fileSlug,
  title: item.data.title.toLowerCase(),
  price: getLowestPrice(item.data.options),
  filters: parseFilterAttributes(item.data.filter_attributes),
});

export const configureItemFilterData = (eleventyConfig) => {
  eleventyConfig.addFilter("toFilterJson", (item) =>
    JSON.stringify(buildFilterData(item)),
  );
};
```

**Key decisions:**

- **No `order` field.** The items are already rendered in the correct order by Eleventy. The client-side JS uses DOM position as the default sort index. This avoids the `forloop.index0` problem entirely: `items.html` (line 11) wraps `list-item.html` inside `cachedBlock`, so the Liquid `forloop` object is not reliably available inside the include. DOM position is the correct source of truth.

- **No fallback for missing `filter_attributes`.** `parseFilterAttributes` already handles `undefined` by returning `{}` (filter-core.js:57-58). Items without `filter_attributes` get `filters: {}`.

- **`getLowestPrice` returns 0 for items without options.** Non-priced items sort to the top in price-asc, which is the expected behaviour.

### 2. Only add data attribute to filterable items

**File**: `/src/_includes/list-item.html` (MODIFY)

**Before:**
```liquid
<li>
  {%- for field in listItemFields -%}
```

**After:**
```liquid
<li{% if item.data.filter_attributes %} data-filter-item="{{ item | toFilterJson }}"{% endif %}>
  {%- for field in listItemFields -%}
```

**Why conditional:** `list-item.html` is shared by products, properties, events, news, locations and more. Only products and properties have `filter_attributes`. Adding a JSON blob to every event and news `<li>` wastes bytes and confuses client-side code.

**Caching note:** `items.html` wraps this include in `cachedBlock` keyed on `item.url + listItemFields`. Since `filter_attributes` is constant per item, the cached output is correct.

### 3. Register plugin in `.eleventy.js`

**File**: `.eleventy.js` (MODIFY)

```javascript
import { configureItemFilterData } from "#eleventy/item-filter-data.js";
```

Add the call near the other filter registrations (around line 109):

```javascript
configureItemFilterData(eleventyConfig);
```

---

## Testing

### Unit tests

**File**: `/test/unit/eleventy/item-filter-data.test.js` (NEW)

```javascript
import { describe, expect, test } from "bun:test";
import { configureItemFilterData } from "#eleventy/item-filter-data.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("toFilterJson", () => {
  const mockConfig = createMockEleventyConfig();
  configureItemFilterData(mockConfig);
  const toFilterJson = mockConfig.getFilter("toFilterJson");

  test("lowercases title for case-insensitive sorting", () => {
    const item = {
      fileSlug: "test",
      data: { title: "UPPERCASE Product", filter_attributes: [] },
    };
    const result = JSON.parse(toFilterJson(item));
    expect(result.title).toBe("uppercase product");
  });

  test("extracts lowest option price", () => {
    const item = {
      fileSlug: "test",
      data: {
        title: "Test",
        options: [{ unit_price: 100 }, { unit_price: 25 }, { unit_price: 50 }],
        filter_attributes: [],
      },
    };
    const result = JSON.parse(toFilterJson(item));
    expect(result.price).toBe(25);
  });

  test("slugifies filter attribute names and values", () => {
    const item = {
      fileSlug: "test",
      data: {
        title: "Test",
        filter_attributes: [{ name: "Frame Size", value: "Extra Large" }],
      },
    };
    const result = JSON.parse(toFilterJson(item));
    expect(result.filters["frame-size"]).toBe("extra-large");
  });

  test("returns empty filters for items without filter_attributes", () => {
    const item = { fileSlug: "test", data: { title: "Test" } };
    const result = JSON.parse(toFilterJson(item));
    expect(result.filters).toEqual({});
  });
});
```

**Test quality:** Each test verifies a specific _transformation_ (lowercasing, price extraction, slugification), not just input passthrough.

### Manual verification

1. `bun run build` - completes successfully
2. `bun run serve` - navigate to a category page
3. DevTools Elements: product `<li>` elements have `data-filter-item`
4. Event/news `<li>` elements do NOT have `data-filter-item`
5. Existing filter pages still work

---

## Files changed

| Action | File | Lines |
|--------|------|-------|
| Create | `/src/_lib/eleventy/item-filter-data.js` | ~20 |
| Create | `/test/unit/eleventy/item-filter-data.test.js` | ~50 |
| Modify | `.eleventy.js` | +2 |
| Modify | `/src/_includes/list-item.html` | 1 line change |

## Rollback

Remove conditional from `list-item.html`, remove import from `.eleventy.js`, delete new files. Purely additive change - nothing existing is affected.
