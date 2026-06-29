import { describe, expect, test } from "bun:test";
import { applyMutant, generateMutants } from "#scripts/mutation/generate.js";
import { binaryOperators } from "#scripts/mutation/operators.js";

/** Collect the `from → to` operator swaps a source produces. */
const swaps = (source, { exhaustive = false } = {}) =>
  generateMutants(source, "sample.js", exhaustive).map(
    (m) => `${m.operator}→${m.newOperator}`,
  );

describe("generateMutants", () => {
  test("mutates a binary operator using the non-exhaustive table", () => {
    // The table is the production source of truth — assert against it, not a
    // hardcoded "<=" so the test tracks the table if it changes.
    const [replacement] = binaryOperators["<"];
    expect(swaps("const r = a < b;")).toEqual([`<→${replacement}`]);
  });

  test("exhaustive mode emits every replacement for an operator", () => {
    expect(swaps("const r = a < b;", { exhaustive: true })).toEqual([
      "<→<=",
      "<→>",
      "<→>=",
    ]);
  });

  test("routes && / || / ?? through the logical table", () => {
    expect(swaps("const r = a && b;")).toEqual(["&&→||"]);
    expect(swaps("const r = a ?? b;")).toEqual(["??→||"]);
  });

  test("mutates assignment operators", () => {
    expect(swaps("let x = 0; x += 1;")).toContain("+=→/=");
  });

  test("drops a unary guard (!x → x) and flips +/-", () => {
    expect(swaps("const r = !a;")).toEqual(["!→∅"]);
    expect(swaps("const r = -a;")).toEqual(["-→+"]);
  });

  test("flips update operators", () => {
    expect(swaps("let i = 0; i++;")).toEqual(["++→--"]);
  });

  test("flips boolean literals but leaves numeric literals alone", () => {
    expect(swaps("const r = true;")).toEqual(["true→false"]);
    expect(swaps("const r = 0;")).toEqual([]);
  });

  test("removes side-effecting expression statements", () => {
    const mutants = generateMutants("doThing(x);", "sample.js", false);
    expect(mutants).toHaveLength(1);
    expect(mutants[0].newOperator).toBe("(removed)");
    expect(mutants[0].replacement).toBe(";");
  });

  test("keeps the full statement text as the mutant operator (no truncation)", () => {
    // The full text is the mutant's identity/key, so it must not be truncated —
    // a long statement is preserved verbatim (whitespace-normalised).
    const longCall = "doSomethingWithAnExceedinglyLongFunctionName(argument);";
    const [mutant] = generateMutants(longCall, "sample.js", false);
    expect(longCall.length).toBeGreaterThan(40);
    expect(mutant.operator).toBe(longCall);
    expect(mutant.newOperator).toBe("(removed)");
  });

  test("skips operators that live inside a TypeScript type", () => {
    // The `|` here is a union type, erased at runtime — mutating it is a no-op,
    // so the walk must not emit a mutant for it.
    expect(swaps("const x: A | B = a;")).toEqual([]);
  });

  test("skips a boolean literal inside a top-level TS type alias", () => {
    // `true` here is a literal *type*, erased at runtime. The walk reaches it
    // through a TYPE_FIELD at the top level (inType starts false), so the
    // type-context flag must be set on entering the field, not only when
    // already inside a type — otherwise a true→false mutant leaks out.
    expect(generateMutants("type Flag = true;", "sample.ts", false)).toEqual(
      [],
    );
  });

  test("reports 1-based line and column for each mutant", () => {
    const [mutant] = generateMutants("\nconst r = a < b;", "sample.js", false);
    // Column points at the start of the operator span (just after the left
    // operand `a`), 1-based, on the second line.
    expect(mutant.line).toBe(2);
    expect(mutant.column).toBe(12);
  });
});

describe("applyMutant", () => {
  test("splices the replacement into the original source span", () => {
    const source = "const r = a < b;";
    const [mutant] = generateMutants(source, "sample.js", false);
    // The default table swaps "<" for ">=" — the result must parse to that.
    expect(applyMutant(source, mutant)).toBe(
      `const r = a ${mutant.newOperator} b;`,
    );
  });

  test("uses an explicit replacement when present (e.g. removed statement)", () => {
    const source = "doThing(x);";
    const [mutant] = generateMutants(source, "sample.js", false);
    expect(applyMutant(source, mutant).trim()).toBe(";");
  });

  test("honours an empty-string replacement (the `!x → x` guard drop)", () => {
    // The `!`-drop mutant carries replacement "" — applyMutant must splice
    // nothing, not fall back to the displayed "∅" sentinel.
    const source = "const r = !a;";
    const [mutant] = generateMutants(source, "sample.js", false);
    expect(mutant.replacement).toBe("");
    expect(applyMutant(source, mutant)).not.toContain("∅");
  });
});
