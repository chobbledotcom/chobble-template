# Test Quality Criteria

Every test must satisfy ALL of the following criteria. When writing a new test, explicitly verify each checkbox before submitting.

## Mandatory Criteria

### 1. Tests Production Code, Not Reimplementations

- [ ] The test calls actual imported production functions/classes
- [ ] No logic from production code is copy-pasted or reimplemented in the test
- [ ] Constants (like storage keys, URLs, thresholds) are imported, not hardcoded

**Bad:**
```javascript
// Reimplements addItem logic - if production has a bug, this won't catch it
const addItem = (name, price) => {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.push({ name, price });
  localStorage.setItem("cart", JSON.stringify(cart));
};
addItem("Widget", 10);
assert.strictEqual(getCart().length, 1);
```

**Good:**
```javascript
// Tests the actual production function
import { addItem, getCart } from "#assets/cart-utils.js";
addItem("Widget", 10);
assert.strictEqual(getCart().length, 1);
```

---

### 2. Not Tautological

- [ ] The test does not simply assert the value it just set
- [ ] There is actual production code execution between setup and assertion
- [ ] The assertion verifies behavior, not just that JavaScript assignment works

**Bad:**
```javascript
// This tests nothing - you set it, then check you set it
button.style.display = "none";
assert.strictEqual(button.style.display, "none");
```

**Good:**
```javascript
// This tests that updateCartDisplay hides the button when cart is empty
saveCart([]);
updateCartDisplay();
assert.strictEqual(button.style.display, "none");
```

---

### 3. Tests Behavior, Not Implementation Details

- [ ] The test verifies observable outcomes, not internal state
- [ ] Refactoring production code shouldn't break the test (unless behavior changes)
- [ ] The test answers "does it work?" not "is it structured this way?"

**Bad:**
```javascript
// Tests internal structure - breaks if we rename the class
assert.ok(document.querySelector(".cart-items-internal-container"));
```

**Good:**
```javascript
// Tests behavior - adding item makes it appear in cart
addItem("Widget", 10);
const cartHtml = renderCart();
assert.ok(cartHtml.includes("Widget"));
```

---

### 4. Has Clear Failure Semantics

- [ ] When this test fails, it's obvious what's broken
- [ ] The test name describes the specific behavior being verified
- [ ] Error messages are descriptive

**Bad:**
```javascript
{
  name: "cart-test-1",
  test: () => {
    // 50 lines of setup and multiple assertions
    assert.ok(result);
  }
}
```

**Good:**
```javascript
{
  name: "addItem-increments-quantity-for-existing-item",
  description: "Adding same item twice increases quantity instead of duplicating",
  test: () => {
    addItem("Widget", 10);
    addItem("Widget", 10);
    assert.strictEqual(getCart().length, 1, "Should have 1 item, not 2");
    assert.strictEqual(getCart()[0].quantity, 2, "Quantity should be 2");
  }
}
```

---

### 5. Isolated and Repeatable

- [ ] Test cleans up after itself (temp files, global state, mocks)
- [ ] Test doesn't depend on other tests running first
- [ ] Test produces same result every time (no time-dependent flakiness)

**Bad:**
```javascript
// Mutates global state without cleanup
globalThis.localStorage = mockStorage;
// ... test runs ...
// Forgot to restore - next test is broken
```

**Good:**
```javascript
const withMockStorage = (fn) => {
  const original = globalThis.localStorage;
  globalThis.localStorage = createMockStorage();
  try {
    return fn();
  } finally {
    globalThis.localStorage = original;
  }
};
```

---

### 6. Tests One Thing

- [ ] Test has a single reason to fail
- [ ] Test name accurately describes what's being tested
- [ ] If you need "and" in the description, consider splitting

**Bad:**
```javascript
{
  name: "cart-operations",
  test: () => {
    // Tests add, remove, update, and total calculation
    // If this fails, which operation broke?
  }
}
```

**Good:**
```javascript
// Four separate tests, each with one reason to fail
{ name: "addItem-adds-new-item", ... }
{ name: "removeItem-removes-by-name", ... }
{ name: "updateQuantity-caps-at-max", ... }
{ name: "getTotal-sums-price-times-quantity", ... }
```

---

## Recommended Criteria

### 7. Covers Edge Cases

Consider testing:
- [ ] Empty/null/undefined inputs
- [ ] Boundary values (0, 1, max, max+1)
- [ ] Error conditions and recovery
- [ ] Concurrent/race conditions (where applicable)

### 8. Uses Test Fixtures Appropriately

- [ ] Uses factory functions from `test-utils.js` where available
- [ ] Creates minimal fixtures (only data needed for this test)
- [ ] Doesn't share mutable state between tests

### 9. Async Tests Are Actually Async

- [ ] `asyncTest` is only used when there are actual async operations
- [ ] Awaits are meaningful, not just `await Promise.resolve()`
- [ ] Timeouts in tests have clear justification

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What To Do Instead |
|--------------|--------------|-------------------|
| Reimplementing production logic | Tests the test, not the code | Import and call production code |
| Tautological assertions | Provides false confidence | Assert on behavior after action |
| Giant inline test helpers | Unmaintainable, drifts from prod | Extract to test-utils.js or test prod directly |
| Magic numbers/strings | Obscures intent, drifts from prod | Import constants from production |
| Testing private internals | Brittle, breaks on refactor | Test public API behavior |
| `setTimeout` for "waiting" | Flaky, slow | Use proper async/await or mock timers |

---

## Checklist for New Tests

Copy this into your PR description when adding tests:

```markdown
## Test Quality Checklist

- [ ] Tests production code, not reimplementations
- [ ] Not tautological (assertions verify behavior)
- [ ] Tests behavior, not implementation details
- [ ] Has clear failure semantics
- [ ] Isolated and repeatable
- [ ] Tests one thing
- [ ] Edge cases considered
```

---

## Examples of Tests That Should Be Deleted or Rewritten

From the codebase review, these patterns need fixing:

1. **Tests that reimplement `addItem`/`updateQuantity`** - Should call the imported functions directly

2. **UI state tests that set-then-assert** - Should trigger the actual UI update function and verify the result

3. **Tests with 100+ lines of inline JS** - Should either test the real module or be clearly documented as integration tests with known limitations
