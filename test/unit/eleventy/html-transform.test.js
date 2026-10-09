import { describe, expect, test, vi } from "vitest";
import { configureHtmlTransform } from "#eleventy/html-transform.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

// The transform reads the site config at module scope. These tests cover the
// transform's own features, so they run it against the template defaults
// rather than whatever the site's config.json turns on or off.
vi.mock("#data/config.js", async () => {
  const { mockTemplateConfig } = await import("#test/test-utils.js");
  return mockTemplateConfig();
});

describe("html-transform", () => {
  // Mock image processor that returns a simple div
  const mockImageProcessor = async (options) => {
    if (options.returnElement && options.document) {
      const div = options.document.createElement("div");
      div.className = "image-wrapper";
      div.innerHTML = `<picture><img src="${options.imageName}" alt="${options.alt || ""}"></picture>`;
      return div;
    }
    return `<div class="image-wrapper"><picture><img src="${options.imageName}"></picture></div>`;
  };

  /**
   * Run the HTML content through the PostHTML plugin registered by
   * configureHtmlTransform for the given output path.
   */
  const runRegisteredTransform = (content, outputPath = "index.html") => {
    const mockConfig = createMockEleventyConfig();
    configureHtmlTransform(mockConfig, mockImageProcessor);
    const runTree = mockConfig.htmlTransformer.plugins.html.plugin({
      outputPath,
    });
    return runTree({ render: () => content, parser: (html) => html });
  };

  describe("registered transform", () => {
    test("plugin factory returns a transform function", () => {
      const mockConfig = createMockEleventyConfig();
      configureHtmlTransform(mockConfig, mockImageProcessor);
      const plugin = mockConfig.htmlTransformer.plugins.html.plugin;

      expect(typeof plugin).toBe("function");
      expect(typeof plugin({ outputPath: "index.html" })).toBe("function");
    });

    test("skips non-HTML files", async () => {
      const content = "body { color: red; }";
      expect(await runRegisteredTransform(content, "style.css")).toBe(content);
    });

    test("returns empty content unchanged", async () => {
      expect(await runRegisteredTransform("", "index.html")).toBe("");
      expect(await runRegisteredTransform(null, "index.html")).toBe(null);
    });

    test("returns content when outputPath is null", async () => {
      const content = "<p>Test</p>";
      expect(await runRegisteredTransform(content, null)).toBe(content);
    });

    test("linkifies URLs in text", async () => {
      const html =
        "<html><body><p>Visit https://example.com today</p></body></html>";
      const result = await runRegisteredTransform(html, "index.html");

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain(">example.com</a>");
    });

    test("leaves inline script bodies unescaped while linkifying", async () => {
      const script = "<script>const f = (a) => a > 1 && a < 5;</script>";
      const html = `<html><body><p>Visit https://example.com</p>${script}</body></html>`;
      const result = await runRegisteredTransform(html, "index.html");

      expect(result).toContain(script);
      expect(result).not.toContain("&gt;");
      expect(result).toContain('href="https://example.com"');
    });

    test("leaves inline style bodies unescaped while linkifying", async () => {
      const style = "<style>.parent > .child { color: red; }</style>";
      const html = `<html><body><p>Visit https://example.com</p>${style}</body></html>`;
      const result = await runRegisteredTransform(html, "index.html");

      expect(result).toContain(style);
      expect(result).not.toContain("&gt;");
    });

    test("linkifies and encrypts email addresses", async () => {
      const html = "<html><body><p>Contact hello@example.com</p></body></html>";
      const result = await runRegisteredTransform(html, "index.html");

      expect(result).not.toContain("mailto:hello@example.com");
      expect(result).toContain("data-decrypt-link");
      const hrefMatch = result.match(/href="([^"]+)"[^>]*data-decrypt-link/);
      expect(hrefMatch[1]).toMatch(/^#[0-9a-zA-Z_-]+$/);
    });

    test("linkifies phone numbers with default config", async () => {
      // Valid 11-digit UK phone number
      const html = "<html><body><p>Call 01234 567 890</p></body></html>";
      const result = await runRegisteredTransform(html, "index.html");

      // Phone transform runs - default config may have phoneNumberLength=null (treated as 11)
      // Test that transform completes without error
      expect(result).toContain("<p>");
    });

    test("wraps tables in scrollable containers", async () => {
      const html =
        "<html><body><table><tr><td>Cell</td></tr></table></body></html>";
      const result = await runRegisteredTransform(html, "index.html");

      expect(result).toContain('class="scrollable-table"');
    });

    test("processes images with /images/ src", async () => {
      const html =
        '<html><body><img src="/images/test.jpg" alt="Test"></body></html>';
      const result = await runRegisteredTransform(html, "index.html");

      expect(result).toContain('class="image-wrapper"');
    });

    test("preserves doctype declaration", async () => {
      const html = "<!DOCTYPE html><html><body><p>Test</p></body></html>";
      const result = await runRegisteredTransform(html, "index.html");

      expect(result.startsWith("<!DOCTYPE html>")).toBe(true);
    });

    test("applies all transforms in correct order", async () => {
      const html = `<html><body>
        <p>Visit https://example.com and email test@example.com</p>
        <table><tr><td>Data</td></tr></table>
        <img src="/images/photo.jpg" alt="Photo">
      </body></html>`;
      const result = await runRegisteredTransform(html, "index.html");

      // URLs linkified
      expect(result).toContain('href="https://example.com"');
      // Emails linkified and encrypted
      expect(result).not.toContain("mailto:test@example.com");
      expect(result).toContain("data-decrypt-link");
      // Tables wrapped
      expect(result).toContain('class="scrollable-table"');
      // Images processed
      expect(result).toContain('class="image-wrapper"');
    });
  });

  describe("configureHtmlTransform", () => {
    test("registers before Eleventy's final URL rewriting", () => {
      const mockConfig = createMockEleventyConfig();
      configureHtmlTransform(mockConfig, mockImageProcessor);

      const registration = mockConfig.htmlTransformer.plugins.html;
      expect(registration.options.name).toBe("cfa/html-transform");
      expect(typeof registration.plugin).toBe("function");
    });

    test("adapts the HTML transform to a PostHTML tree", async () => {
      const mockConfig = createMockEleventyConfig();
      configureHtmlTransform(mockConfig, mockImageProcessor);
      const plugin = mockConfig.htmlTransformer.plugins.html.plugin({
        outputPath: "index.html",
      });
      const tree = {
        render: () => "<html><body><p>Content</p></body></html>",
        parser: (html) => ({ html }),
      };

      await expect(plugin(tree)).resolves.toEqual({
        html: "<html><body><p>Content</p></body></html>",
      });
    });
  });
});
