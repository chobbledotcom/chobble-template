import { parseSync } from "oxc-parser";
import { describe, expect, test } from "vitest";
import {
  assertNoViolations,
  combineFileLists,
  withAllowlist,
} from "#test/code-scanner.js";
import { SCRIPT_JS_FILES, SRC_JS_FILES, TEST_FILES } from "#test/test-utils.js";

const findTodoFixme = (source) => {
  const { comments, errors } = parseSync("source.js", source);
  if (errors.length) {
    throw new Error(
      `Cannot parse source for comment scan: ${errors[0].message}`,
    );
  }

  const lines = source.split(/\r\n|[\n\r\u2028\u2029]/);
  return comments.flatMap(({ start, end }) =>
    [...source.slice(start, end).matchAll(/\b(TODO|FIXME)\b/gi)].map(
      (match) => {
        const lineNumber = source
          .slice(0, start + match.index)
          .split(/\r\n|[\n\r\u2028\u2029]/).length;
        return {
          lineNumber,
          line: lines[lineNumber - 1].trim(),
          match: match[0],
        };
      },
    ),
  );
};

const analyzeTodoFixme = withAllowlist({
  find: findTodoFixme,
  files: () =>
    combineFileLists([SRC_JS_FILES(), SCRIPT_JS_FILES(), TEST_FILES()]),
});

describe("todo-fixme-comments", () => {
  test.each([
    ["line", "// TODO: fix this later", "TODO"],
    ["inline", "const a = 1; // FIXME: repair this", "FIXME"],
    ["block", "/* FIXME: this is broken */", "FIXME"],
    ["inline block", "const a = /* TODO: choose a value */ 1;", "TODO"],
    ["lowercase", "// todo: fix this later", "todo"],
    ["mixed case", "/* FiXmE: repair this */", "FiXmE"],
    ["template expression", "const a = `${1 /* TODO: replace */}`;", "TODO"],
  ])("identifies markers in %s comments", (_name, source, marker) => {
    expect(findTodoFixme(source)).toEqual([
      { lineNumber: 1, line: source, match: marker },
    ]);
  });

  test("reports marker lines within multiline block comments", () => {
    const source = `
const a = 1;
/* Notes:
 * TODO: fix this later
 * FIXME: this is broken
 */
    `;
    expect(findTodoFixme(source)).toEqual([
      { lineNumber: 4, line: "* TODO: fix this later", match: "TODO" },
      { lineNumber: 5, line: "* FIXME: this is broken", match: "FIXME" },
    ]);
  });

  test.each([
    "\n",
    "\r\n",
    "\r",
    "\u2028",
    "\u2029",
  ])("preserves line numbers with %j line endings", (newline) => {
    expect(findTodoFixme(`const a = 1;${newline}// TODO: replace`)).toEqual([
      { lineNumber: 2, line: "// TODO: replace", match: "TODO" },
    ]);
  });

  test.each([
    [
      "filename",
      'const file = "test/unit/code-quality/todo-fixme-comments.test.js";',
    ],
    ["single-quoted string", "const text = '// TODO: not a comment';"],
    ["double-quoted string", 'const text = "/* FIXME: not a comment */";'],
    ["escaped quote", String.raw`const text = "\" // TODO: still a string";`],
    [
      "template literal",
      "const text = `\n// TODO: fixture\n/* FIXME: fixture */\n`;",
    ],
    ["template expression string", 'const text = `${"// TODO: fixture"}`;'],
    [
      "regex literal",
      String.raw`const pattern = /TODO|FIXME|\/\/ TODO|\/\* FIXME \*\//;`,
    ],
    ["identifiers", "const TODO = 1; const FIXME = TODO; const todoList = [];"],
    ["non-marker words", "// todoList and FIXME_suffix are identifiers"],
    ["empty source", ""],
  ])("ignores markers in %s", (_name, source) => {
    expect(findTodoFixme(source)).toEqual([]);
  });

  test("ignores a filename while reporting every real comment marker on the same line", () => {
    const source =
      'const file = "todo-fixme.js"; /* TODO: repair */ // FIXME: verify';
    expect(findTodoFixme(source)).toEqual([
      { lineNumber: 1, line: source, match: "TODO" },
      { lineNumber: 1, line: source, match: "FIXME" },
    ]);
  });

  test("rejects invalid source rather than silently passing the scan", () => {
    expect(() => findTodoFixme("const = ; // TODO: repair")).toThrow(
      "Cannot parse source for comment scan:",
    );
  });

  test("No TODO/FIXME comments in the codebase", () => {
    const { violations } = analyzeTodoFixme();
    assertNoViolations(violations, {
      singular: "TODO/FIXME comment",
      fixHint: "resolve the TODO/FIXME before committing",
    });
  });
});
