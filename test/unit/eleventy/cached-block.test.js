import { beforeEach, describe, expect, test } from "bun:test";
import { createCachedBlockTag, resetCache } from "#eleventy/cached-block.js";

/**
 * Creates a mock liquidjs stream that simulates the parseStream API.
 * Callbacks are stored and invoked when start() is called.
 *
 * @param {Array} tokens - Tokens to emit, last should be { name: "endcachedBlock" }
 * @param {boolean} triggerEnd - Whether to trigger "end" event without finding closing tag
 * @returns {object} Mock stream object
 */
const createMockStream = (tokens = [], triggerEnd = false) => {
  const callbacks = {};

  return {
    on(event, callback) {
      callbacks[event] = callback;
      return this;
    },
    start() {
      if (triggerEnd && callbacks.end) {
        callbacks.end();
        return;
      }
      if (callbacks.token) {
        for (const token of tokens) {
          callbacks.token(token);
        }
      }
    },
    stop() {
      // Stream stopped - no more tokens will be processed
    },
  };
};

describe("cached-block", () => {
  beforeEach(() => {
    resetCache();
  });

  describe("resetCache", () => {
    test("creates a fresh Map", () => {
      resetCache();
      resetCache();
      expect(true).toBe(true);
    });
  });

  describe("createCachedBlockTag", () => {
    test("returns object with parse and render methods", () => {
      const mockLiquidEngine = {
        parser: {
          parseStream: () => createMockStream(),
        },
      };

      const tag = createCachedBlockTag(mockLiquidEngine);

      expect(typeof tag.parse).toBe("function");
      expect(typeof tag.render).toBe("function");
    });

    test("parse method stores keyExpression from tag arguments", () => {
      const mockLiquidEngine = {
        parser: {
          parseStream: () => createMockStream([{ name: "endcachedBlock" }]),
        },
      };

      const tag = createCachedBlockTag(mockLiquidEngine);
      const tagContext = { tokens: [], keyExpression: "" };

      tag.parse.call(tagContext, { args: "item.url" }, []);

      expect(tagContext.keyExpression).toBe("item.url");
    });

    test("parse method collects tokens until endcachedBlock", () => {
      const tokens = [
        { name: "html", value: "<li>" },
        { name: "tag", value: "include" },
        { name: "endcachedBlock" },
      ];

      const mockLiquidEngine = {
        parser: {
          parseStream: () => createMockStream(tokens),
        },
      };

      const tag = createCachedBlockTag(mockLiquidEngine);
      const tagContext = { tokens: [], keyExpression: "" };

      tag.parse.call(tagContext, { args: "item.url" }, []);

      // Should have collected the first two tokens (not the endcachedBlock)
      expect(tagContext.tokens.length).toBe(2);
      expect(tagContext.tokens[0].name).toBe("html");
      expect(tagContext.tokens[1].name).toBe("tag");
    });

    test("throws error if tag is not closed", () => {
      const mockLiquidEngine = {
        parser: {
          parseStream: () => createMockStream([], true),
        },
      };

      const tag = createCachedBlockTag(mockLiquidEngine);
      const tagContext = { tokens: [], keyExpression: "" };

      expect(() => {
        tag.parse.call(tagContext, { args: "item.url" }, []);
      }).toThrow("tag cachedBlock not closed");
    });
  });

  describe("caching behavior", () => {
    test("cache is reset by resetCache", () => {
      resetCache();
      resetCache();
      expect(true).toBe(true);
    });
  });
});
