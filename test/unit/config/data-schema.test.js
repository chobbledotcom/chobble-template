import { describe, expect, test } from "vitest";
import { schemaErrors, unknownKeyErrors } from "#config/data-schema.js";

const errorsFor = schemaErrors("test.json", {
  title: { type: "string", required: true, description: "Title" },
  count: { type: "number", description: "Count" },
  mode: { type: "string", choices: ["a", "b"], description: "Mode" },
  tags: {
    type: "string",
    list: true,
    choices: ["x", "y"],
    description: "Tags",
  },
  logo: { type: "image", description: "Logo" },
});

describe("schemaErrors", () => {
  test("accepts data that fits, with optional keys unset or null", () => {
    expect(errorsFor({ title: "Hi" })).toEqual([]);
    expect(
      errorsFor({
        title: "Hi",
        count: null,
        mode: "b",
        tags: ["y", "x"],
        logo: "/images/logo.svg",
      }),
    ).toEqual([]);
  });

  test.each([
    ["omitted", {}],
    ["null", { title: null }],
    ["blank", { title: "  " }],
  ])("reports a required field that is %s, once", (_label, data) => {
    expect(errorsFor(data)).toEqual(["test.json is missing the 'title' field"]);
  });

  test("names unknown keys before the field errors", () => {
    expect(errorsFor({ titel: "Hi" })).toEqual([
      "test.json has unknown keys: titel. Accepted keys: title, count, mode, tags, logo",
      "test.json is missing the 'title' field",
    ]);
  });

  test("reports a wrong type without also reporting its choices", () => {
    expect(errorsFor({ title: "Hi", mode: 3, tags: "x", logo: 7 })).toEqual([
      "test.json 'mode' must be a string, got: 3",
      "test.json 'tags' must be a list of strings, got: \"x\"",
      "test.json 'logo' must be a string, got: 7",
    ]);
  });

  test("reports values outside the choices, naming the whole list", () => {
    expect(errorsFor({ title: "Hi", mode: "c", tags: ["x", "z"] })).toEqual([
      "test.json 'mode' must be one of a, b, got: c",
      "test.json 'tags' must be one of x, y, got: x, z",
    ]);
  });
});

describe("unknownKeyErrors", () => {
  test("names the file, the unknown keys, and the accepted keys", () => {
    expect(
      unknownKeyErrors("strings.json", { a: 1, x: 2, y: 3 }, { a: 0, b: 0 }),
    ).toEqual(["strings.json has unknown keys: x, y. Accepted keys: a, b"]);
  });

  test("returns nothing when every key is accepted", () => {
    expect(unknownKeyErrors("strings.json", { a: 1 }, { a: 0, b: 0 })).toEqual(
      [],
    );
  });
});
