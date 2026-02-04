# AI Guardrails Talk - Codebase Examples

Real examples from the codebase showing what the guardrails produce vs what AI typically generates without them.

---

## 1. Linter as Law: Arrow Functions, const, Template Literals

### What the codebase looks like (with guardrails)

From `src/_lib/collections/products.js`:

```js
const hasSku = (option) => Boolean(option.sku);

const toSkuEntry = (productTitle) => (option) => [
  option.sku,
  {
    name: option.name ? `${productTitle} - ${option.name}` : productTitle,
    unit_price: option.unit_price,
    max_quantity: option.max_quantity ?? null,
  },
];
```

### What AI writes without guardrails

```js
function hasSku(option) {
  if (option.sku) {
    return true;
  }
  return false;
}

function toSkuEntry(productTitle, option) {
  var name = option.name
    ? productTitle + " - " + option.name
    : productTitle;
  return [
    option.sku,
    {
      name: name,
      unit_price: option.unit_price,
      max_quantity: option.max_quantity != null ? option.max_quantity : null,
    },
  ];
}
```

**What's wrong:** `function` declarations, `var`, string concatenation instead of template literals, `!=` instead of `===`, unnecessary intermediary variable, not curried (loses composability).

---

## 2. Custom Code Quality Tests: No Mutation

### What the codebase looks like (with guardrails)

From `src/_lib/utils/dietary-utils.js`:

```js
import { filter, pipe, uniqueBy } from "#toolkit/fp/array.js";

export const uniqueDietaryKeys = pipe(
  filter((key) => key.symbol && key.label),
  uniqueBy((key) => key.symbol),
);
```

### What AI writes without guardrails

```js
function getUniqueDietaryKeys(keys) {
  const result = [];
  const seen = new Set();
  keys.forEach((key) => {
    if (key.symbol && key.label && !seen.has(key.symbol)) {
      seen.add(key.symbol);
      result.push(key);
    }
  });
  return result;
}
```

**What's wrong:** `forEach` (banned by Biome), `.push()` mutation (banned by code quality test), mutable `const result = []` (banned), mutable `Set` (banned), imperative instead of composable. The guardrailed version is a reusable pipeline; the ungaurdrailed version is a one-off procedure.

---

## 3. Fail Fast: Throw, Don't Mask

### What the codebase looks like (with guardrails)

From `src/_lib/utils/format-price.js`:

```js
export const formatPrice = (currency, value) => {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid price value: ${JSON.stringify(value)}`);
  }
  return new Intl.NumberFormat("en", { style: "currency", currency })
    .format(num)
    .replace(/\.00$/, "");
};
```

From `src/_lib/collections/products.js` (duplicate SKU detection):

```js
const duplicate = findDuplicate(allSkuEntries, ([sku]) => sku);
if (duplicate)
  throw new Error(
    `Duplicate SKU "${duplicate[0]}" found in product "${duplicate[1].name}"`,
  );
```

### What AI writes without guardrails

```js
function formatPrice(currency, value) {
  try {
    const num = Number(value);
    if (isNaN(num)) {
      return "$0.00"; // fallback for invalid values
    }
    return new Intl.NumberFormat("en", { style: "currency", currency })
      .format(num);
  } catch (e) {
    console.log("Error formatting price:", e);
    return "$0.00";
  }
}

// Duplicate SKUs? Just silently take the last one
const skuMap = {};
products.forEach((product) => {
  product.data.options.forEach((option) => {
    if (option.sku) {
      skuMap[option.sku] = { /* ... */ };
    }
  });
});
```

**What's wrong:** Silent `$0.00` fallback means a product with price "abc" displays as free -- a business-critical bug you won't notice until a customer checks out. The `try/catch` (allowlist-only, only 9 locations permitted) hides the root cause. The `console.log` (banned in production code) means the error vanishes in production. The duplicate SKU version silently overwrites -- you ship broken pricing.

---

## 4. Duplication as Technical Debt (jscpd + Ratchet)

### What the codebase enforces

Three sensitivity tiers:
- **12 tokens** for functional toolkit code (near-zero tolerance)
- **23 tokens** for general source
- **40 tokens** as a baseline

The ratchet script (`scripts/cpd-ratchet.js`) records the current count. It can only ever go down. If your PR increases duplication, CI fails.

### What AI produces without guardrails

AI frequently generates code like this across multiple files:

```js
// In products.js
const items = collectionApi.getFilteredByTag("product")
  .filter(item => !item.data.hidden)
  .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

// In events.js (near-identical)
const items = collectionApi.getFilteredByTag("event")
  .filter(item => !item.data.hidden)
  .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));

// In locations.js (near-identical)
const items = collectionApi.getFilteredByTag("location")
  .filter(item => !item.data.hidden)
  .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
```

**What's wrong:** The sort logic, the filter-hidden logic, and the get-by-tag pattern are duplicated across every collection. The guardrailed codebase extracts these into shared utilities (`sortItems`, `getProductsFromApi`, `featuredCollection`).

---

## 5. Test Quality Enforced by Tests

### What the codebase enforces

From `test/unit/code-quality/test-quality.test.js`:

**Tautological assertion detection** -- catches tests that test nothing:
```js
// This gets flagged automatically:
button.disabled = false;
assert.strictEqual(button.disabled, false);  // VIOLATION: set then assert
```

**Vague name detection:**
```js
const VAGUE_NAME_PATTERNS = [
  /^test-?\d+$/i,     // "test-1"
  /^test$/i,          // "test"
  /^works$/i,         // "works"
  /^basic$/i,         // "basic"
  /^simple$/i,        // "simple"
];
```

**Mandatory assertion messages:**
```js
// Flagged: no message
assert.strictEqual(result, 42);

// Required: descriptive message
assert.strictEqual(result, 42, "computeTotal returns sum of line items");
```

### What AI writes without guardrails

```js
test("test1", () => {
  const cart = new Cart();
  cart.items = [{ price: 10 }, { price: 20 }];
  expect(cart.items.length).toBe(2);  // tautological: we just set 2 items
});

test("works", () => {
  const result = formatPrice("GBP", 10);
  expect(result).toBeTruthy();  // vague: what does "truthy" mean here?
});

test("basic", () => {
  // 50 lines testing 6 different things...
});
```

**What's wrong:** Vague names ("test1", "works", "basic") give no information when they fail. Tautological assertions test what you just set, not behavior. No assertion messages mean a CI failure says "expected 3, got 2" with no context.

---

## 6. The Ratchet: Debt Can Only Shrink

### What the codebase has

From `test/code-quality/code-quality-exceptions.js`:

```
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                              WARNING                                     ║
 * ║                                                                          ║
 * ║  DO NOT ADD NEW ENTRIES TO THIS FILE UNDER ANY CIRCUMSTANCES.            ║
 * ║                                                                          ║
 * ║  The ONLY valid changes to this file are DELETIONS.                      ║
 * ║                                                                          ║
 * ║  If your new code triggers a quality check failure:                      ║
 * ║    1. Fix the code to meet quality standards - no exceptions             ║
 * ║    2. If you believe the check is wrong, fix the check itself            ║
 * ║    3. There is no option 3                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
```

Every exception is listed with file:line and a comment explaining *why* it exists:

```js
const ALLOWED_TRY_CATCHES = frozenSet([
  "ecommerce-backend/server.js:185",       // PayPal API calls
  "src/_lib/public/utils/http.js",         // centralized HTTP error handling
  "src/_lib/public/utils/cart-utils.js:14" // localStorage corruption
]);
```

### What happens without guardrails

No tracking. Each AI session adds new `try/catch`, new `let`, new `??` fallbacks. The codebase slowly accumulates defensive patterns that mask bugs. Nobody knows which fallbacks are intentional vs accidental. Technical debt grows monotonically.

---

## 7. How CLAUDE.md Feeds Rules to AI

The AI reads `CLAUDE.md` which contains the same rules the tests enforce:

- "Throw errors instead of returning fallback values"
- "Use `pipe()` for function composition"
- "Don't use `forEach`" / "Don't use `var`"
- "Don't accumulate with spread -- use `accumulate()` helper"
- "Don't return fallbacks for errors"

Then the code quality tests verify the AI actually followed through. The ratchet prevents regression. It's a closed loop:

```
CLAUDE.md (rules) --> AI writes code --> Linter checks syntax -->
Code quality tests check patterns --> Ratchet prevents regression -->
Pre-commit runs everything --> CI runs it again
```

---

## Summary: One Table

| Layer | What It Catches | Example |
|-------|----------------|---------|
| Biome linter | `var`, `==`, `forEach`, `console.log`, complexity > 7 | Arrow functions only, template literals only |
| 39 code quality tests | `.push()`, `let`, `try/catch`, `??`, `obj[k]=`, commented code, TODOs | Functional patterns, fail-fast errors |
| jscpd (3 tiers) | Copy-pasted logic across files | Shared utilities instead of duplication |
| Ratchet | Any increase in violations | Debt can only decrease |
| knip | Unused exports, dead dependencies | Clean API surfaces |
| Test quality tests | Vague names, tautological assertions, missing messages | Descriptive, behavioral tests |
| 100% coverage | Untested code paths | Every function, every line |
| Pre-commit pipeline | All of the above, in sequence | 9-step gauntlet before any commit |
