import { beforeEach, describe, expect, test } from "bun:test";
import { Liquid } from "liquidjs";
import {
  configureCachedBlock,
  createCachedBlockTag,
  resetCache,
} from "#eleventy/cached-block.js";

/**
 * Creates a mock liquid engine for testing the cachedBlock tag.
 */
const createMockEngine = (tokens = [], triggerEnd = false) => ({
  parser: {
    parseStream: () => {
      let tokenCallback = null;
      let endCallback = null;

      return {
        on(event, callback) {
          if (event === "token") tokenCallback = callback;
          if (event === "end") endCallback = callback;
          return this;
        },
        start() {
          if (triggerEnd && endCallback) {
            endCallback();
            return;
          }
          if (tokenCallback) {
            for (const token of tokens) {
              tokenCallback(token);
            }
          }
        },
        stop() {
          // no-op: mock stream stop
        },
      };
    },
    parseTokens: (toks) => toks,
  },
  evalValue: (expr) => expr,
  renderer: {
    renderTemplates: (templates) => templates.map((t) => t.value).join(""),
  },
});

/** Parses with a cached block tag and returns the resulting context. */
const parseWithTag = (tokens, args = "item.url") => {
  const tag = createCachedBlockTag(createMockEngine(tokens));
  const context = { tokens: [], keyExpression: "" };
  tag.parse.call(context, { args }, []);
  return context;
};

/** Creates a render test context with tag, emitter, and emitted array. */
const createRenderContext = () => {
  const emitted = [];
  return {
    tag: createCachedBlockTag(createMockEngine()),
    emitted,
    emitter: { write: (c) => emitted.push(c) },
  };
};

/** Runs a render cycle, returning the generator and intermediate result. */
const renderWithKey = (tag, emitter, value, key) => {
  const tagContext = { tokens: [{ value }], keyExpression: key };
  const gen = tag.render.call(tagContext, {}, emitter);
  gen.next();
  return { gen, result: gen.next(key) };
};

/**
 * Creates a mock engine for testing parseTokens behavior.
 * @param {Object} options
 * @param {boolean} options.mutateTokens - If true, clears tokens after parsing (simulates bug)
 */
const createTestMockEngine = ({ mutateTokens = false } = {}) => {
  const state = { parseCallCount: 0 };

  return {
    parser: {
      parseStream: () => ({
        on(event, callback) {
          return this;
        },
        start() {
          // no-op: mock stream start
        },
        stop() {
          // no-op: mock stream stop
        },
      }),
      parseTokens: (toks) => {
        state.parseCallCount++;
        const templates = toks.map((t) => ({ ...t, parsed: true }));
        if (mutateTokens) toks.length = 0;
        return templates;
      },
    },
    evalValue: (expr, ctx) => ctx.cacheKey,
    renderer: {
      renderTemplates: (templates, ctx) =>
        templates.map(() => `${ctx.item}-rendered`).join(""),
    },
    getParseCallCount: () => state.parseCallCount,
  };
};

/** Creates a mock engine that preserves tokens (normal behavior) */
const createRealisticMockEngine = () => createTestMockEngine();

/** Creates a mock engine that mutates tokens (simulates the bug scenario) */
const createMutatingMockEngine = () =>
  createTestMockEngine({ mutateTokens: true });

/**
 * Simulates how the tag is actually used in production:
 * - Parse phase: tokens are collected once
 * - Render phase: render() is called multiple times with different contexts
 *
 * @param {object} engine - Mock LiquidJS engine
 * @param {Array} items - Items to render
 * @param {boolean} useEngineRenderer - If true, use engine's renderTemplates result
 */
const simulateProductionUsage = (engine, items, useEngineRenderer = false) => {
  const tag = createCachedBlockTag(engine);

  // Parse phase - happens ONCE per tag in template
  const tagInstance = { tokens: [], keyExpression: "item.url" };
  // Simulate collecting tokens (in real usage, these come from template parsing)
  tagInstance.tokens = [{ value: "content" }];

  const emitted = [];
  const emitter = { write: (c) => emitted.push(c) };

  // Render phase - happens for EACH item in the loop
  for (const item of items) {
    const ctx = { cacheKey: item.url, item: item.name };
    const gen = tag.render.call(tagInstance, ctx, emitter);
    gen.next(); // Start generator, runs to first yield (evalValue)
    const afterKey = gen.next(item.url); // Provide cache key value

    // If not done, there's a second yield for renderTemplates (cache miss)
    if (!afterKey.done) {
      if (useEngineRenderer) {
        // The yield value from afterKey IS the result of renderTemplates
        // We need to pass it back in to complete the generator
        gen.next(afterKey.value);
      } else {
        gen.next(`${item.name}-rendered`); // Provide rendered content directly
      }
    }
  }

  return emitted;
};

describe("cached-block", () => {
  beforeEach(() => {
    resetCache();
  });

  describe("parse", () => {
    test("returns object with parse and render methods", () => {
      const tag = createCachedBlockTag(createMockEngine());

      expect(typeof tag.parse).toBe("function");
      expect(typeof tag.render).toBe("function");
    });

    test("stores keyExpression from tag arguments", () => {
      const context = parseWithTag([{ name: "endcachedBlock" }]);

      expect(context.keyExpression).toBe("item.url");
    });

    test("collects tokens until endcachedBlock", () => {
      const tokens = [
        { name: "html", value: "<li>" },
        { name: "tag", value: "include" },
        { name: "endcachedBlock" },
      ];
      const context = parseWithTag(tokens);

      expect(context.tokens.length).toBe(2);
      expect(context.tokens[0].name).toBe("html");
      expect(context.tokens[1].name).toBe("tag");
    });

    test("throws error if tag is not closed", () => {
      const tag = createCachedBlockTag(createMockEngine([], true));
      const context = { tokens: [], keyExpression: "" };

      expect(() => {
        tag.parse.call(context, { args: "item.url" }, []);
      }).toThrow("tag cachedBlock not closed");
    });
  });

  describe("render", () => {
    test("renders and emits content for new cache key", () => {
      const { tag, emitter, emitted } = createRenderContext();

      renderWithKey(tag, emitter, "Hello", "test-key").gen.next("Hello");

      expect(emitted).toEqual(["Hello"]);
    });

    test("returns cached content without re-rendering for same key", () => {
      const { tag, emitter, emitted } = createRenderContext();

      renderWithKey(tag, emitter, "First", "same-key").gen.next("First");
      const { result } = renderWithKey(tag, emitter, "Different", "same-key");

      expect(result.done).toBe(true);
      expect(emitted).toEqual(["First", "First"]);
    });

    test("caches different content for different keys", () => {
      const { tag, emitter, emitted } = createRenderContext();

      renderWithKey(tag, emitter, "A", "key-a").gen.next("A");
      renderWithKey(tag, emitter, "B", "key-b").gen.next("B");

      expect(emitted).toEqual(["A", "B"]);
    });

    test("resetCache clears cached content", () => {
      const { tag, emitter } = createRenderContext();

      renderWithKey(tag, emitter, "Original", "key").gen.next("Original");
      resetCache();

      const { result } = renderWithKey(tag, emitter, "New", "key");
      expect(result.done).toBe(false);
    });
  });

  describe("production-like usage with shared tokens", () => {
    test("renders unique content for each unique cache key", () => {
      const engine = createRealisticMockEngine();
      const items = [
        { url: "/product-a/", name: "Product A" },
        { url: "/product-b/", name: "Product B" },
        { url: "/product-c/", name: "Product C" },
      ];

      const emitted = simulateProductionUsage(engine, items);

      // Each product should render its own unique content
      expect(emitted).toEqual([
        "Product A-rendered",
        "Product B-rendered",
        "Product C-rendered",
      ]);
    });

    test("returns cached content when same item appears twice", () => {
      const engine = createRealisticMockEngine();
      const items = [
        { url: "/product-a/", name: "Product A" },
        { url: "/product-b/", name: "Product B" },
        { url: "/product-a/", name: "Product A (duplicate)" },
      ];

      const emitted = simulateProductionUsage(engine, items);

      // The third item should use cached content from first render
      expect(emitted).toEqual([
        "Product A-rendered",
        "Product B-rendered",
        "Product A-rendered", // cached from first render
      ]);
      // parseTokens should only be called ONCE (templates are cached per tag instance)
      expect(engine.getParseCallCount()).toBe(1);
    });

    test("parseTokens is called once per tag instance, not per cache key", () => {
      const engine = createRealisticMockEngine();
      const items = [
        { url: "/product-a/", name: "A" },
        { url: "/product-b/", name: "B" },
        { url: "/product-a/", name: "A" }, // duplicate
        { url: "/product-c/", name: "C" },
        { url: "/product-b/", name: "B" }, // duplicate
      ];

      simulateProductionUsage(engine, items);

      // parseTokens is now called ONCE per tag instance (templates are cached)
      // This is the correct behavior to avoid token mutation bugs
      expect(engine.getParseCallCount()).toBe(1);
    });
  });

  describe("cache key collision bugs", () => {
    /**
     * Test helper that renders items with a fixed cache key value.
     * When all items share the same key, only the first renders fresh.
     */
    const testCacheKeyCollision = (cacheKeyValue, itemNames) => {
      const engine = createRealisticMockEngine();
      engine.evalValue = () => cacheKeyValue;

      const tag = createCachedBlockTag(engine);
      const tagInstance = { tokens: [{ value: "x" }], keyExpression: "k" };
      const emitted = [];
      const emitter = { write: (c) => emitted.push(c) };

      for (const name of itemNames) {
        const ctx = { item: name };
        const gen = tag.render.call(tagInstance, ctx, emitter);
        gen.next();
        const afterKey = gen.next(cacheKeyValue);
        if (!afterKey.done) gen.next(`${name}-rendered`);
      }
      return emitted;
    };

    test("undefined cache keys cause all items to share same cache entry", () => {
      const emitted = testCacheKeyCollision(undefined, [
        "Product A",
        "Product B",
        "Product C",
      ]);

      // BUG: All items get the first item's cached content
      expect(emitted).toEqual([
        "Product A-rendered",
        "Product A-rendered",
        "Product A-rendered",
      ]);
    });

    test("empty string cache keys cause all items to share same cache entry", () => {
      const emitted = testCacheKeyCollision("", ["Product A", "Product B"]);
      expect(emitted).toEqual(["Product A-rendered", "Product A-rendered"]);
    });
  });

  describe("token mutation protection", () => {
    test("all items render correctly even when parseTokens mutates tokens", () => {
      // This test verifies that the fix works: even if parseTokens mutates
      // the tokens array, we only call it once and reuse the templates
      const engine = createMutatingMockEngine();
      const items = [
        { url: "/product-a/", name: "Product A" },
        { url: "/product-b/", name: "Product B" },
        { url: "/product-c/", name: "Product C" },
      ];

      // useEngineRenderer=true means we use what the engine actually renders
      const emitted = simulateProductionUsage(engine, items, true);

      // With the fix: all items render correctly because we only parse once
      expect(emitted[0]).toBe("Product A-rendered");
      expect(emitted[1]).toBe("Product B-rendered");
      expect(emitted[2]).toBe("Product C-rendered");
    });

    test("cached content and fresh renders both work with token mutation", () => {
      // Verify that both cache hits and cache misses work correctly
      const engine = createMutatingMockEngine();
      const items = [
        { url: "/product-a/", name: "Product A" }, // Parse tokens, cache
        { url: "/product-b/", name: "Product B" }, // Reuse templates, cache
        { url: "/product-a/", name: "Product A" }, // Cache HIT
      ];

      // useEngineRenderer=true means we use what the engine actually renders
      const emitted = simulateProductionUsage(engine, items, true);

      // All renders work correctly
      expect(emitted[0]).toBe("Product A-rendered");
      expect(emitted[1]).toBe("Product B-rendered");
      expect(emitted[2]).toBe("Product A-rendered"); // From cache
    });
  });

  describe("configureCachedBlock", () => {
    test("registers eleventy.before event and cachedBlock tag", () => {
      const registrations = { events: {}, tags: {} };
      const config = {
        on: (event, handler) => {
          registrations.events[event] = handler;
        },
        addLiquidTag: (name, factory) => {
          registrations.tags[name] = factory;
        },
      };

      configureCachedBlock(config);

      expect(registrations.events["eleventy.before"]).toBeDefined();
      expect(registrations.tags.cachedBlock).toBeDefined();
    });

    test("tag factory creates valid tag when called", () => {
      const registrations = { tags: {} };
      const config = {
        on: () => {
          // no-op: mock event handler
        },
        addLiquidTag: (name, factory) => {
          registrations.tags[name] = factory;
        },
      };

      configureCachedBlock(config);
      const tag = registrations.tags.cachedBlock(createMockEngine());

      expect(typeof tag.parse).toBe("function");
      expect(typeof tag.render).toBe("function");
    });
  });

  describe("real LiquidJS integration", () => {
    /** Creates a fresh Liquid instance with cachedBlock registered */
    const createLiquidWithCachedBlock = () => {
      resetCache();
      const liquid = new Liquid();
      liquid.registerTag("cachedBlock", createCachedBlockTag(liquid));
      return liquid;
    };

    test("renders content correctly for single item", async () => {
      const liquid = createLiquidWithCachedBlock();
      const template =
        "{% cachedBlock item.url %}{{ item.name }}{% endcachedBlock %}";
      const result = await liquid.parseAndRender(template, {
        item: { url: "/product-a/", name: "Product A" },
      });

      expect(result).toBe("Product A");
    });

    test("caches content for repeated renders with same key", async () => {
      const liquid = createLiquidWithCachedBlock();
      const template =
        "{% cachedBlock item.url %}{{ item.name }}{% endcachedBlock %}";

      // First render
      const result1 = await liquid.parseAndRender(template, {
        item: { url: "/product-a/", name: "Product A" },
      });

      // Second render with same URL but different name (should use cached)
      const result2 = await liquid.parseAndRender(template, {
        item: { url: "/product-a/", name: "Different Name" },
      });

      expect(result1).toBe("Product A");
      expect(result2).toBe("Product A"); // Should be cached, not "Different Name"
    });

    test("renders different content for different keys", async () => {
      const liquid = createLiquidWithCachedBlock();
      const template =
        "{% cachedBlock item.url %}{{ item.name }}{% endcachedBlock %}";

      const result1 = await liquid.parseAndRender(template, {
        item: { url: "/product-a/", name: "Product A" },
      });

      const result2 = await liquid.parseAndRender(template, {
        item: { url: "/product-b/", name: "Product B" },
      });

      expect(result1).toBe("Product A");
      expect(result2).toBe("Product B");
    });

    test("renders all items in a loop correctly", async () => {
      const liquid = createLiquidWithCachedBlock();
      const template =
        "{% for item in items %}{% cachedBlock item.url %}[{{ item.name }}]{% endcachedBlock %}{% endfor %}";

      const result = await liquid.parseAndRender(template, {
        items: [
          { url: "/a/", name: "A" },
          { url: "/b/", name: "B" },
          { url: "/c/", name: "C" },
        ],
      });

      expect(result).toBe("[A][B][C]");
    });

    test("handles filters inside cached block", async () => {
      const liquid = createLiquidWithCachedBlock();
      liquid.registerFilter("upcase", (v) => String(v).toUpperCase());

      const template =
        "{% for item in items %}{% cachedBlock item.url %}<li>{{ item.name | upcase }}</li>{% endcachedBlock %}{% endfor %}";

      const result = await liquid.parseAndRender(template, {
        items: [
          { url: "/a/", name: "apple" },
          { url: "/b/", name: "banana" },
          { url: "/c/", name: "cherry" },
        ],
      });

      expect(result).toBe("<li>APPLE</li><li>BANANA</li><li>CHERRY</li>");
    });

    test("cached content persists across separate template renders", async () => {
      const liquid = createLiquidWithCachedBlock();
      const template = "{% cachedBlock key %}{{ content }}{% endcachedBlock %}";

      // First render - cache this content
      const result1 = await liquid.parseAndRender(template, {
        key: "shared-key",
        content: "FIRST",
      });

      // Second render with same key but different content
      const result2 = await liquid.parseAndRender(template, {
        key: "shared-key",
        content: "SECOND",
      });

      // Third render with different key
      const result3 = await liquid.parseAndRender(template, {
        key: "different-key",
        content: "THIRD",
      });

      expect(result1).toBe("FIRST");
      expect(result2).toBe("FIRST"); // Should use cached value
      expect(result3).toBe("THIRD"); // Different key, new render
    });

    test("multiple items with same parsed template work correctly", async () => {
      const liquid = createLiquidWithCachedBlock();
      const parsed = liquid.parse(
        "{% for item in items %}{% cachedBlock item.url %}{{ item.name }}{% endcachedBlock %}{% endfor %}",
      );

      // Render the same parsed template multiple times
      const result1 = await liquid.render(parsed, {
        items: [
          { url: "/x/", name: "X" },
          { url: "/y/", name: "Y" },
        ],
      });

      // Reset cache to force re-rendering
      resetCache();

      const result2 = await liquid.render(parsed, {
        items: [
          { url: "/p/", name: "P" },
          { url: "/q/", name: "Q" },
        ],
      });

      expect(result1).toBe("XY");
      expect(result2).toBe("PQ");
    });
  });
});
