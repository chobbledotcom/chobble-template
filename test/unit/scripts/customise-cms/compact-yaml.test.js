import { describe, expect, test } from "bun:test";
import YAML from "yaml";
import { compactYaml } from "#scripts/customise-cms/compact-yaml.js";

/** Round-trip through both a YAML parser and the compactor to ensure the
 *  compacted output still parses to the same document. */
const compactAndParse = (yamlString) => YAML.parse(compactYaml(yamlString));

describe("compactYaml", () => {
  test("compacts small objects to inline form", () => {
    const input = ["- name: foo", "  type: string", "  label: Foo", ""].join(
      "\n",
    );
    expect(compactYaml(input)).toContain(
      "{ name: foo, type: string, label: Foo }",
    );
  });

  test("does not compact values containing commas (would break flow YAML)", () => {
    // A value like `Size (sm, lg)` contains a comma, which terminates a flow
    // mapping entry. Emitting it inline produces invalid YAML.
    const input = [
      "- name: size",
      "  type: string",
      "  label: Size (sm, lg)",
      "",
    ].join("\n");
    // Must still parse as valid YAML
    const parsed = compactAndParse(input);
    expect(parsed).toEqual([
      { name: "size", type: "string", label: "Size (sm, lg)" },
    ]);
  });

  test("does not compact values containing braces", () => {
    const input = ["- name: x", "  label: a {b} c", ""].join("\n");
    const parsed = compactAndParse(input);
    expect(parsed).toEqual([{ name: "x", label: "a {b} c" }]);
  });

  test("does not compact values containing brackets", () => {
    const input = ["- name: x", "  label: a [b] c", ""].join("\n");
    const parsed = compactAndParse(input);
    expect(parsed).toEqual([{ name: "x", label: "a [b] c" }]);
  });

  test("leaves single-line list items alone (nothing to compact)", () => {
    // When a `- key: value` item is immediately followed by another
    // dedented item (no child lines, no trailing blank), the collected
    // object has only one line — tryCompactLine must bail rather than
    // pointlessly rewrapping in `{ ... }`.
    const input = "- name: solo\n- name: next";
    expect(compactYaml(input)).toBe(input);
  });

  test("leaves objects in block form when the inlined line would exceed 80 chars", () => {
    // The compactor refuses to inline if the resulting `- { ... }` line would
    // exceed the 80-char width budget. With a long enough label the inline
    // form blows past 80 chars, so the original block form is preserved.
    const longLabel = "x".repeat(100);
    const input = [
      "- name: foo",
      "  type: string",
      `  label: ${longLabel}`,
    ].join("\n");
    expect(compactYaml(input)).toBe(input);
  });

  test("does not compact objects with nested structures", () => {
    // A line ending with `:` and no value marks a nested block that the
    // inline `{ ... }` form can't represent — compaction must bail out and
    // leave the object in its original block form.
    const input = [
      "- name: item",
      "  type: string",
      "  options:",
      "    multiple: true",
      "",
    ].join("\n");
    // Output must still parse to the same structure
    expect(compactAndParse(input)).toEqual([
      { name: "item", type: "string", options: { multiple: true } },
    ]);
    // And must not be inlined (no `{ ... }` wrapper for the outer item)
    expect(compactYaml(input)).not.toContain("{ name: item");
  });
});
