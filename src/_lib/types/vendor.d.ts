/**
 * Shorthand ambient declarations for vendor packages that ship no types.
 * Imports from these modules type as `any`; give a package a real body
 * (like eleventy-dev-server.d.ts does) when a typed surface earns its keep.
 *
 * Build Awesome (Eleventy v4) ships real types for its configuration API at
 * `@awesome.me/buildawesome/UserConfig` (used across the configurators); only
 * the main-module named exports below still need an ambient.
 */

declare module "@awesome.me/buildawesome" {
  export const EleventyHtmlBasePlugin: unknown;
  export const RenderPlugin: unknown;
}
declare module "@11ty/eleventy-img";
declare module "@11ty/eleventy-plugin-rss";
declare module "@quasibit/eleventy-plugin-schema";
declare module "markdown-it";
