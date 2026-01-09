import { describe, expect, test } from "bun:test";
import { configureCapture } from "#eleventy/capture.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

describe("capture", () => {
  test("Registers paired shortcode and shortcode", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    expect(typeof config.shortcodes.push).toBe("function");
    expect(typeof config.shortcodes.slot).toBe("function");
  });

  test("Registers eleventy.before event handler", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    expect(typeof config.eventHandlers["eleventy.before"]).toBe("function");
  });

  test("Push captures content for a named slot", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const mockContext = { page: { inputPath: "/test.html" } };

    const pushResult = pushFn.call(mockContext, "<div>Test Content</div>", "templates");
    expect(pushResult).toBe("");

    const slotResult = slotFn.call(mockContext, "templates");
    expect(slotResult).toBe("<div>Test Content</div>");
  });

  test("Multiple pushes accumulate content", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const mockContext = { page: { inputPath: "/test.html" } };

    pushFn.call(mockContext, "<div>First</div>", "templates");
    pushFn.call(mockContext, "<div>Second</div>", "templates");
    pushFn.call(mockContext, "<div>Third</div>", "templates");

    const result = slotFn.call(mockContext, "templates");
    expect(result).toBe("<div>First</div><div>Second</div><div>Third</div>");
  });

  test("Slot returns empty string for non-existent slot", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const slotFn = config.shortcodes.slot;
    const mockContext = { page: { inputPath: "/test.html" } };

    const result = slotFn.call(mockContext, "nonexistent");
    expect(result).toBe("");
  });

  test("Pages are isolated from each other", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const page1 = { page: { inputPath: "/page1.html" } };
    const page2 = { page: { inputPath: "/page2.html" } };

    pushFn.call(page1, "Content 1", "slot");
    pushFn.call(page2, "Content 2", "slot");

    expect(slotFn.call(page1, "slot")).toBe("Content 1");
    expect(slotFn.call(page2, "slot")).toBe("Content 2");
  });

  test("Different slots on same page are independent", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const mockContext = { page: { inputPath: "/test.html" } };

    pushFn.call(mockContext, "Header content", "header");
    pushFn.call(mockContext, "Footer content", "footer");

    expect(slotFn.call(mockContext, "header")).toBe("Header content");
    expect(slotFn.call(mockContext, "footer")).toBe("Footer content");
  });

  test("State resets on eleventy.before event", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;
    const resetFn = config.eventHandlers["eleventy.before"];

    const mockContext = { page: { inputPath: "/test.html" } };

    // Push content
    pushFn.call(mockContext, "Original content", "templates");
    expect(slotFn.call(mockContext, "templates")).toBe("Original content");

    // Reset
    resetFn();

    // After reset, slot should be empty
    expect(slotFn.call(mockContext, "templates")).toBe("");
  });

  test("Push returns empty string (doesn't leak content)", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const mockContext = { page: { inputPath: "/test.html" } };

    const result = pushFn.call(mockContext, "<div>Content</div>", "templates");
    expect(result).toBe("");
  });

  test("Handles empty content", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const mockContext = { page: { inputPath: "/test.html" } };

    pushFn.call(mockContext, "", "templates");
    const result = slotFn.call(mockContext, "templates");
    expect(result).toBe("");
  });

  test("Handles whitespace-only content", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const mockContext = { page: { inputPath: "/test.html" } };

    pushFn.call(mockContext, "   \n  \t  ", "templates");
    const result = slotFn.call(mockContext, "templates");
    expect(result).toBe("   \n  \t  ");
  });

  test("Preserves HTML structure in content", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const mockContext = { page: { inputPath: "/test.html" } };

    const complexHtml = `
      <template id="test">
        <div class="item" data-attr="value">
          <h2>Title</h2>
          <p>Description with "quotes" and 'apostrophes'</p>
        </div>
      </template>
    `;

    pushFn.call(mockContext, complexHtml, "templates");
    const result = slotFn.call(mockContext, "templates");
    expect(result).toBe(complexHtml);
  });

  test("Multiple pages can use same slot name independently", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;

    const page1 = { page: { inputPath: "/products/index.html" } };
    const page2 = { page: { inputPath: "/services/index.html" } };
    const page3 = { page: { inputPath: "/about/index.html" } };

    pushFn.call(page1, "Products templates", "templates");
    pushFn.call(page2, "Services templates", "templates");
    pushFn.call(page3, "About templates", "templates");

    expect(slotFn.call(page1, "templates")).toBe("Products templates");
    expect(slotFn.call(page2, "templates")).toBe("Services templates");
    expect(slotFn.call(page3, "templates")).toBe("About templates");
  });

  test("Slot before any push returns empty string", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const slotFn = config.shortcodes.slot;
    const mockContext = { page: { inputPath: "/new-page.html" } };

    // Try to get slot before any push
    const result = slotFn.call(mockContext, "templates");
    expect(result).toBe("");
  });

  test("Reset and re-use works correctly", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    const pushFn = config.pairedShortcodes.push;
    const slotFn = config.shortcodes.slot;
    const resetFn = config.eventHandlers["eleventy.before"];

    const mockContext = { page: { inputPath: "/test.html" } };

    // First build
    pushFn.call(mockContext, "Build 1", "templates");
    expect(slotFn.call(mockContext, "templates")).toBe("Build 1");

    // Reset
    resetFn();

    // Second build
    pushFn.call(mockContext, "Build 2", "templates");
    expect(slotFn.call(mockContext, "templates")).toBe("Build 2");
  });
});
