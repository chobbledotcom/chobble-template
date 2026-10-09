import { describe, expect, test } from "vitest";
import { expectObjectProps } from "#test/test-utils.js";
import { createHtml, parseHtml } from "#utils/dom-builder.js";

describe("dom-builder", () => {
  // ============================================
  // createHtml Tests
  // ============================================

  test("Creates HTML with tag name only", async () => {
    const html = await createHtml("div");

    expect(html).toBe("<div></div>");
  });

  test("Creates HTML with attributes", async () => {
    const html = await createHtml("img", {
      src: "/image.png",
      alt: "Test image",
      width: "100",
    });

    expect(html).toContain('src="/image.png"');
    expect(html).toContain('alt="Test image"');
    expect(html).toContain('width="100"');
  });

  test("Ignores null and undefined attributes", async () => {
    const html = await createHtml("div", {
      class: "valid",
      id: null,
      "data-test": undefined,
    });

    expect(html).toContain('class="valid"');
    expect(html).not.toContain("id=");
    expect(html).not.toContain("data-test=");
  });

  test("Omits attribute spacing when all values are nullish", async () => {
    expect(await createHtml("div", { id: null, title: undefined })).toBe(
      "<div></div>",
    );
  });

  test("Preserves empty attribute values", async () => {
    expect(await createHtml("input", { value: "" })).toBe('<input value="">');
  });

  test("Creates HTML with string children (innerHTML)", async () => {
    const html = await createHtml("p", {}, "Hello <strong>world</strong>");

    expect(html).toBe("<p>Hello <strong>world</strong></p>");
  });

  test("Creates HTML with class attribute", async () => {
    const html = await createHtml("p", { class: "text" }, "Hello");

    expect(html).toBe('<p class="text">Hello</p>');
  });

  test("Creates self-closing tags correctly", async () => {
    const html = await createHtml("img", { src: "test.png", alt: "Test" });

    expect(html).toContain('src="test.png"');
    expect(html).toContain('alt="Test"');
  });

  test("Handles void elements without closing tag", async () => {
    const img = await createHtml("img", { src: "photo.jpg" });
    const br = await createHtml("br");
    const input = await createHtml("input", { type: "text" });

    expect(img).toBe('<img src="photo.jpg">');
    expect(br).toBe("<br>");
    expect(input).toBe('<input type="text">');
  });

  test("Escapes special characters in attribute values", async () => {
    const html = await createHtml("div", {
      "data-value": 'test "quoted" & <special>',
    });

    expect(html).toBe(
      '<div data-value="test &quot;quoted&quot; &amp; &lt;special&gt;"></div>',
    );
  });

  test("Handles empty string children", async () => {
    const html = await createHtml("span", {}, "");

    expect(html).toBe("<span></span>");
  });

  // ============================================
  // parseHtml round-trip tests
  // ============================================

  test("Preserves attributes and content when parsing", async () => {
    const element = await parseHtml('<div class="test">Content</div>');

    expect(element.outerHTML).toBe('<div class="test">Content</div>');
  });

  test("Preserves nested markup when parsing", async () => {
    const element = await parseHtml(
      '<div id="parent" class="wrapper"><span>Nested</span></div>',
    );

    expect(element.outerHTML).toBe(
      '<div id="parent" class="wrapper"><span>Nested</span></div>',
    );
  });

  // ============================================
  // parseHtml Tests
  // ============================================

  test("Parses HTML string into element", async () => {
    const element = await parseHtml('<div class="parsed">Content</div>');

    expect(element.tagName.toLowerCase()).toBe("div");
    expect(element.className).toBe("parsed");
    expect(element.textContent).toBe("Content");
  });

  test("Parses nested HTML correctly", async () => {
    const element = await parseHtml("<ul><li>Item 1</li><li>Item 2</li></ul>");

    expect(element.tagName.toLowerCase()).toBe("ul");
    expect(element.children.length).toBe(2);
    expect(element.children[0].textContent).toBe("Item 1");
    expect(element.children[1].textContent).toBe("Item 2");
  });

  test("Parses HTML with provided document", async () => {
    const doc = document;
    const element = await parseHtml('<span id="test">Test</span>', doc);

    expectObjectProps({
      ownerDocument: doc,
      id: "test",
    })(element);
  });

  test("Returns only the first element, ignoring preceding text and comments", async () => {
    const element = await parseHtml(
      "text<!-- comment --><span>First</span><div>Second</div>",
    );
    expect(element.outerHTML).toBe("<span>First</span>");
  });

  test.each([
    "",
    "plain text",
    "<!-- comment -->",
  ])("Returns null when %j has no element", async (html) => {
    expect(await parseHtml(html)).toBeNull();
  });

  test("Reuses the default document without sharing parsed elements", async () => {
    const [first, second] = await Promise.all([
      parseHtml("<div>First</div>"),
      parseHtml("<div>Second</div>"),
    ]);
    const third = await parseHtml("<span>Third</span>");

    expect(first.ownerDocument).toBe(second.ownerDocument);
    expect(third.ownerDocument).toBe(first.ownerDocument);
    expect(first).not.toBe(second);
    expect(first.outerHTML).toBe("<div>First</div>");
    expect(second.outerHTML).toBe("<div>Second</div>");
    expect(third.outerHTML).toBe("<span>Third</span>");
  });
});
