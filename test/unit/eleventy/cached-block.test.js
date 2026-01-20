import { beforeEach, describe, expect, test } from "bun:test";
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
        stop() {},
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
        on: () => {},
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
});
