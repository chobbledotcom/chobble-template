# Sub-Issues for #686: Redundant Test-Only Exports

This document contains templates for creating sub-issues to address test-only exports identified in issue #686.

---

## Priority 1: Build & Media Processing

### Issue 1.1: Refactor SCSS compilation tests to test behavior not implementation

**Files**: `src/_lib/build/scss.js`

**Description**:
Currently, `test/unit/build/scss.test.js` exports and tests internal functions (`createScssCompiler`, `compileScss`) which are implementation details.

**Current Problem**:
```javascript
// Bad: Testing internal compiler creation
test("Creates SCSS compiler function for given input path", async () => {
  const compiler = createScssCompiler(simpleScss, inputPath);
  expect(typeof compiler).toBe("function");
  const result = await compiler({});
  expect(result.includes("color: red")).toBe(true);
});
```

**Goal**:
Replace with integration tests that verify the output behavior - compiled CSS files in `_site/` - rather than internal compiler functions.

**Acceptance Criteria**:
- [ ] Remove exports of `createScssCompiler` and `compileScss` from `src/_lib/build/scss.js`
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json to remove these exports
- [ ] Create integration tests that:
  - Run the full Eleventy build
  - Verify CSS files exist in `_site/css/`
  - Verify CSS content is correctly compiled from SCSS
  - Test with different theme configurations
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 3 test-only exports, improves test reliability

**Labels**: refactoring, testing, priority-1

---

### Issue 1.2: Refactor image processing tests to test behavior not implementation

**Files**: `src/_lib/media/image.js`

**Description**:
Currently exports `createImageTransform` which is an internal implementation detail. Tests should verify image processing through the public `imageShortcode` API or integration tests.

**Current Problem**:
Tests directly call `createImageTransform` to test internal transformation logic.

**Goal**:
Test image processing through the public API (`imageShortcode`) or integration tests that verify generated images.

**Acceptance Criteria**:
- [ ] Remove export of `createImageTransform` from `src/_lib/media/image.js`
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Keep `imageShortcode` export (public API)
- [ ] Refactor tests to:
  - Call `imageShortcode` with various inputs
  - Verify generated HTML output
  - Verify image files are created with correct dimensions
  - Test responsive image srcset generation
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 1 test-only export, tests more realistic usage

**Labels**: refactoring, testing, priority-1

---

### Issue 1.3: Refactor thumbnail placeholder tests to test behavior not implementation

**Files**: `src/_lib/media/thumbnail-placeholder.js`

**Description**:
Exports internal constants and implementation details for testing.

**Goal**:
Test thumbnail placeholder generation through the public API or integration tests.

**Acceptance Criteria**:
- [ ] Review which exports from `thumbnail-placeholder.js` are truly internal
- [ ] Remove unnecessary test-only exports
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to verify placeholder behavior through public APIs
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 2-3 test-only exports

**Labels**: refactoring, testing, priority-1

---

## Priority 2: Collection Helpers

### Issue 2.1: Refactor categories collection tests to test public API

**Files**: `src/_lib/collections/categories.js`

**Description**:
Tests export and test intermediate transformation functions like `buildCategoryImageMap` and `assignCategoryImages` which are implementation details.

**Current Problem**:
```javascript
// Bad: Testing internal helper
test("buildCategoryImageMap-product-override", () => {
  const result = buildCategoryImageMap(categories, products);
  expect(result).toEqual({ widgets: ["img.jpg", 5] });
});
```

**Goal**:
Test through the public `createCategoriesCollection` API, verifying final collection output.

**Good Pattern**:
```javascript
// Good: Testing through public API
test("Categories inherit images from highest-order products", () => {
  const collection = createCategoriesCollection(collectionApi);
  const widgetCategory = collection.find(c => c.fileSlug === "widgets");
  expect(widgetCategory.data.header_image).toBe("img.jpg");
});
```

**Acceptance Criteria**:
- [ ] Remove exports of internal helpers: `buildCategoryImageMap`, `assignCategoryImages`, etc.
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to use `createCategoriesCollection` (public API)
- [ ] Verify final collection output instead of intermediate transformations
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 5-8 test-only exports from categories.js

**Labels**: refactoring, testing, priority-2

---

### Issue 2.2: Refactor products collection tests to test public API

**Files**: `src/_lib/collections/products.js`

**Description**:
Similar to categories, tests export and test intermediate helpers instead of testing through the public collection API.

**Acceptance Criteria**:
- [ ] Review all exported helpers from `products.js`
- [ ] Identify which are truly internal vs public utilities
- [ ] Remove test-only exports of internal helpers
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to use `createProductsCollection` (public API)
- [ ] Verify query functions like `getFeaturedProducts`, `getProductsByCategory` should remain exported (if part of public filter API)
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 5-8 test-only exports from products.js

**Labels**: refactoring, testing, priority-2

---

### Issue 2.3: Refactor properties collection tests to test public API

**Files**: `src/_lib/collections/properties.js`

**Description**:
Tests export and test intermediate transformation functions instead of testing through the public API.

**Acceptance Criteria**:
- [ ] Remove exports of internal helpers
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to use public collection API
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 3-5 test-only exports from properties.js

**Labels**: refactoring, testing, priority-2

---

### Issue 2.4: Refactor reviews collection tests to test public API

**Files**: `src/_lib/collections/reviews.js`

**Description**:
Tests export and test intermediate transformation functions instead of testing through the public API.

**Acceptance Criteria**:
- [ ] Remove exports of internal helpers
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to use public collection API
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 2-4 test-only exports from reviews.js

**Labels**: refactoring, testing, priority-2

---

### Issue 2.5: Refactor search collection tests to test public API

**Files**: `src/_lib/collections/search.js`

**Description**:
Tests export and test intermediate transformation functions instead of testing through the public API.

**Acceptance Criteria**:
- [ ] Remove exports of internal helpers
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to use public collection API
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 2-4 test-only exports from search.js

**Labels**: refactoring, testing, priority-2

---

## Priority 3: Frontend Components

### Issue 3.1: Refactor theme editor tests to test DOM behavior not configuration

**Files**:
- `src/_lib/public/theme/theme-editor-config.js`
- `src/_lib/public/theme/theme-editor-lib.js`

**Description**:
Tests import internal config objects (`GLOBAL_INPUTS`, `SCOPE_DEFINITIONS`, `SCOPED_INPUTS`, `SCOPE_SELECTORS`) to test parsing/generation logic. This tests implementation details instead of user-facing behavior.

**Current Problem**:
```javascript
import { GLOBAL_INPUTS, SCOPE_DEFINITIONS, SCOPED_INPUTS } from "#public/theme/theme-editor-config.js";
import { SCOPE_SELECTORS, parseThemeContent, generateThemeCss } from "#public/theme/theme-editor-lib.js";
// Then tests directly verify config structure
```

**Goal**:
Test theme editor through DOM interactions and verify CSS output.

**Acceptance Criteria**:
- [ ] Remove exports of `GLOBAL_INPUTS`, `SCOPE_DEFINITIONS`, `SCOPED_INPUTS`, `SCOPE_SELECTORS`
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Refactor tests to:
  - Simulate user interactions (DOM events, form inputs)
  - Verify theme editor UI updates correctly
  - Check that theme CSS is generated correctly in the DOM
  - Test with happy-dom to simulate browser environment
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 4 test-only exports, improves test realism

**Labels**: refactoring, testing, frontend, priority-3

---

## Priority 4: Config Helpers

### Issue 4.1: Refactor form helpers tests to use integration tests

**Files**: `src/_lib/config/form-helpers.js`

**Description**:
Exports `getFieldTemplate` for testing, which is an internal helper for config validation/processing.

**Goal**:
Test form config behavior end-to-end rather than testing internal validation logic.

**Acceptance Criteria**:
- [ ] Remove export of `getFieldTemplate`
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Create integration tests that:
  - Create test sites with various form configs
  - Verify the build succeeds/fails appropriately
  - Check that generated HTML reflects the config
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 1 test-only export

**Labels**: refactoring, testing, priority-4

---

### Issue 4.2: Refactor config validation tests to use integration tests

**Files**: `src/_lib/config/helpers.js`

**Description**:
Exports `validatePageFrontmatter` for testing, which is an internal validation helper.

**Goal**:
Test config validation through end-to-end build tests.

**Acceptance Criteria**:
- [ ] Remove export of `validatePageFrontmatter`
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Create integration tests that verify config validation during builds
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 1 test-only export

**Labels**: refactoring, testing, priority-4

---

### Issue 4.3: Refactor quote fields helpers tests to use integration tests

**Files**: `src/_lib/config/quote-fields-helpers.js`

**Description**:
Exports `buildSections` for testing, which is an internal helper.

**Goal**:
Test quote fields configuration through end-to-end tests.

**Acceptance Criteria**:
- [ ] Remove export of `buildSections`
- [ ] Update `ALLOWED_TEST_ONLY_EXPORTS` in biome.json
- [ ] Create integration tests for quote fields configuration
- [ ] All existing tests pass
- [ ] Code coverage maintained or improved

**Estimated Impact**: Removes 1 test-only export

**Labels**: refactoring, testing, priority-4

---

## Creating the Issues

To create these issues:

1. Go to https://github.com/chobbledotcom/chobble-template/issues/new
2. Copy the title and description from each section above
3. Add the suggested labels
4. Mention `@claude` in a comment to assign work

Or use the GitHub CLI:

```bash
# Install gh CLI if needed: https://cli.github.com/

# Priority 1 issues
gh issue create --title "Refactor SCSS compilation tests to test behavior not implementation" \
  --body-file <(sed -n '/^### Issue 1.1/,/^---$/p' .github/ISSUE_TEMPLATES_686.md) \
  --label "refactoring,testing,priority-1"

gh issue create --title "Refactor image processing tests to test behavior not implementation" \
  --body-file <(sed -n '/^### Issue 1.2/,/^---$/p' .github/ISSUE_TEMPLATES_686.md) \
  --label "refactoring,testing,priority-1"

# ... repeat for other issues
```

---

## Notes

- All issues reference parent issue #686
- Priorities are based on impact analysis from #686
- Each issue is scoped to specific files for focused work
- Acceptance criteria ensure tests remain comprehensive
- Pattern: "Test behavior, not implementation"
