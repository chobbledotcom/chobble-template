/**
 * Site configuration types
 *
 * Types for site-wide configuration after defaults are applied.
 */

/**
 * Product configuration
 */
export type ProductConfig = {
  item_list_aspect_ratio: string | null;
  max_images: number | null;
};

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
 * Cart mode - determines checkout behavior
 */
export type CartMode = 'stripe' | 'quote' | null;

/**
 * Product mode - buy or hire
 */
export type ProductMode = 'buy' | 'hire' | null;

/**
 * Site configuration after defaults are applied.
 * Values with defaults in DEFAULTS are guaranteed non-null.
 */
export type SiteConfig = {
  // Guaranteed by DEFAULTS (never null after config loading)
  sticky_mobile_nav: boolean;
  horizontal_nav: boolean;
  collapse_mobile_menu: boolean;
  homepage_news: boolean;
  homepage_products: boolean;
  externalLinksTargetBlank: boolean;
  template_repo_url: string;
  has_products_filter: boolean;
  has_properties_filter: boolean;
  placeholder_images: boolean;
  enable_theme_switcher: boolean;
  timezone: string;
  reviews_truncate_limit: number;
  rating_stars_uses_svg: boolean;
  list_item_fields: string[];
  navigation_content_anchor: boolean;
  design_system_layouts: string[];
  default_image_widths: number[];
  currency: string;
  default_max_quantity: number;
  search_collections: string[];
  guide_page_order: string[];
  guide_category_order: string[];
  products: ProductConfig;

  // Optional (may be null)
  contact_form_target: string | null;
  formspark_id: string | null;
  botpoison_public_key: string | null;
  chobble_link: string | null;
  map_embed_src: string | null;
  cart_mode: CartMode;
  ecommerce_api_host: string | null;
  product_mode: ProductMode;
  category_order: string[] | null;
  screenshots: ScreenshotConfig | null;
  form_target: string | null;

  // Derived (computed from other config values)
  internal_link_suffix: string;
};

/**
 * Site info from site.json
 */
export type SiteInfo = {
  url: string;
  name: string;
  logo?: string;
};
