/**
 * Cached block rendering for Eleventy.
 *
 * A generic caching mechanism for Liquid templates. Memoizes block content
 * by a user-provided cache key, skipping re-rendering when the same key
 * is encountered again during a build.
 *
 * Use cases:
 * - List items that appear on multiple pages (products, events, news)
 * - Expensive template fragments that don't change per-page
 * - Any content where the output is deterministic based on a key
 *
 * Usage: {% cachedBlock someUniqueKey %}...{% endcachedBlock %}
 *
 * Cache lifetime: Single build (reset via eleventy.before hook)
 */

// Module-level cache, reset per build
let blockCache = null;

const resetCache = () => {
  blockCache = new Map();
};

/**
 * Create a custom Liquid tag that caches block content.
 * Unlike paired shortcodes, this can skip rendering entirely on cache hit.
 *
 * @example
 * // Cache a list item by URL
 * {% cachedBlock item.url %}{% include "list-item.html" %}{% endcachedBlock %}
 *
 * // Cache an expensive component by ID
 * {% cachedBlock "sidebar-" | append: category.slug %}...{% endcachedBlock %}
 *
 * @param {object} liquidEngine - The Liquid engine instance
 * @returns {object} Liquid tag definition
 */
const createCachedBlockTag = (liquidEngine) => ({
  parse(tagToken, remainTokens) {
    // Parse the cache key expression from tag arguments
    this.keyExpression = tagToken.args;

    // Collect tokens until we hit endcachedBlock
    this.tokens = [];
    const stream = liquidEngine.parser
      .parseStream(remainTokens)
      .on("token", (token) => {
        if (token.name === "endcachedBlock") {
          stream.stop();
        } else {
          this.tokens.push(token);
        }
      })
      .on("end", () => {
        throw new Error("tag cachedBlock not closed");
      });
    stream.start();
  },

  *render(ctx, emitter) {
    if (!blockCache) blockCache = new Map();

    // Evaluate the cache key expression
    const cacheKey = yield liquidEngine.evalValue(this.keyExpression, ctx);

    // Check cache first - if hit, output cached content and skip rendering
    if (blockCache.has(cacheKey)) {
      emitter.write(blockCache.get(cacheKey));
      return;
    }

    // Parse and render the block content to a string (no emitter = returns string)
    const templates = liquidEngine.parser.parseTokens(this.tokens);
    const content = yield liquidEngine.renderer.renderTemplates(templates, ctx);

    // Cache the rendered content
    blockCache.set(cacheKey, content);

    // Output the content
    emitter.write(content);
  },
});

/**
 * Configure the cachedBlock Liquid tag.
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
export const configureCachedBlock = (eleventyConfig) => {
  eleventyConfig.on("eleventy.before", resetCache);

  eleventyConfig.addLiquidTag("cachedBlock", (liquidEngine) =>
    createCachedBlockTag(liquidEngine),
  );
};

// Export for testing
export { resetCache, createCachedBlockTag };
