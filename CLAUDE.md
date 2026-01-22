# CLAUDE.md - AI Assistant Guide for Chobble Template

## Project Overview

**Chobble Template** is an Eleventy (11ty) v3.0.0 static site generator for small business websites with e-commerce capabilities. It uses **Bun** as the package manager and runtime.

### Key Features
- Content types: Products, Categories, Events, News, Menus, Locations, Properties, Reviews, Team profiles
- E-commerce: Shopping cart (LocalStorage), Stripe Checkout, PayPal, Quote/enquiry mode
- 10 pre-built themes with live theme editor
- Responsive images with LQIP (Low Quality Image Placeholders)
- SEO/Schema.org structured data, RSS feeds, iCal events

---

## Quick Reference

### Essential Commands
```bash
bun install          # Install dependencies (MUST use bun, not npm)
bun run build        # Build the site to _site/
bun run serve        # Development server with hot reload
bun test             # Full test suite (lint + build + tests + coverage)
bun run test:unit    # Unit tests only
bun run lint         # Check code with Biome
bun run lint:fix     # Auto-fix lint issues
bun run precommit    # Pre-commit checks
```

### Directory Structure
```
src/
├── _data/           # Site configuration (config.json, site.json, strings.json)
├── _includes/       # Reusable HTML components (~85 files)
├── _layouts/        # Page layout templates (~34 layouts)
├── _lib/            # Core JavaScript library
│   ├── build/       # JS bundling, SCSS, theme compilation
│   ├── collections/ # Eleventy collections (12 types)
│   ├── config/      # Configuration helpers
│   ├── eleventy/    # Eleventy plugins (~13 configs)
│   ├── filters/     # URL-based filtering for products/properties
│   ├── media/       # Image processing (sharp, eleventy-img)
│   ├── public/      # Frontend JavaScript (bundled by Bun)
│   └── utils/       # Pure utility functions
├── css/             # SCSS stylesheets
├── products/        # Product markdown files
├── categories/      # Category data
├── events/          # Event data
└── [content dirs]/  # news, menus, locations, properties, etc.

test/
├── unit/            # Unit tests by feature
├── integration/     # Integration tests
├── code-quality/    # Code quality checks
├── test-utils.js    # Shared test utilities & factories
└── TEST-QUALITY-CRITERIA.md  # Testing standards
```

---

## Import Aliases

Use Node.js subpath imports (defined in `package.json`):

```javascript
import { memoize } from "#utils/memoize.js";
import { configureProducts } from "#collections/products.js";
import { configureImages } from "#media/image.js";
import config from "#data/config.json" with { type: "json" };
import { ROOT_DIR } from "#lib/paths.js";
```

**Available aliases:**
| Alias | Path |
|-------|------|
| `#data/*` | `./src/_data/*` |
| `#lib/*` | `./src/_lib/*` |
| `#build/*` | `./src/_lib/build/*` |
| `#collections/*` | `./src/_lib/collections/*` |
| `#config/*` | `./src/_lib/config/*` |
| `#eleventy/*` | `./src/_lib/eleventy/*` |
| `#filters/*` | `./src/_lib/filters/*` |
| `#media/*` | `./src/_lib/media/*` |
| `#utils/*` | `./src/_lib/utils/*` |
| `#public/*` | `./src/_lib/public/*` |
| `#test/*` | `./test/*` |

---

## Code Conventions

### Eleventy Plugin Pattern
Files registering with Eleventy export a `configureX` function:

```javascript
export function configureProducts(eleventyConfig) {
  eleventyConfig.addCollection("products", ...);
  eleventyConfig.addFilter("getProductsByCategory", ...);
}
```

### Functional Programming Style
The codebase uses curried, composable functions extensively:

```javascript
// Use pipe() for function composition
import { pipe, filter, map, sort } from "#toolkit/fp/array.js";

pipe(
  filter(x => x > 0),
  map(x => x * 2),
  sort((a, b) => a - b)
)(numbers);

// Curried helpers are preferred
const isActive = filter(item => item.active);
const getName = map(item => item.name);
```

### Memoization Pattern
```javascript
import { memoize } from "#utils/memoize.js";

const expensiveComputation = memoize(
  async (input) => { /* ... */ },
  { cacheKey: (args) => JSON.stringify(args[0]) }
);
```

### Available Array Utilities (`#toolkit/fp/array.js`)
- `pipe(...fns)` - Left-to-right function composition
- `filter(predicate)`, `map(fn)`, `flatMap(fn)`, `reduce(fn, initial)` - Curried array methods
- `sort(comparator)` - Non-mutating sort
- `unique(arr)`, `uniqueBy(getKey)` - Deduplicate arrays
- `filterMap(predicate, transform)` - Filter and map in single pass
- `compact(arr)` - Remove falsy values
- `chunk(arr, size)` - Split into groups
- `pick(keys)` - Extract object properties
- `memberOf(values)`, `notMemberOf(values)` - Membership predicates
- `pluralize(singular, plural?)` - Format counts with pluralization
- `accumulate(fn)` - Safe array building in reduce

### Error Handling: Fail Fast, Never Mask

**Throw errors instead of returning fallback values.** When something unexpected happens, fail immediately with a clear error rather than disguising the problem with a default value.

```javascript
// BAD - masks the problem, makes debugging harder
const getProduct = (id) => products.find(p => p.id === id) ?? { title: "Unknown" };
const parseConfig = (json) => { try { return JSON.parse(json); } catch { return {}; } };

// GOOD - fails immediately, stack trace points to the problem
const getProduct = (id) => {
  const product = products.find(p => p.id === id);
  if (!product) throw new Error(`Product not found: ${id}`);
  return product;
};
```

**Why this matters:**
- Silent fallbacks hide bugs until they cause bigger problems downstream
- Stack traces from early errors point directly to the root cause
- Fallback values often propagate through the system causing confusing behavior
- "It works but shows wrong data" is harder to debug than "it crashed here"

**Code quality tests enforce this:**
- `nullish-coalescing.test.js` - Bans `??` outside collections (where defaults belong)
- `data-fallbacks.test.js` - Bans `item.data.foo || fallback` patterns
- `try-catch-usage.test.js` - Allowlist-only for try/catch blocks

**Rare exceptions** (all require explicit allowlisting):
- Browser localStorage (users can corrupt it)
- External HTTP APIs (network failures happen)
- User-provided input at system boundaries

---

## Linting Rules (Biome)

The project enforces strict code quality via Biome. Key rules:

### Must Follow
- **Use arrow functions** - `useArrowFunction: error`
- **Use template literals** - `useTemplate: error`
- **Use const** - `useConst: error`
- **No var** - `noVar: error`
- **No ==** - `noDoubleEquals: error` (use `===`)
- **No unused imports/variables** - `noUnusedImports: error`, `noUnusedVariables: error`
- **No forEach** - `noForEach: error` (use `for...of` or curried `map`/`filter`)
- **No accumulating spread** - `noAccumulatingSpread: error` (use `accumulate()` helper)
- **Max cognitive complexity: 10** - `noExcessiveCognitiveComplexity: 10` (30 in tests)
- **No console.log** - except in `build/`, `ecommerce-backend/`, and `test/`
- **No skipped/focused tests** - `noSkippedTests: error`, `noFocusedTests: error`

### Formatting
- 2-space indentation
- Run `bun run lint:fix` to auto-format

---

## Testing Requirements

### Test Framework
- **Bun's native test runner** with happy-dom for DOM simulation
- Tests in `/test/unit/` and `/test/integration/`
- Shared utilities in `/test/test-utils.js`

### Test Quality Criteria (ALL tests must satisfy)

1. **Tests Production Code, Not Reimplementations**
   - Call actual imported production functions
   - Never copy-paste production logic into tests
   - Import constants, don't hardcode

2. **Not Tautological**
   - Don't assert values you just set
   - Verify behavior after production code executes

3. **Tests Behavior, Not Implementation Details**
   - Verify observable outcomes
   - Refactoring shouldn't break tests

4. **Has Clear Failure Semantics**
   - Test names describe specific behavior
   - When test fails, root cause is obvious

5. **Isolated and Repeatable**
   - Clean up after tests (temp files, global state)
   - No dependencies on other tests
   - No time-dependent flakiness

6. **Tests One Thing**
   - Single reason to fail
   - If you need "and" in description, split the test

### Test Utilities
```javascript
import {
  createMockEleventyConfig,  // Mock Eleventy config
  item, items,               // Collection item factories
  createEvent, createEvents, // Event fixtures
  createProduct,             // Product fixtures
  withTempDir, withTempFile, // Temp file management
  expectProp, expectDataArray, // Assertion helpers
  collectionApi,             // Mock collection API
} from "#test/test-utils.js";
```

---

## Common Patterns

### Collection Creation
```javascript
// In src/_lib/collections/[name].js
export const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", (collectionApi) => {
    return collectionApi.getFilteredByTag("product")
      .filter(item => !item.data.hidden)
      .sort(sortByOrder);
  });
};
```

### Eleventy Shortcode/Filter
```javascript
export const configureOpeningTimes = (eleventyConfig) => {
  eleventyConfig.addShortcode("openingTimes", (times) => {
    return renderOpeningTimesHtml(times);
  });

  eleventyConfig.addFilter("isOpen", (times, date) => {
    return checkIfOpen(times, date);
  });
};
```

### Image Processing
```javascript
import { configureImages } from "#media/image.js";

// In templates, use the image shortcode:
// {% image "photo.jpg", "Alt text", "class-names", "(max-width: 768px) 100vw, 50vw" %}
```

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Eleventy plugins | `configure*.js` | `configureProducts.js` |
| Collections | `[plural-noun].js` | `products.js`, `events.js` |
| Utilities | `[noun]-utils.js` | `array-utils.js`, `slug-utils.js` |
| Tests | `[feature].test.js` | `products.test.js` |
| SCSS | `_[component].scss` | `_buttons.scss` |

---

## Important Files

| File | Purpose |
|------|---------|
| `.eleventy.js` | Main Eleventy configuration - registers all plugins |
| `src/_data/config.json` | Site features config (cart, forms, payments, themes) |
| `src/_data/site.json` | Site name, URL, social links, opening hours |
| `src/_data/strings.json` | Customizable UI labels and permalinks |
| `biome.json` | Linting and formatting rules |
| `bunfig.toml` | Bun test configuration |
| `test/TEST-QUALITY-CRITERIA.md` | Detailed testing standards |

---

## Anti-Patterns to Avoid

1. **Don't use npm** - This project requires Bun
2. **Don't use `forEach`** - Use `for...of` loops or curried `map`/`filter`
3. **Don't accumulate with spread** - Use `accumulate()` helper for O(1) operations
4. **Don't use `var`** - Always use `const` (or `let` when reassignment needed)
5. **Don't use `==`** - Always use `===`
6. **Don't add console.log** - Except in build scripts and tests
7. **Don't exceed complexity 10** - Break complex functions into smaller pieces
8. **Don't hardcode magic values** - Import constants from production code
9. **Don't create tautological tests** - Verify behavior, not assignments
10. **Don't return fallbacks for errors** - Throw errors instead of masking problems with default values

---

## When Making Changes

1. **Read existing code first** - Understand patterns before modifying
2. **Follow existing conventions** - Match the style of surrounding code
3. **Run tests** - `bun test` before committing
4. **Run linter** - `bun run lint:fix` to auto-fix issues
5. **Keep functions small** - Stay under complexity limit of 10
6. **Use functional patterns** - Prefer `pipe`, curried functions, immutability
7. **Write tests** - Follow the 6 mandatory test quality criteria
8. **Use import aliases** - Keep imports clean with `#` prefixes
