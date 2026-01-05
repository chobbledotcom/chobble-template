import { describe, expect, test } from "bun:test";
import {
  createElement,
  createHtml,
  elementToHtml,
  getSharedDocument,
  parseHtml,
} from "#utils/dom-builder.js";

describe("dom-builder", () => {
  // ============================================
  // createElement Tests
  // ============================================

  test("Creates element with tag name only", async () => {
    const element = await createElement("div");

    expect(element.tagName.toLowerCase()).toBe("div");
    expect(element.outerHTML).toBe("<div></div>");
  });

  test("Creates element with attributes", async () => {
    const element = await createElement("img", {
      src: "/image.png",
      alt: "Test image",
      width: "100",
    });

    expect(element.getAttribute("src")).toBe("/image.png");
    expect(element.getAttribute("alt")).toBe("Test image");
    expect(element.getAttribute("width")).toBe("100");
  });

  test("Ignores null and undefined attributes", async () => {
    const element = await createElement("div", {
      class: "valid",
      id: null,
      "data-test": undefined,
    });

    expect(element.getAttribute("class")).toBe("valid");
    expect(element.hasAttribute("id")).toBe(false);
    expect(element.hasAttribute("data-test")).toBe(false);
  });

  test("Creates element with string children (innerHTML)", async () => {
    const element = await createElement(
      "p",
      {},
      "Hello <strong>world</strong>",
    );

    expect(element.innerHTML).toBe("Hello <strong>world</strong>");
  });

  test("Creates element with single child element", async () => {
    const doc = await getSharedDocument();
    const child = doc.createElement("span");
    child.textContent = "Child content";

    const element = await createElement("div", { class: "parent" }, child);

    expect(element.childNodes.length).toBe(1);
    expect(element.firstChild.tagName.toLowerCase()).toBe("span");
    expect(element.firstChild.textContent).toBe("Child content");
  });

  test("Creates element with array of child elements", async () => {
    const doc = await getSharedDocument();
    const children = [
      doc.createElement("span"),
      doc.createElement("strong"),
      doc.createElement("em"),
    ];
    children[0].textContent = "First";
    children[1].textContent = "Second";
    children[2].textContent = "Third";

    const element = await createElement("div", {}, children);

    expect(element.childNodes.length).toBe(3);
    expect(element.children[0].tagName.toLowerCase()).toBe("span");
    expect(element.children[1].tagName.toLowerCase()).toBe("strong");
    expect(element.children[2].tagName.toLowerCase()).toBe("em");
    expect(element.textContent).toBe("FirstSecondThird");
  });

  test("Handles null children gracefully", async () => {
    const element = await createElement("div", {}, null);

    expect(element.childNodes.length).toBe(0);
    expect(element.outerHTML).toBe("<div></div>");
  });

  test("Uses provided document instead of shared", async () => {
    const doc = await getSharedDocument();
    const element = await createElement("span", { id: "test" }, "Content", doc);

    expect(element.ownerDocument).toBe(doc);
    expect(element.id).toBe("test");
  });

  // ============================================
  // elementToHtml Tests
  // ============================================

  test("Converts element to HTML string", async () => {
    const element = await createElement("div", { class: "test" }, "Content");
    const html = elementToHtml(element);

    expect(html).toBe('<div class="test">Content</div>');
  });

  test("Converts complex element to HTML string", async () => {
    const doc = await getSharedDocument();
    const child = doc.createElement("span");
    child.textContent = "Nested";

    const element = await createElement(
      "div",
      { id: "parent", class: "wrapper" },
      child,
    );
    const html = elementToHtml(element);

    expect(html).toBe(
      '<div id="parent" class="wrapper"><span>Nested</span></div>',
    );
  });

  // ============================================
  // createHtml Tests
  // ============================================

  test("Creates HTML string directly", async () => {
    const html = await createHtml("p", { class: "text" }, "Hello");

    expect(html).toBe('<p class="text">Hello</p>');
  });

  test("Creates self-closing tags correctly", async () => {
    const html = await createHtml("img", { src: "test.png", alt: "Test" });

    expect(html.includes('src="test.png"')).toBe(true);
    expect(html.includes('alt="Test"')).toBe(true);
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

    expect(element.ownerDocument).toBe(doc);
    expect(element.id).toBe("test");
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
