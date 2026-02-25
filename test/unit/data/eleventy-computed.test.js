import { describe, expect, test } from "bun:test";
import eleventyComputed from "#data/eleventyComputed.js";

describe("eleventyComputed", () => {
  describe("thumbnail", () => {
    test("Returns null for reviews without explicit thumbnail", () => {
      const data = {
        tags: ["reviews"],
        name: "John Smith",
        page: { url: "/reviews/some-review/" },
      };
      const result = eleventyComputed.thumbnail(data);
      expect(result).toBe(null);
    });

    test("Returns explicit thumbnail for reviews when specified", () => {
      const data = {
        tags: ["reviews"],
        name: "John Smith",
        thumbnail: "https://example.com/photo.jpg",
        page: { url: "/reviews/some-review/" },
      };
      const result = eleventyComputed.thumbnail(data);
      expect(result).toBe("https://example.com/photo.jpg");
    });

    test("Returns placeholder for non-reviews without thumbnail", () => {
      const data = {
        tags: ["products"],
        title: "Test Product",
        page: { url: "/products/test-product/" },
      };
      const result = eleventyComputed.thumbnail(data);
      // placeholder_images defaults to true, so we should get a placeholder
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("Returns null when placeholder_images disabled and no thumbnail", () => {
      const data = {
        tags: ["products"],
        title: "Test Product",
        page: { url: "/products/test-product/" },
        config: { placeholder_images: false },
      };
      const result = eleventyComputed.thumbnail(data);
      // With placeholder_images: false, we should get null (not a placeholder)
      expect(result).toBe(null);
    });

    test("Returns placeholder for items without tags", () => {
      const data = {
        title: "Test Page",
        page: { url: "/some-page/" },
      };
      const result = eleventyComputed.thumbnail(data);
      expect(result).toMatch(/^images\/placeholders\/\w+\.svg$/);
    });

    test("Returns local file thumbnail when file exists", () => {
      const data = {
        tags: ["products"],
        // This file exists in the repo
        thumbnail: "/images/placeholders/blue.svg",
        page: { url: "/products/test/" },
      };
      const result = eleventyComputed.thumbnail(data);
      expect(result).toBe("/images/placeholders/blue.svg");
    });

    test("Returns gallery first image as thumbnail fallback", () => {
      const data = {
        tags: ["products"],
        gallery: [
          "https://example.com/gallery1.jpg",
          "https://example.com/gallery2.jpg",
        ],
        page: { url: "/products/test/" },
      };
      const result = eleventyComputed.thumbnail(data);
      expect(result).toBe("https://example.com/gallery1.jpg");
    });

    test("Returns header_image as thumbnail fallback", () => {
      const data = {
        tags: ["products"],
        header_image: "https://example.com/header.jpg",
        page: { url: "/products/test/" },
      };
      const result = eleventyComputed.thumbnail(data);
      expect(result).toBe("https://example.com/header.jpg");
    });

    test("Throws error for non-existent local file", () => {
      const data = {
        tags: ["products"],
        thumbnail: "/images/does-not-exist.jpg",
        page: { url: "/products/test/" },
      };
      expect(() => eleventyComputed.thumbnail(data)).toThrow(
        "Image file not found",
      );
    });
  });

  describe("pagefind_body", () => {
    test("returns true when tag matches search_collections", () => {
      const data = {
        tags: ["products"],
        config: { search_collections: ["products", "categories"] },
      };
      expect(eleventyComputed.pagefind_body(data)).toBe(true);
    });

    test("returns false when no tags match search_collections", () => {
      const data = {
        tags: ["pages"],
        config: { search_collections: ["products", "categories"] },
      };
      expect(eleventyComputed.pagefind_body(data)).toBe(false);
    });

    test("returns false when config has no search_collections", () => {
      const data = { tags: ["products"], config: {} };
      expect(eleventyComputed.pagefind_body(data)).toBe(false);
    });

    test("returns false when tags is undefined", () => {
      const data = { config: { search_collections: ["products"] } };
      expect(eleventyComputed.pagefind_body(data)).toBe(false);
    });
  });

  describe("header_text", () => {
    test("Returns header_text when set", () => {
      const data = { header_text: "Custom Header", title: "Page Title" };
      expect(eleventyComputed.header_text(data)).toBe("Custom Header");
    });

    test("Falls back to title when header_text not set", () => {
      const data = { title: "Page Title" };
      expect(eleventyComputed.header_text(data)).toBe("Page Title");
    });
  });

  describe("meta_title", () => {
    test("Returns meta_title when set", () => {
      const data = { meta_title: "SEO Title", title: "Page Title" };
      expect(eleventyComputed.meta_title(data)).toBe("SEO Title");
    });

    test("Returns undefined when meta_title not set (fallback handled by template)", () => {
      const data = { title: "Page Title" };
      expect(eleventyComputed.meta_title(data)).toBeUndefined();
    });
  });

  describe("description", () => {
    test("Returns description when set", () => {
      const data = { description: "Main description", snippet: "Snippet" };
      expect(eleventyComputed.description(data)).toBe("Main description");
    });

    test("Falls back to snippet when description not set", () => {
      const data = { snippet: "Snippet text", meta_description: "Meta desc" };
      expect(eleventyComputed.description(data)).toBe("Snippet text");
    });

    test("Falls back to meta_description when others not set", () => {
      const data = { meta_description: "Meta description" };
      expect(eleventyComputed.description(data)).toBe("Meta description");
    });

    test("Returns empty string when nothing set", () => {
      const data = {};
      expect(eleventyComputed.description(data)).toBe("");
    });
  });

  describe("order", () => {
    test("Returns order when set", () => {
      const data = { order: 5 };
      expect(eleventyComputed.order(data)).toBe(5);
    });

    test("Returns 9999 when order not set (sorts last)", () => {
      const data = {};
      expect(eleventyComputed.order(data)).toBe(9999);
    });
  });

  describe("faqs", () => {
    test("Returns faqs array when set", () => {
      const faqs = [{ question: "Q1", answer: "A1" }];
      const data = { faqs };
      expect(eleventyComputed.faqs(data)).toBe(faqs);
    });

    test("Returns empty array when faqs not set", () => {
      const data = {};
      expect(eleventyComputed.faqs(data)).toEqual([]);
    });
  });

  describe("tabs", () => {
    test("Returns tabs array when set with body", () => {
      const tabs = [{ title: "Tab1", body: "Content1" }];
      const data = { tabs };
      const result = eleventyComputed.tabs(data);
      expect(result).toEqual([{ title: "Tab1", body: "Content1" }]);
    });

    test("Returns empty array when tabs not set", () => {
      const data = {};
      expect(eleventyComputed.tabs(data)).toEqual([]);
    });

    test.each([
      ["undefined", { title: "Tab1" }],
      ["null", { title: "Tab1", body: null }],
      ["empty string", { title: "Tab1", body: "" }],
    ])("Normalizes body to empty string when %s", (_label, inputTab) => {
      const result = eleventyComputed.tabs({ tabs: [inputTab] });
      expect(result[0].body).toBe("");
      expect(result[0].title).toBe("Tab1");
    });

    test("Handles multiple tabs with mixed body states", () => {
      const tabs = [
        { title: "Tab1", body: "Content" },
        { title: "Tab2" },
        { title: "Tab3", body: null },
        { title: "Tab4", body: "" },
      ];
      const data = { tabs };
      const result = eleventyComputed.tabs(data);
      expect(result).toEqual([
        { title: "Tab1", body: "Content" },
        { title: "Tab2", body: "" },
        { title: "Tab3", body: "" },
        { title: "Tab4", body: "" },
      ]);
    });

    test("Preserves other tab properties when defaulting body", () => {
      const tabs = [{ title: "Tab1", image: "image.jpg" }];
      const data = { tabs };
      const result = eleventyComputed.tabs(data);
      expect(result).toEqual([{ title: "Tab1", image: "image.jpg", body: "" }]);
    });
  });

  describe("eleventyNavigation", () => {
    test("Returns navigation with anchor processing", () => {
      const data = {
        eleventyNavigation: { key: "Test", parent: "Parent" },
      };
      const result = eleventyComputed.eleventyNavigation(data);
      // withNavigationAnchor returns the navigation object
      expect(result).toEqual({ key: "Test", parent: "Parent" });
    });

    test("Handles undefined eleventyNavigation", () => {
      const data = {};
      const result = eleventyComputed.eleventyNavigation(data);
      expect(result).toBeUndefined();
    });
  });

  describe("meta", () => {
    test("Returns product meta for product tag", () => {
      const data = {
        tags: ["products"],
        title: "Test Product",
        site: { name: "Test Site", url: "https://test.com" },
        page: { url: "/products/test/" },
      };
      const result = eleventyComputed.meta(data);
      // Product meta includes brand and name
      expect(result.name).toBe("Test Product");
      expect(result.brand).toBe("Test Site");
    });

    test("Returns post meta for news tag", () => {
      const data = {
        tags: ["news"],
        title: "Test Post",
        site: { name: "Test Site", url: "https://test.com" },
        page: { url: "/news/test-post/", date: new Date("2024-01-15") },
      };
      const result = eleventyComputed.meta(data);
      // Post meta includes author and publisher
      expect(result.author.name).toBe("Test Site");
      expect(result.publisher.name).toBe("Test Site");
      expect(result.datePublished).toBe("2024-01-15");
    });

    test("Returns organization meta for contact layout", () => {
      const data = {
        layout: "contact.html",
        title: "Contact Us",
        site: { name: "Test Site", url: "https://test.com" },
        page: { url: "/contact/" },
      };
      const result = eleventyComputed.meta(data);
      // Organization meta has basic fields
      expect(result.title).toBe("Contact Us");
      expect(result.url).toBeDefined();
    });

    test("Returns base meta for other pages", () => {
      const data = {
        tags: ["pages"],
        title: "About Us",
        site: { name: "Test Site", url: "https://test.com" },
        page: { url: "/about/" },
      };
      const result = eleventyComputed.meta(data);
      // Base meta has title and url
      expect(result.title).toBe("About Us");
      expect(result.url).toBeDefined();
    });
  });

  describe("metaComputed", () => {
    test("Returns metaComputed when set", () => {
      const metaComputed = { customField: "value" };
      const data = { metaComputed };
      expect(eleventyComputed.metaComputed(data)).toBe(metaComputed);
    });

    test("Returns empty object when metaComputed not set", () => {
      const data = {};
      expect(eleventyComputed.metaComputed(data)).toEqual({});
    });
  });

  describe("filter_attributes", () => {
    test("Returns undefined when filter_attributes not set", () => {
      const data = { page: { inputPath: "/products/test.md" } };
      expect(eleventyComputed.filter_attributes(data)).toBeUndefined();
    });

    test("Returns filter_attributes unchanged in normal mode", () => {
      const filterAttrs = [
        { name: "Color", value: "Red" },
        { name: "Size", value: "Large" },
      ];
      const data = {
        filter_attributes: filterAttrs,
        page: { inputPath: "/products/test.md" },
      };
      expect(eleventyComputed.filter_attributes(data)).toBe(filterAttrs);
    });
  });

  describe("contactForm", () => {
    test("Returns contact form configuration", () => {
      const result = eleventyComputed.contactForm();
      expect(result).toBeDefined();
      // contactForm returns an object with form field configuration
      expect(typeof result).toBe("object");
    });
  });

  describe("quoteFields", () => {
    test("Returns quote fields configuration", () => {
      const result = eleventyComputed.quoteFields();
      expect(result).toBeDefined();
      // quoteFields returns an object with field configuration
      expect(typeof result).toBe("object");
    });
  });

  describe("blocks", () => {
    const page = { inputPath: "test.html" };

    test("Returns undefined when blocks not set", () => {
      const data = { page };
      expect(eleventyComputed.blocks(data)).toBeUndefined();
    });

    test("Returns blocks array with defaults for markdown type", () => {
      const blocks = [{ type: "markdown", content: "test" }];
      const data = { blocks, page };
      const result = eleventyComputed.blocks(data);
      expect(result).toEqual([
        { type: "markdown", content: "test", section_class: "" },
      ]);
    });

    test("Throws error for unknown block type", () => {
      const blocks = [{ type: "unknown-type", content: "test" }];
      const data = { blocks, page };
      expect(() => eleventyComputed.blocks(data)).toThrow(
        'Unknown block type "unknown-type"',
      );
    });

    test("Throws error for unknown block keys", () => {
      const blocks = [{ type: "video-background", video_url: "bad" }];
      const data = { blocks, page };
      expect(() => eleventyComputed.blocks(data)).toThrow(
        'unknown keys: "video_url"',
      );
    });

    test("Applies defaults for features block type", () => {
      const data = { blocks: [{ type: "features", items: [] }], page };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "features",
        items: [],
        reveal: true,
        heading_level: 3,
        grid_class: "features",
        section_class: "",
      });
    });

    test("Applies defaults for stats block type", () => {
      const data = { blocks: [{ type: "stats", items: [] }], page };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "stats",
        items: [],
        reveal: true,
        section_class: "",
      });
    });

    test("Applies defaults for split block type", () => {
      const data = { blocks: [{ type: "split", title: "Test" }], page };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "split",
        title: "Test",
        title_level: 2,
        reveal_figure: "scale",
        reveal_content: "left",
        section_class: "",
      });
    });

    test("Sets reveal_content to right for reversed split block", () => {
      const data = {
        blocks: [{ type: "split", title: "Test", reverse: true }],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0].reveal_content).toBe("right");
    });

    test("Preserves explicit reveal_content on split block", () => {
      const data = {
        blocks: [{ type: "split", title: "Test", reveal_content: "left" }],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0].reveal_content).toBe("left");
    });

    test("Applies defaults for section-header block type", () => {
      const data = {
        blocks: [{ type: "section-header", title: "Header" }],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "section-header",
        title: "Header",
        level: 2,
        align: "center",
        section_class: "",
      });
    });

    test("Applies defaults for image-cards block type", () => {
      const data = { blocks: [{ type: "image-cards", items: [] }], page };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "image-cards",
        items: [],
        reveal: true,
        heading_level: 3,
        section_class: "",
      });
    });

    test("Applies defaults for code-block type", () => {
      const data = {
        blocks: [{ type: "code-block", code: "test", filename: "test.js" }],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "code-block",
        code: "test",
        filename: "test.js",
        reveal: true,
        section_class: "",
      });
    });

    test("Applies defaults for video-background block type", () => {
      const data = {
        blocks: [
          {
            type: "video-background",
            video_id: "dQw4w9WgXcQ",
            content: "<h2>Test</h2>",
          },
        ],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0]).toEqual({
        type: "video-background",
        video_id: "dQw4w9WgXcQ",
        content: "<h2>Test</h2>",
        aspect_ratio: "16/9",
        section_class: "",
      });
    });

    test("User values override defaults", () => {
      const data = {
        blocks: [{ type: "features", reveal: false, heading_level: 2 }],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0].reveal).toBe(false);
      expect(result[0].heading_level).toBe(2);
      expect(result[0].grid_class).toBe("features"); // default still applied
    });

    test("Explicit section_class overrides default empty string", () => {
      const data = {
        blocks: [{ type: "stats", items: [], section_class: "alt" }],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0].section_class).toBe("alt");
    });

    test("Processes multiple blocks with different types", () => {
      const data = {
        blocks: [
          { type: "stats", items: [] },
          { type: "code-block", code: "x", filename: "x.js" },
        ],
        page,
      };
      const result = eleventyComputed.blocks(data);
      expect(result[0].reveal).toBe(true);
      expect(result[1].reveal).toBe(true);
    });
  });

  describe("videos", () => {
    test("Returns undefined when videos not set", async () => {
      const data = {};
      expect(await eleventyComputed.videos(data)).toBeUndefined();
    });

    test("Adds thumbnail_url for YouTube video IDs", async () => {
      const data = {
        videos: [
          { id: "dQw4w9WgXcQ", title: "YouTube Video" },
          { id: "abc123xyz", title: "Another Video" },
        ],
      };
      const result = await eleventyComputed.videos(data);
      expect(result[0].thumbnail_url).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
      expect(result[1].thumbnail_url).toBe(
        "https://img.youtube.com/vi/abc123xyz/hqdefault.jpg",
      );
    });

    test("Sets thumbnail_url to null for non-video custom URLs", async () => {
      const data = {
        videos: [{ id: "http://example.com/embed", title: "Custom Embed" }],
      };
      const result = await eleventyComputed.videos(data);
      expect(result[0].thumbnail_url).toBe(null);
    });

    test("Preserves other video properties", async () => {
      const data = {
        videos: [{ id: "dQw4w9WgXcQ", title: "Test", customField: "value" }],
      };
      const result = await eleventyComputed.videos(data);
      expect(result[0].id).toBe("dQw4w9WgXcQ");
      expect(result[0].title).toBe("Test");
      expect(result[0].customField).toBe("value");
      expect(result[0].thumbnail_url).toBe(
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      );
    });
  });
});
