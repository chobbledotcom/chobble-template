import { describe, expect, test } from "bun:test";
import { expectObjectProps } from "#test/test-utils.js";
import {
  createHtml,
  elementToHtml,
  getSharedDocument,
  parseHtml,
} from "#utils/dom-builder.js";

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

  // ============================================
  // elementToHtml Tests
  // ============================================

  test("Converts element to HTML string", async () => {
    const element = await parseHtml('<div class="test">Content</div>');
    const html = elementToHtml(element);

    expect(html).toBe('<div class="test">Content</div>');
  });

  test("Converts complex element to HTML string", async () => {
    const element = await parseHtml(
      '<div id="parent" class="wrapper"><span>Nested</span></div>',
    );
    const html = elementToHtml(element);

    expect(html).toBe(
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
    const doc = await getSharedDocument();
    const element = await parseHtml('<span id="test">Test</span>', doc);

    expectObjectProps({
      ownerDocument: doc,
      id: "test",
    })(element);
  });

  // ============================================
  // getSharedDocument Tests
  // ============================================

  test("Returns same document on multiple calls", async () => {
    const doc1 = await getSharedDocument();
    const doc2 = await getSharedDocument();

    expect(doc1).toBe(doc2);
  });

  test("Shared document can create elements", async () => {
    const doc = await getSharedDocument();
    const element = doc.createElement("div");

    expect(element.tagName.toLowerCase()).toBe("div");
  });
});
