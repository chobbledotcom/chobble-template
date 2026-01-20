import { describe, expect, test } from "bun:test";
import {
  ASPECT_RATIO_ATTRIBUTE,
  extractImageOptions,
  fixDivsInParagraphs,
  IGNORE_ATTRIBUTE,
  NO_LQIP_ATTRIBUTE,
  processImages,
} from "#transforms/images.js";
import { loadDOM } from "#utils/lazy-dom.js";

describe("images transform", () => {
  describe("fixDivsInParagraphs", () => {
    test("unwraps div that is sole child of paragraph", async () => {
      const dom = await loadDOM(
        "<html><body><p><div>Content</div></p></body></html>",
      );
      fixDivsInParagraphs(dom.window.document);
      const result = dom.serialize();

      expect(result).not.toContain("<p><div>");
      expect(result).toContain("<div>Content</div>");
    });

    test("does not unwrap div with siblings", async () => {
      const dom = await loadDOM(
        "<html><body><p>Text<div>Content</div></p></body></html>",
      );
      fixDivsInParagraphs(dom.window.document);
      expect(dom.serialize()).toContain("<p>");
    });

    test("handles multiple invalid paragraphs", async () => {
      const dom = await loadDOM(
        "<html><body><p><div>A</div></p><p><div>B</div></p></body></html>",
      );
      fixDivsInParagraphs(dom.window.document);
      const result = dom.serialize();

      expect(result).toContain("<div>A</div>");
      expect(result).toContain("<div>B</div>");
      expect(result.match(/<p><div>/g)).toBeNull();
    });
  });

  describe("extractImageOptions", () => {
    const getImageOptions = async (html) => {
      const dom = await loadDOM(html);
      const img = dom.window.document.querySelector("img");
      return {
        options: extractImageOptions(img, dom.window.document),
        img,
        dom,
      };
    };

    test("extracts basic image attributes", async () => {
      const { options } = await getImageOptions(
        '<html><body><img src="/images/test.jpg" alt="Test" class="hero"></body></html>',
      );
      expect(options.imageName).toBe("/images/test.jpg");
      expect(options.alt).toBe("Test");
      expect(options.classes).toBe("hero");
    });

    test("extracts and removes aspect ratio attribute", async () => {
      const { options, img } = await getImageOptions(
        `<html><body><img src="/images/test.jpg" ${ASPECT_RATIO_ATTRIBUTE}="16:9"></body></html>`,
      );
      expect(options.aspectRatio).toBe("16:9");
      expect(img.hasAttribute(ASPECT_RATIO_ATTRIBUTE)).toBe(false);
    });

    test("extracts sizes and widths attributes", async () => {
      const { options } = await getImageOptions(
        '<html><body><img src="/images/test.jpg" sizes="100vw" widths="300,600,900"></body></html>',
      );
      expect(options.sizes).toBe("100vw");
      expect(options.widths).toBe("300,600,900");
    });

    test("returns null for missing attributes", async () => {
      const { options } = await getImageOptions(
        '<html><body><img src="/images/test.jpg"></body></html>',
      );
      expect(options.alt).toBeNull();
      expect(options.classes).toBeNull();
      expect(options.aspectRatio).toBeNull();
    });

    test("extracts no-lqip attribute as true", async () => {
      const { options } = await getImageOptions(
        `<html><body><img src="/images/test.jpg" ${NO_LQIP_ATTRIBUTE}></body></html>`,
      );
      expect(options.noLqip).toBe(true);
    });

    test("removes no-lqip attribute from element", async () => {
      const { img } = await getImageOptions(
        `<html><body><img src="/images/test.jpg" ${NO_LQIP_ATTRIBUTE}></body></html>`,
      );
      expect(img.hasAttribute(NO_LQIP_ATTRIBUTE)).toBe(false);
    });

    test("noLqip defaults to false when attribute is absent", async () => {
      const { options } = await getImageOptions(
        '<html><body><img src="/images/test.jpg"></body></html>',
      );
      expect(options.noLqip).toBe(false);
    });

    test("sets returnElement to true and includes document", async () => {
      const { options, dom } = await getImageOptions(
        '<html><body><img src="/images/test.jpg"></body></html>',
      );
      expect(options.returnElement).toBe(true);
      expect(options.document).toBe(dom.window.document);
    });
  });

  describe("processImages", () => {
    const createWrapper = (doc) => {
      const div = doc.createElement("div");
      div.className = "image-wrapper";
      return div;
    };

    const expectSkipped = async (html) => {
      const dom = await loadDOM(html);
      let called = false;
      await processImages(dom.window.document, {}, async () => {
        called = true;
        return createWrapper(dom.window.document);
      });
      expect(called).toBe(false);
      return dom;
    };

    const processAndCapture = async (html) => {
      const dom = await loadDOM(html);
      let captured = null;
      await processImages(dom.window.document, {}, async (opts) => {
        captured = opts;
        const div = createWrapper(dom.window.document);
        div.innerHTML = "<picture>processed</picture>";
        return div;
      });
      return { captured, dom };
    };

    test("processes images with /images/ src", async () => {
      const { captured } = await processAndCapture(
        '<html><body><img src="/images/test.jpg" alt="Test"></body></html>',
      );
      expect(captured).not.toBeNull();
      expect(captured.imageName).toBe("/images/test.jpg");
    });

    test("skips images with ignore attribute", async () => {
      await expectSkipped(
        `<html><body><img src="/images/test.jpg" ${IGNORE_ATTRIBUTE}></body></html>`,
      );
    });

    test("removes ignore attribute after processing", async () => {
      const dom = await expectSkipped(
        `<html><body><img src="/images/test.jpg" ${IGNORE_ATTRIBUTE}></body></html>`,
      );
      expect(
        dom.window.document.querySelector("img").hasAttribute(IGNORE_ATTRIBUTE),
      ).toBe(false);
    });

    test("processes images with no-lqip attribute and passes noLqip option", async () => {
      const { captured } = await processAndCapture(
        `<html><body><img src="/images/test.jpg" ${NO_LQIP_ATTRIBUTE}></body></html>`,
      );
      expect(captured).not.toBeNull();
      expect(captured.noLqip).toBe(true);
    });

    test("skips images already wrapped", async () => {
      await expectSkipped(
        '<html><body><div class="image-wrapper"><img src="/images/test.jpg"></div></body></html>',
      );
    });

    test("skips images without /images/ prefix", async () => {
      await expectSkipped(
        '<html><body><img src="/assets/test.jpg" alt="Test"></body></html>',
      );
    });

    test("processes multiple images", async () => {
      const dom = await loadDOM(
        '<html><body><img src="/images/a.jpg"><img src="/images/b.jpg"></body></html>',
      );
      const names = [];
      await processImages(dom.window.document, {}, async (opts) => {
        names.push(opts.imageName);
        return createWrapper(dom.window.document);
      });
      expect(names).toContain("/images/a.jpg");
      expect(names).toContain("/images/b.jpg");
    });

    test("does nothing when no images present", async () => {
      await expectSkipped("<html><body><p>No images</p></body></html>");
    });

    test("fixes divs in paragraphs after processing", async () => {
      const dom = await loadDOM(
        '<html><body><p><img src="/images/test.jpg"></p></body></html>',
      );
      await processImages(dom.window.document, {}, async () => {
        const div = createWrapper(dom.window.document);
        div.innerHTML = "<picture></picture>";
        return div;
      });
      expect(dom.serialize()).not.toContain("<p><div");
    });
  });

  describe("constants", () => {
    test("ASPECT_RATIO_ATTRIBUTE is correct", () => {
      expect(ASPECT_RATIO_ATTRIBUTE).toBe("eleventy:aspectRatio");
    });

    test("IGNORE_ATTRIBUTE is correct", () => {
      expect(IGNORE_ATTRIBUTE).toBe("eleventy:ignore");
    });
  });
});
