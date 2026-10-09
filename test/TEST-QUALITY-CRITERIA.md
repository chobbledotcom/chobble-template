# Test Quality Criteria

Every test must satisfy ALL of the following criteria. When writing a new test, explicitly verify each checkbox before submitting. Tests are written with Vitest (`describe`/`test`/`expect`) — see `test/test-utils.js` for the shared factories and helpers.

## Mandatory Criteria

### 1. Tests Production Code, Not Reimplementations

- [ ] The test calls actual imported production functions/classes
- [ ] No logic from production code is copy-pasted or reimplemented in the test
- [ ] Constants (like permalinks, type maps, thresholds) are imported, not hardcoded

**Bad:**
```javascript
// Reimplements slugify - if production has a bug, this won't catch it
const slugify = (text) => text.toLowerCase().replaceAll(" ", "-");
expect(slugify("My Page")).toBe("my-page");
```

**Good:**
```javascript
// Tests the actual production function
import { slugify } from "#utils/slug-utils.js";
expect(slugify("My Page")).toBe("my-page");
```

---

### 2. Not Tautological

- [ ] The test does not simply assert the value it just set
- [ ] There is actual production code execution between setup and assertion
- [ ] The assertion verifies behavior, not just that JavaScript assignment works

**Bad:**
```javascript
// This tests nothing - you set it, then check you set it
const item = { data: { title: "News post" } };
expect(item.data.title).toBe("News post");
```

**Good:**
```javascript
import { sortByDateDescending } from "#utils/sorting.js";

// Pass the production comparator to an array sort.
const older = { date: new Date("2025-01-01") };
const newer = { date: new Date("2025-02-01") };
const sorted = [older, newer].toSorted(sortByDateDescending);
expect(sorted[0]).toBe(newer);
```

---

### 3. Tests Behavior, Not Implementation Details

Source-analysis quality gates are an intentional exception: their behavior is
to detect prohibited source patterns or broken documentation links. Exercise
the checker against representative valid and invalid inputs where possible;
ordinary feature tests must still exercise production behavior.

- [ ] The test verifies observable outcomes, not internal state
- [ ] Refactoring production code shouldn't break the test (unless behavior changes)
- [ ] The test answers "does it work?" not "is it structured this way?"

**Bad:**
```javascript
// Tests source text - breaks on any rename or reformat
const source = readFileSync("src/_lib/collections/news.js", "utf-8");
expect(source).toContain("sortByDateDescending");
```

**Good:**
```javascript
// Tests behavior - the registered collection returns sorted items
const collection = configureAndGetCollection(configureNews, "news", items);
expect(collection.map((item) => item.data.title)).toEqual(["newer", "older"]);
```

---

### 4. Has Clear Failure Semantics

- [ ] When this test fails, it's obvious what's broken
- [ ] The test name describes the specific behavior being verified
- [ ] Error messages are descriptive

**Bad:**
```javascript
test("navigation works", () => {
  // 50 lines of setup and a dozen assertions
  expect(result).toBeTruthy();
});
```

**Good:**
```javascript
test("hides pages with no_index from the navigation", () => {
  const nav = buildNavigation([visiblePage, hiddenPage]);
  expect(nav.map((entry) => entry.key)).toEqual(["visible"]);
});
```

---

### 5. Isolated and Repeatable

- [ ] Test cleans up after itself (temp files, global state, mocks)
- [ ] Test doesn't depend on other tests running first
- [ ] Test produces same result every time (no time-dependent flakiness)

**Bad:**
```javascript
// Mutates global state without cleanup
process.env.CHROME_PATH = "/fake/chromium";
// ... test runs ...
// Forgot to restore - the next test inherits the fake path
```

**Good:**
```javascript
// Bracket helpers guarantee cleanup even when the test throws
import { withTempDir } from "#test/test-utils.js";

withTempDir("my-feature", (dir) => {
  writeFileSync(join(dir, "input.md"), "# Hello");
  expect(processDir(dir)).toHaveLength(1);
});
```

---

### 6. Tests One Thing

- [ ] Test has a single reason to fail
- [ ] Test name accurately describes what's being tested
- [ ] If you need "and" in the description, consider splitting

**Bad:**
```javascript
test("block validation", () => {
  // Checks unknown types, missing fields, bad values, and container
  // widths in one body - if this fails, which rule broke?
});
```

**Good:**
```javascript
// Separate tests, each with one reason to fail
test("rejects a block with an unknown type", () => { /* ... */ });
test("rejects a block missing a required field", () => { /* ... */ });
test("defaults container width to wide", () => { /* ... */ });
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

- [ ] Uses factory functions from `test-utils.js` where available (`item()`, `createMockEleventyConfig()`, …)
- [ ] Creates minimal fixtures (only data needed for this test)
- [ ] Doesn't share mutable state between tests

### 9. Async Tests Are Actually Async

- [ ] `async` test bodies exist only when there are real async operations
- [ ] Awaits are meaningful, not just `await Promise.resolve()`
- [ ] Rejection assertions are awaited: `await expect(fn()).rejects.toThrow(...)`
- [ ] Timeouts in tests have clear justification (e.g. spawning real subprocesses)

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | What To Do Instead |
|--------------|--------------|-------------------|
| Reimplementing production logic | Tests the test, not the code | Import and call production code |
| Tautological assertions | Provides false confidence | Assert on behavior after action |
| Asserting on source text | Breaks on rename/reformat, not on bugs | Call the code and assert its output |
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
