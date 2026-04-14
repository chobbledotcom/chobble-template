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
});
