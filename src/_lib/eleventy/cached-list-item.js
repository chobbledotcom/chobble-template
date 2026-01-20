/**
 * Cached list-item rendering for Eleventy.
 *
 * Memoizes list-item.html output per item URL, dramatically reducing
 * redundant template renders when the same product appears on multiple
 * pages (e.g., category pages, filtered pages, featured sections).
 *
 * Uses a custom Liquid tag that skips rendering on cache hit.
 * Cache key: item.url (unique per item)
 * Cache lifetime: Single build (reset via eleventy.before hook)
 */

// Module-level cache, reset per build
let listItemCache = null;

const resetCache = () => {
  listItemCache = new Map();
};

/**
 * Create a custom Liquid tag that caches block content.
 * Unlike paired shortcodes, this can skip rendering entirely on cache hit.
 *
 * Usage: {% cachedBlock item.url %}...{% endcachedBlock %}
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
    if (!listItemCache) listItemCache = new Map();

    // Evaluate the cache key expression
    const cacheKey = yield liquidEngine.evalValue(this.keyExpression, ctx);

    // Check cache first - if hit, output cached content and skip rendering
    if (listItemCache.has(cacheKey)) {
      emitter.write(listItemCache.get(cacheKey));
      return;
    }

    // Parse and render the block content to a string (no emitter = returns string)
    const templates = liquidEngine.parser.parseTokens(this.tokens);
    const content = yield liquidEngine.renderer.renderTemplates(templates, ctx);

    // Cache the rendered content
    listItemCache.set(cacheKey, content);

    // Output the content
    emitter.write(content);
  },
});

/**
 * Configure the cached block tag.
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
export const configureCachedListItem = (eleventyConfig) => {
  eleventyConfig.on("eleventy.before", resetCache);

  eleventyConfig.addLiquidTag("cachedBlock", (liquidEngine) =>
    createCachedBlockTag(liquidEngine),
  );
};

// Export for testing
export { resetCache, createCachedBlockTag };
