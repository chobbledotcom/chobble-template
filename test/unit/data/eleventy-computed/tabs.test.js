import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed.tabs", () => {
  test("returns the tab list intact when every tab already has a body", () => {
    const tabs = [{ title: "Tab1", body: "Content1" }];
    expect(eleventyComputed.tabs({ tabs })).toEqual([
      { title: "Tab1", body: "Content1" },
    ]);
  });

  test("returns an empty array when tabs is not set", () => {
    expect(eleventyComputed.tabs({})).toEqual([]);
  });

  test("returns an empty array when tabs is not an array", () => {
    expect(eleventyComputed.tabs({ tabs: "nope" })).toEqual([]);
  });

  test.each([
    ["undefined", { title: "Tab1" }],
    ["null", { title: "Tab1", body: null }],
    ["empty string", { title: "Tab1", body: "" }],
  ])("normalises body to '' when it is %s", (_label, inputTab) => {
    const [result] = eleventyComputed.tabs({ tabs: [inputTab] });
    expect(result.body).toBe("");
    expect(result.title).toBe("Tab1");
  });

  test("preserves non-body tab properties when defaulting body", () => {
    const tabs = [{ title: "Tab1", image: "image.jpg" }];
    expect(eleventyComputed.tabs({ tabs })).toEqual([
      { title: "Tab1", image: "image.jpg", body: "" },
    ]);
  });
});
