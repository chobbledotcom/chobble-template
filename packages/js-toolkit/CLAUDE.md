# @chobble/js-toolkit

Functional JS utilities, test infrastructure, and code quality tools.

## Quick Reference

### Functional Programming (`@chobble/js-toolkit/fp`)

```javascript
import { pipe, filter, map, accumulate, memoize } from "@chobble/js-toolkit/fp";

// Compose operations left-to-right
const processItems = pipe(
  filter(item => item.active),
  map(item => item.name),
  unique
);

// Safe array building in reduce (avoids noAccumulatingSpread lint error)
const ids = accumulate((acc, item) => {
  if (item.id) acc.push(item.id);
  return acc;
})(items);

// Memoize expensive computations
const expensiveFn = memoize((input) => compute(input));
```

**Key Functions:**

| Function | Purpose | Example |
|----------|---------|---------|
| `pipe(...fns)` | Compose functions left-to-right | `pipe(filter(x), map(y))(arr)` |
| `filter(pred)` | Curried array filter | `filter(x => x > 0)(arr)` |
| `map(fn)` | Curried array map | `map(x => x * 2)(arr)` |
| `flatMap(fn)` | Curried array flatMap | `flatMap(x => [x, x])(arr)` |
| `reduce(fn, init)` | Curried array reduce | `reduce((a, x) => a + x, 0)(arr)` |
| `sort(cmp)` | Non-mutating sort | `sort((a, b) => a - b)(arr)` |
| `sortBy(key)` | Sort by property/getter | `sortBy('name')(users)` |
| `accumulate(fn)` | Safe array building | See above |
| `unique(arr)` | Remove duplicates | `unique([1, 1, 2])` |
| `uniqueBy(fn)` | Dedupe by key | `uniqueBy(x => x.id)(arr)` |
| `compact(arr)` | Remove falsy values | `compact([1, null, 2])` |
| `pick(keys)` | Extract object keys | `pick(['a', 'b'])(obj)` |
| `filterMap(pred, fn)` | Filter + map in one pass | `filterMap(x => x > 0, x => x * 2)(arr)` |
| `memberOf(vals)` | Membership predicate | `filter(memberOf(['a', 'b']))(arr)` |
| `notMemberOf(vals)` | Exclusion predicate | `filter(notMemberOf(['x']))(arr)` |
| `exclude(vals)` | Filter out values | `exclude(['a'])(arr)` |
| `pluralize(s, p?)` | Format count | `pluralize('item')(3)` → "3 items" |
| `memoize(fn, opts?)` | Cache results | `memoize(fn, { cacheKey })` |
| `indexBy(getKey)` | Build cached lookup | `indexBy(x => x.id)(arr)` |
| `groupByWithCache(fn)` | Build cached grouping | `groupByWithCache(x => x.tags)(arr)` |

### Test Utilities (`@chobble/js-toolkit/test-utils`)

```javascript
import {
  withTempDir,
  withMockFetch,
  expectProp,
  captureConsole
} from "@chobble/js-toolkit/test-utils";

// Bracket pattern for resource management
await withTempDir("my-test", async (tempDir) => {
  // tempDir is automatically cleaned up
});

// Mock fetch
await withMockFetch({ data: "test" }, {}, async () => {
  const result = await fetch("/api");
  // ...
});

// Capture console output
const logs = captureConsole(() => {
  console.log("hello");
});

// Curried assertions
expectProp("name")(result, ["Alice", "Bob"]);
```

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `bracket(setup, teardown)` | Resource management pattern |
| `withTempDir(name, callback)` | Create/cleanup temp directory |
| `withTempFile(name, file, content, cb)` | Create temp file |
| `withMockedCwd(dir, callback)` | Mock process.cwd() |
| `mockFetch(response, options)` | Mock globalThis.fetch |
| `withMockFetch(resp, opts, cb)` | Bracket-based fetch mock |
| `captureConsole(fn)` | Capture console.log output |
| `expectProp(key)` | Assert array property values |
| `expectDataArray(key)` | Assert nested data values |
| `expectAsyncThrows(fn)` | Expect async function throws |
| `extractFunctions(source)` | Parse JS function definitions |

### Code Quality (`@chobble/js-toolkit/code-quality`)

```javascript
import {
  createCodeChecker,
  runSteps,
  COMMON_STEPS
} from "@chobble/js-toolkit/code-quality";

// Create a code checker for custom patterns
const { find, analyze } = createCodeChecker({
  patterns: [/console\.log/],
  files: () => getFiles(/\.js$/),
  allowlist: new Set(["src/debug.js:10"]),
  rootDir: process.cwd(),
});

// Run test steps
runSteps({
  steps: [COMMON_STEPS.lint, COMMON_STEPS.test],
  verbose: false,
  title: "CI",
  rootDir: process.cwd(),
});
```

## Lint Rules Enforced

The biome config enforces these patterns:

| Rule | What to Do Instead |
|------|-------------------|
| `noForEach` | Use `for...of` or curried `filter`/`map` |
| `noAccumulatingSpread` | Use `accumulate()` helper |
| `noVar` | Use `const` (or `let` if needed) |
| `noDoubleEquals` | Use `===` |
| `noConsole` | Only in build scripts and tests |
| `maxComplexity: 7` | Break into smaller functions |

## Configuration Files

Copy and extend these for your project:

```javascript
// biome.json
{
  "extends": ["./node_modules/@chobble/js-toolkit/configs/biome.base.json"],
  "files": { "includes": ["src/**/*.js", "test/**/*.js"] }
}
```

## Import Patterns

```javascript
// Full module
import { pipe, filter, map } from "@chobble/js-toolkit/fp";

// Specific submodule
import { memoize } from "@chobble/js-toolkit/fp/memoize";
import { withTempDir } from "@chobble/js-toolkit/test-utils/resource";
import { createCodeChecker } from "@chobble/js-toolkit/code-quality/scanner";
```
