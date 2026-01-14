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

    test("Falls back to title when meta_title not set", () => {
      const data = { title: "Page Title" };
      expect(eleventyComputed.meta_title(data)).toBe("Page Title");
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
    test("Returns tabs array when set", () => {
      const tabs = [{ title: "Tab1", content: "Content1" }];
      const data = { tabs };
      expect(eleventyComputed.tabs(data)).toBe(tabs);
    });

    test("Returns empty array when tabs not set", () => {
      const data = {};
      expect(eleventyComputed.tabs(data)).toEqual([]);
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
});
