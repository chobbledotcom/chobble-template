import { describe, expect, mock, test } from "bun:test";
import { item } from "#test/test-utils.js";
import { findFirst, findFromChildren } from "#utils/thumbnail-finder.js";

/** Shorthand for creating an orderable item with an optional thumbnail. */
const orderedItem = (order, thumbnail) => item(null, { order, thumbnail });

describe("findFirst", () => {
  test("returns first non-null value from sources", () => {
    const result = findFirst(
      () => null,
      () => "found",
      () => "ignored",
    );
    expect(result).toBe("found");
  });

  test("returns undefined when every source yields null or undefined", () => {
    expect(
      findFirst(
        () => null,
        () => undefined,
      ),
    ).toBeUndefined();
  });

  test("returns undefined when called with no sources", () => {
    expect(findFirst()).toBeUndefined();
  });

  test("stops evaluating sources once one resolves to a value", () => {
    const laterSource = mock(() => "never");
    findFirst(() => "found", laterSource);
    expect(laterSource).not.toHaveBeenCalled();
  });

  test.each([
    { label: "zero", value: 0 },
    { label: "empty string", value: "" },
    { label: "false", value: false },
  ])("treats $label as a valid value (not a fallback trigger)", ({ value }) => {
    expect(
      findFirst(
        () => value,
        () => "fallback",
      ),
    ).toBe(value);
  });
});

describe("findFromChildren", () => {
  test("returns the thumbnail from the lowest-order child", () => {
    const children = [
      orderedItem(3, "thumb-3"),
      orderedItem(1, "thumb-1"),
      orderedItem(2, "thumb-2"),
    ];
    expect(findFromChildren(children, (c) => c.data.thumbnail)).toBe("thumb-1");
  });

  test("skips children with no thumbnail and returns the next one in order", () => {
    const children = [
      orderedItem(1, undefined),
      orderedItem(2, "thumb-2"),
      orderedItem(3, "thumb-3"),
    ];
    expect(findFromChildren(children, (c) => c.data.thumbnail)).toBe("thumb-2");
  });

  test("returns undefined when no child has a thumbnail", () => {
    const children = [orderedItem(1), orderedItem(2), orderedItem(3)];
    expect(findFromChildren(children, (c) => c.data.thumbnail)).toBeUndefined();
  });

  test.each([
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "empty array", value: [] },
  ])("returns undefined for $label children", ({ value }) => {
    expect(findFromChildren(value, (c) => c.data.thumbnail)).toBeUndefined();
  });

  test("uses the caller-supplied order function when provided", () => {
    const children = [
      { priority: 10, thumb: "thumb-10" },
      { priority: 5, thumb: "thumb-5" },
    ];
    expect(
      findFromChildren(
        children,
        (c) => c.thumb,
        (c) => c.priority,
      ),
    ).toBe("thumb-5");
  });

  test("treats order 0 as lower than any positive order", () => {
    const children = [
      orderedItem(5, "thumb-5"),
      orderedItem(0, "thumb-0"),
      orderedItem(2, "thumb-2"),
    ];
    expect(findFromChildren(children, (c) => c.data.thumbnail)).toBe("thumb-0");
  });
});
