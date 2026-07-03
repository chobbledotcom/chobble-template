/**
 * Detects nested array lookups that indicate O(n*m) performance patterns.
 *
 * When .find() or .filter() is called inside the callback of another array
 * iteration method (.map, .flatMap, .reduce, etc.), the inner traversal runs
 * for every iteration of the outer loop — O(n*m) total work. Use indexBy()
 * or groupByWithCache() to build an O(1) lookup map first, reducing total
 * work to O(n+m).
 *
 * BAD:
 *   products.map((p) => {
 *     const category = categories.find((c) => c.id === p.categoryId);
 *     return { ...p, category };
 *   });
 *
 *   // Also BAD — expression arrow, no braces:
 *   products.flatMap((p) =>
 *     categories.filter((c) => c.id === p.categoryId)
 *   );
 *
 * GOOD:
 *   const categoryById = indexBy((c) => c.id)(categories);
 *   products.map((p) => ({ ...p, category: categoryById[p.categoryId] }));
 */
import { describe, expect, test } from "bun:test";
import {
  assertNoViolations,
  isCommentLine,
  readSource,
  removeStrings,
} from "#test/code-scanner.js";
import { SRC_JS_FILES } from "#test/test-utils.js";
import { frozenSet } from "#toolkit/fp/set.js";

// Match .find( or .filter( — the array lookup methods that suggest linear scans
const LOOKUP_PATTERN = /\.(?:find|filter)\s*\(/;
// Global variant for matchAll (which requires the g flag)
const LOOKUP_PATTERN_GLOBAL = /\.(?:find|filter)\s*\(/g;

// Patterns that establish an iteration context on the current line.
const ITERATION_CONTEXT_PATTERNS = [
  /\.map\s*\(/, // .map() callback (method call)
  /\.flatMap\s*\(/, // .flatMap() callback
  /\.some\s*\(/, // .some() callback
  /\.every\s*\(/, // .every() callback
  /\.reduce\s*\(/, // .reduce() callback
];

// Curried toolkit function patterns: map(, flatMap(, reduce( without a dot
const CURRIED_ITERATION_PATTERNS = [/(?:^|[^\w.])(?:map|flatMap|reduce)\s*\(/];

// Detect expression arrow (=> without a following {) on iteration lines
const EXPR_ARROW_PATTERN = /=>\s*(?!\s*\{)/;

/**
 * Walk a cleaned line tracking paren depth and report whether any .find()/
 * .filter() match occurs at a paren depth strictly greater than the depth
 * at the start of the line. A nested lookup appears inside an iteration
 * callback's parens; a trailing chained call appears after those parens
 * close back to (or below) the opening depth.
 *
 * Computes depth at each match position by counting parens in the prefix
 * before it. Uses string indices directly (matched by `match.index`) so it
 * is correct even on lines containing surrogate-pair characters.
 *
 * @param {string} cleaned - Source line with strings removed
 * @returns {boolean} true if a lookup is genuinely nested in parens
 */
const hasNestedLookupInParens = (cleaned) => {
  const positions = [...cleaned.matchAll(LOOKUP_PATTERN_GLOBAL)].map(
    (m) => m.index,
  );
  return positions.some((pos) => {
    const prefix = cleaned.slice(0, pos);
    const opens = (prefix.match(/\(/g) || []).length;
    const closes = (prefix.match(/\)/g) || []).length;
    return opens - closes > 0;
  });
};

/**
 * Pre-existing violations surfaced by the expression-arrow detection fix.
 * These are genuine O(n*m) patterns or sub-collection filters in code that
 * predates the scanner improvement. Each should be fixed and removed.
 */
const KNOWN_VIOLATIONS = frozenSet([
  "src/_lib/eleventy/pdf.js:61",
  "src/_lib/utils/block-columns.js:181",
  "src/_lib/utils/block-schema.js:358",
]);

/**
 * Scan source code for .find()/.filter() calls nested inside iteration
 * method callbacks.
 *
 * Tracks two kinds of iteration scope:
 * 1. Brace-bodied callbacks: .map((x) => { ... }) — pushed onto iterStack
 *    when { opens on an iteration-context line, popped when } closes.
 * 2. Expression-arrow callbacks: .map((x) => expression) — no { brace, so
 *    we track the parenthesis depth of the enclosing call. The callback
 *    scope ends when parens close back to or past the opening depth.
 *
 * Distinguishes nested lookups (inside the callback) from chained calls
 * (after the callback closes) by checking paren depth: if .filter() appears
 * after the closing ) of the .map() call, it's a chain, not a nest.
 *
 * @param {string} source - Source code to scan
 * @returns {Array<{lineNumber: number, line: string, method: string}>}
 */
const findNestedLookups = (source) =>
  source.split("\n").reduce(
    (state, line, i) => {
      const trimmed = line.trim();
      if (isCommentLine(trimmed)) return state;

      const cleaned = removeStrings(line);
      const opens = cleaned.split("{").length - 1;
      const closes = cleaned.split("}").length - 1;
      const parenChange =
        (cleaned.match(/\(/g) || []).length -
        (cleaned.match(/\)/g) || []).length;
      const isIter =
        ITERATION_CONTEXT_PATTERNS.some((p) => p.test(cleaned)) ||
        CURRIED_ITERATION_PATTERNS.some((p) => p.test(cleaned));
      const startsExprArrow =
        isIter && /=>/.test(cleaned) && EXPR_ARROW_PATTERN.test(cleaned);

      const wasInExprArrow = state.exprArrowStartDepth !== null;
      const sameLineNested =
        startsExprArrow && hasNestedLookupInParens(cleaned);
      const isInsideIteration =
        state.iterStack.some((v) => v) || wasInExprArrow || sameLineNested;

      // Check for violation BEFORE updating depth
      if (isInsideIteration && LOOKUP_PATTERN.test(cleaned)) {
        const methodMatch = cleaned.match(/\.(find|filter)\s*\(/);
        if (methodMatch) {
          state.results.push({
            lineNumber: i + 1,
            line: trimmed,
            method: methodMatch[1],
          });
        }
      }

      // Update brace depth: push for opens, pop for closes
      const iterStack = [...state.iterStack];
      for (const _ of Array(opens)) iterStack.push(isIter);
      for (const _ of Array(closes)) iterStack.pop();

      // Track expression-arrow scope via paren depth
      const newParenDepth = state.parenDepth + parenChange;
      const exprArrowStartDepth = startsExprArrow
        ? newParenDepth > state.parenDepth
          ? newParenDepth
          : null
        : wasInExprArrow && newParenDepth < state.exprArrowStartDepth
          ? null
          : state.exprArrowStartDepth;

      return {
        iterStack,
        results: state.results,
        exprArrowStartDepth,
        parenDepth: newParenDepth,
      };
    },
    {
      iterStack: [],
      results: [],
      exprArrowStartDepth: null,
      parenDepth: 0,
    },
  ).results;

/** Build violation entry from a match */
const toViolation = (file) => (v) => ({
  file,
  line: v.lineNumber,
  code: v.line,
  reason: `nested .${v.method}() inside iteration — likely O(n*m)`,
});

const expectSingleLookup = (source, method) => {
  const results = findNestedLookups(source);
  expect(results.length).toBe(1);
  expect(results[0].method).toBe(method);
};

const expectSingleFilterViolation = (source) =>
  expectSingleLookup(source, "filter");

const expectNoViolations = (source) => {
  const results = findNestedLookups(source);
  expect(results.length).toBe(0);
};

describe("nested-array-lookup", () => {
  describe("findNestedLookups", () => {
    test("detects .find() inside .map() callback", () => {
      expectSingleLookup(
        `items.map((item) => {
  const match = others.find((o) => o.id === item.id);
  return { item, match };
});`,
        "find",
      );
    });

    test("detects .filter() inside flatMap() callback", () => {
      expectSingleFilterViolation(`categories.flatMap((cat) => {
  return items.filter((item) => item.cat === cat.id);
});`);
    });

    test("detects .filter() inside expression-arrow flatMap callback", () => {
      expectSingleFilterViolation(`categories.flatMap((cat) =>
  items.filter((item) => item.cat === cat.id),
);`);
    });

    test("detects .find() inside expression-arrow map callback", () => {
      expectSingleLookup(
        `items.map((item) =>
  others.find((o) => o.id === item.id),
);`,
        "find",
      );
    });

    test("allows .find() inside for...of loop (small iteration)", () => {
      const source = `for (const item of items) {
  const match = others.find((o) => o.id === item.id);
}`;
      expectNoViolations(source);
    });

    test("allows .find() inside non-iteration function body", () => {
      const source = `const getItem = (items, id) => {
  return items.find((i) => i.id === id);
};`;
      expectNoViolations(source);
    });

    test("allows .filter() inside non-iteration function body", () => {
      const source = `const getActive = (items) => {
  return items.filter((i) => i.active);
};`;
      expectNoViolations(source);
    });

    test("allows .find() at module level", () => {
      expectNoViolations("const item = items.find((i) => i.active);");
    });

    test("detects .find() in deeply nested iteration", () => {
      const source = `const outer = () => {
  return items.map((item) => {
    return others.find((o) => o.id === item.id);
  });
};`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(1);
    });

    test("ignores .find() in comments", () => {
      const source = `items.map((item) => {
  // others.find((o) => o.id === item.id);
  return 42;
});`;
      expectNoViolations(source);
    });

    test("detects multiple violations", () => {
      const source = `items.map((x) => {
  const found = others.find((y) => y.id === x.id);
  const filtered = others.filter((y) => y.tag === x.tag);
  return { found, filtered };
});`;
      const results = findNestedLookups(source);
      expect(results.length).toBe(2);
    });

    test("handles braces in strings correctly", () => {
      const source = `items.map((item) => {
  const str = "others.find({})";
  return str;
});`;
      expectNoViolations(source);
    });

    test("allows .filter() not inside iteration context", () => {
      const source = `const fn = (data) => {
  const imageFiles = fs.readdirSync(dir)
    .filter((file) => IMAGE_PATTERN.test(file));
  return imageFiles;
};`;
      expectNoViolations(source);
    });

    test("detects .filter() inside .reduce() callback", () => {
      expectSingleFilterViolation(`items.reduce((acc, item) => {
  const related = others.filter((o) => o.tag === item.tag);
  return [...acc, ...related];
}, []);`);
    });

    test("detects .filter() inside curried map(fn)(arr) callback", () => {
      expectSingleFilterViolation(`map((item) => {
  const related = others.filter((o) => o.id === item.id);
  return related;
})(items);`);
    });

    test("detects .find() inside curried flatMap(fn)(arr) callback", () => {
      expectSingleLookup(
        `flatMap((item) => {
  const match = others.find((o) => o.id === item.id);
  return [match];
})(items);`,
        "find",
      );
    });

    test("detects .filter() inside curried reduce(fn, init)(arr) callback", () => {
      expectSingleFilterViolation(`reduce((acc, item) => {
  const related = others.filter((o) => o.tag === item.tag);
  return acc.concat(related);
}, [])(items);`);
    });

    test("does not treat variable names ending in 'map' as iteration context", () => {
      const source = `const lookup = itemsToMap((item) => {
  const match = others.find((o) => o.id === item.key);
  return match;
});`;
      expectNoViolations(source);
    });

    test("does not treat new Map() as iteration context", () => {
      const source = `const m = new Map((entries) => {
  const match = others.find((o) => o.id === entries[0]);
  return match;
});`;
      expectNoViolations(source);
    });

    test("allows .filter() chained after expression-arrow map on same line", () => {
      const source =
        "const result = items.map((x) => x.id).filter((id) => id > 0);";
      expectNoViolations(source);
    });

    test("allows .filter() chained on line after expression-arrow map closes", () => {
      const source = `const result = items
  .map((x) => x.id)
  .filter((id) => id > 0);`;
      expectNoViolations(source);
    });

    test("allows .filter() chained after expression-arrow flatMap", () => {
      const source = `const result = items
  .flatMap((x) => x.tags)
  .filter((tag) => tag !== "");`;
      expectNoViolations(source);
    });

    test("detects .filter() inside expression-arrow map that spans lines", () => {
      expectSingleFilterViolation(`items.map((item) =>
  others.filter((o) => o.id === item.id),
);`);
    });

    test("detects .filter() on same line as expression-arrow map", () => {
      expectSingleFilterViolation(
        "items.map((item) => others.filter((o) => o.id === item.id));",
      );
    });

    test("detects .find() on same line as expression-arrow flatMap", () => {
      expectSingleLookup(
        "items.flatMap((item) => others.find((o) => o.id === item.id));",
        "find",
      );
    });
  });

  test("No nested array lookups in source files", () => {
    const violations = SRC_JS_FILES()
      .flatMap((file) =>
        findNestedLookups(readSource(file)).map(toViolation(file)),
      )
      .filter((v) => !KNOWN_VIOLATIONS.has(`${v.file}:${v.line}`));

    assertNoViolations(violations, {
      singular: "nested array lookup",
      fixHint:
        "Use indexBy() or groupByWithCache() for O(1) lookups instead of nested .find()/.filter()",
    });
  });
});
