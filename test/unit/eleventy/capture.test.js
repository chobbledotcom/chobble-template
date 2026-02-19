import { describe, expect, test } from "bun:test";
import { configureCapture } from "#eleventy/capture.js";
import { createMockEleventyConfig } from "#test/test-utils.js";

// Helper to create fresh config with reset state
const setupCapture = () => {
  const config = createMockEleventyConfig();
  configureCapture(config);

  // Reset state from any previous tests
  config.eventHandlers["eleventy.before"]();

  return {
    push: config.pairedShortcodes.push,
    slot: config.shortcodes.slot,
    reset: config.eventHandlers["eleventy.before"],
  };
};

describe("capture", () => {
  test("Slot before reset returns empty string", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);
    const ctx = { page: { inputPath: "/pre-reset.html" } };

    const result = config.shortcodes.slot.call(ctx, "templates");
    expect(result).toBe("");
  });

  test("First push initializes slots without reset", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);
    const ctx = { page: { inputPath: "/pre-reset.html" } };

    config.pairedShortcodes.push.call(ctx, "Init content", "templates");
    const result = config.shortcodes.slot.call(ctx, "templates");
    expect(result).toBe("Init content");
  });

  test("Registers paired shortcode and shortcode", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    expect(typeof config.pairedShortcodes.push).toBe("function");
    expect(typeof config.shortcodes.slot).toBe("function");
  });

  test("Registers eleventy.before event handler", () => {
    const config = createMockEleventyConfig();
    configureCapture(config);

    expect(typeof config.eventHandlers["eleventy.before"]).toBe("function");
  });

  test("Push captures content for a named slot", () => {
    const { push, slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    const pushResult = push.call(ctx, "<div>Test Content</div>", "templates");
    expect(pushResult).toBe("");

    const slotResult = slot.call(ctx, "templates");
    expect(slotResult).toBe("<div>Test Content</div>");
  });

  test("Multiple pushes accumulate content", () => {
    const { push, slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    push.call(ctx, "<div>First</div>", "templates");
    push.call(ctx, "<div>Second</div>", "templates");
    push.call(ctx, "<div>Third</div>", "templates");

    const result = slot.call(ctx, "templates");
    expect(result).toBe("<div>First</div><div>Second</div><div>Third</div>");
  });

  test("Slot returns empty string for non-existent slot", () => {
    const { slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    const result = slot.call(ctx, "nonexistent");
    expect(result).toBe("");
  });

  test("Pages are isolated from each other", () => {
    const { push, slot } = setupCapture();

    const page1 = { page: { inputPath: "/page1.html" } };
    const page2 = { page: { inputPath: "/page2.html" } };

    push.call(page1, "Content 1", "slot");
    push.call(page2, "Content 2", "slot");

    expect(slot.call(page1, "slot")).toBe("Content 1");
    expect(slot.call(page2, "slot")).toBe("Content 2");
  });

  test("Different slots on same page are independent", () => {
    const { push, slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    push.call(ctx, "Header content", "header");
    push.call(ctx, "Footer content", "footer");

    expect(slot.call(ctx, "header")).toBe("Header content");
    expect(slot.call(ctx, "footer")).toBe("Footer content");
  });

  test("State resets on eleventy.before event", () => {
    const { push, slot, reset } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    push.call(ctx, "Original content", "templates");
    expect(slot.call(ctx, "templates")).toBe("Original content");

    reset();

    expect(slot.call(ctx, "templates")).toBe("");
  });

  test("Push returns empty string", () => {
    const { push } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    const result = push.call(ctx, "<div>Content</div>", "templates");
    expect(result).toBe("");
  });

  test("Handles empty content", () => {
    const { push, slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    push.call(ctx, "", "templates");
    const result = slot.call(ctx, "templates");
    expect(result).toBe("");
  });

  test("Handles whitespace-only content", () => {
    const { push, slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    push.call(ctx, "   \n  \t  ", "templates");
    const result = slot.call(ctx, "templates");
    expect(result).toBe("   \n  \t  ");
  });

  test("Preserves HTML structure in content", () => {
    const { push, slot } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    const complexHtml = `
      <template id="test">
        <div class="item" data-attr="value">
          <h2>Title</h2>
          <p>Description with "quotes" and 'apostrophes'</p>
        </div>
      </template>
    `;

    push.call(ctx, complexHtml, "templates");
    const result = slot.call(ctx, "templates");
    expect(result).toBe(complexHtml);
  });

  test("Multiple pages can use same slot name independently", () => {
    const { push, slot } = setupCapture();

    const page1 = { page: { inputPath: "/products/index.html" } };
    const page2 = { page: { inputPath: "/services/index.html" } };
    const page3 = { page: { inputPath: "/about/index.html" } };

    push.call(page1, "Products templates", "templates");
    push.call(page2, "Services templates", "templates");
    push.call(page3, "About templates", "templates");

    expect(slot.call(page1, "templates")).toBe("Products templates");
    expect(slot.call(page2, "templates")).toBe("Services templates");
    expect(slot.call(page3, "templates")).toBe("About templates");
  });

  test("Slot before any push returns empty string", () => {
    const { slot } = setupCapture();
    const ctx = { page: { inputPath: "/new-page.html" } };

    const result = slot.call(ctx, "templates");
    expect(result).toBe("");
  });

  test("Reset and re-use works correctly", () => {
    const { push, slot, reset } = setupCapture();
    const ctx = { page: { inputPath: "/test.html" } };

    push.call(ctx, "Build 1", "templates");
    expect(slot.call(ctx, "templates")).toBe("Build 1");

    reset();

    push.call(ctx, "Build 2", "templates");
    expect(slot.call(ctx, "templates")).toBe("Build 2");
  });
});
