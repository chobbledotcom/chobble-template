import { describe, expect, test } from "bun:test";
import { configureLinkList, linkList } from "#eleventy/link-list.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

const createCollection = (items) =>
  items.map(([slug, title, url]) => ({
    fileSlug: slug,
    url,
    data: { title },
  }));

describe("link-list", () => {
  test("Registers linkList filter with Eleventy", () => {
    const mockConfig = createMockEleventyConfig();
    configureLinkList(mockConfig);

    expect(typeof mockConfig.filters.linkList).toBe("function");
  });

  test("Returns empty string for null slugs", async () => {
    const collection = createCollection([]);

    const result = await linkList(null, collection);

    expect(result).toBe("");
  });

  test("Returns empty string for empty slugs array", async () => {
    const collection = createCollection([]);

    const result = await linkList([], collection);

    expect(result).toBe("");
  });

  test("Returns empty string for null collection", async () => {
    const result = await linkList(["test"], null);

    expect(result).toBe("");
  });

  test("Returns empty string for non-array collection", async () => {
    const result = await linkList(["test"], "not an array");

    expect(result).toBe("");
  });

  test("Creates a single link for one matching slug", async () => {
    const collection = createCollection([
      ["widget", "Widget Pro", "/products/widget/"],
    ]);

    const result = await linkList(["widget"], collection);

    expect(result).toBe('<a href="/products/widget/">Widget Pro</a>');
  });

  test("Creates comma-separated links for multiple slugs", async () => {
    const collection = createCollection([
      ["widget", "Widget Pro", "/products/widget/"],
      ["gadget", "Gadget Plus", "/products/gadget/"],
      ["gizmo", "Gizmo Max", "/products/gizmo/"],
    ]);

    const result = await linkList(["widget", "gadget", "gizmo"], collection);

    expect(result).toBe(
      '<a href="/products/widget/">Widget Pro</a>, ' +
        '<a href="/products/gadget/">Gadget Plus</a>, ' +
        '<a href="/products/gizmo/">Gizmo Max</a>',
    );
  });

  test("Throws for slugs not found in collection", async () => {
    const collection = createCollection([
      ["widget", "Widget Pro", "/products/widget/"],
      ["gadget", "Gadget Plus", "/products/gadget/"],
    ]);

    await expect(
      linkList(["widget", "missing", "gadget"], collection),
    ).rejects.toThrow('Slug "missing" not found');
  });

  test("Preserves order of slugs in output", async () => {
    const collection = createCollection([
      ["alpha", "Alpha", "/products/alpha/"],
      ["beta", "Beta", "/products/beta/"],
      ["gamma", "Gamma", "/products/gamma/"],
    ]);

    const result = await linkList(["gamma", "alpha", "beta"], collection);

    expect(result).toBe(
      '<a href="/products/gamma/">Gamma</a>, ' +
        '<a href="/products/alpha/">Alpha</a>, ' +
        '<a href="/products/beta/">Beta</a>',
    );
  });
});
