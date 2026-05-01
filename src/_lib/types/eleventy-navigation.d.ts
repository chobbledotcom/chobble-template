/**
 * Ambient declaration for @11ty/eleventy-navigation.
 *
 * The upstream package ships no declarations. We only use the default
 * export (the plugin function); the collection-item shape produced by
 * its filter lives in `./navigation.d.ts` alongside the other
 * Chobble-specific types.
 */

declare module "@11ty/eleventy-navigation" {
  const plugin: (eleventyConfig: unknown, options?: unknown) => void;
  export default plugin;
}
