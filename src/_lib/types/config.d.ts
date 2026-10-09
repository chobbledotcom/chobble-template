/**
 * Site configuration types
 *
 * Types for site-wide configuration after defaults are applied.
 */

/**
 * Screenshot configuration (optional feature)
 */
export type ScreenshotConfig = {
  enabled?: boolean;
  autoCapture?: boolean;
  collections?: string[];
  pages?: string[];
  outputDir?: string;
  port?: number;
  viewport?: string;
  timeout?: number;
  limit?: number;
};

/**
 * Site configuration after defaults are applied. Every setting, its default,
 * and its accepted values are declared in #config/config-schema.js; keep this
 * type in step with it.
 */
export type SiteConfig = {
  // Guaranteed by the schema defaults (never null after config loading)
  sticky_mobile_nav: boolean;
  horizontal_nav: boolean;
  collapse_menu: "mobile" | "always" | "never";
  language_switcher: "footer" | "header";
  show_breadcrumbs: boolean;
  externalLinksTargetBlank: boolean;
  placeholder_images: boolean;
  enable_theme_switcher: boolean;
  list_item_fields: string[];
  navigation_content_anchor: boolean;
  nav_thumbnails: boolean;
  search_collections: string[];
  linkify_urls: boolean;
  disable_liquid_cache: boolean;

  // {} when unset; pickNonNull strips null overrides
  screenshots: ScreenshotConfig;

  // Optional (may be null)
  homepage_footer_markdown: string | null;

  // Digit count of phone numbers to linkify; 0 (the default) disables it
  phoneNumberLength: number;

  // Derived (computed from other config values)
  internal_link_suffix: string;
};

/**
 * Site info from site.json. Every field is declared in
 * #config/site-schema.js; keep this type in step with it.
 */
export type SiteInfo = {
  url: string;
  name: string;
  description: string;
  logo?: string;
  socials?: Record<string, string>;
  cms_config?: Record<string, unknown>;
};
