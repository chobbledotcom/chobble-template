/**
 * Type aliases for PagesCMS-validated data structures
 * Re-exports from pages-cms-generated.d.ts with shorter names for cleaner JSDoc annotations
 */

export type { PagesCMSSpec as Spec } from './pages-cms-generated.d.ts';
export type { PagesCMSFaq as Faq } from './pages-cms-generated.d.ts';
export type { PagesCMSTab as Tab } from './pages-cms-generated.d.ts';
export type { PagesCMSOption as Option } from './pages-cms-generated.d.ts';
export type { PagesCMSFilterAttribute as FilterAttribute } from './pages-cms-generated.d.ts';
export type { PagesCMSOpeningTime as OpeningTime } from './pages-cms-generated.d.ts';
export type { PagesCMSEleventyNavigation as EleventyNav, PagesCMSEleventyNavigation } from './pages-cms-generated.d.ts';
export type { PagesCMSSocial as Social } from './pages-cms-generated.d.ts';
export type { PagesCMSOrganization as Organization } from './pages-cms-generated.d.ts';
export type { PagesCMSImage as Image } from './pages-cms-generated.d.ts';

// =============================================================================
// Site Configuration Types (after defaults applied)
// =============================================================================

/**
 * Product image width configuration
 */
export type ProductConfig = {
  item_widths: string;
  gallery_thumb_widths: string;
  gallery_image_widths: string;
  header_image_widths: string;
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
export type CartMode = 'stripe' | 'paypal' | 'quote' | null;

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
  list_item_fields: string[];
  navigation_content_anchor: boolean;
  design_system_layouts: string[];
  products: ProductConfig;

  // Optional (may be null)
  contact_form_target: string | null;
  formspark_id: string | null;
  botpoison_public_key: string | null;
  chobble_link: string | null;
  map_embed_src: string | null;
  cart_mode: CartMode;
  checkout_api_url: string | null;
  product_mode: ProductMode;
  category_order: string[] | null;
  screenshots: ScreenshotConfig | null;
  form_target: string | null;
};

// =============================================================================
// Eleventy Collection Item Types
// =============================================================================

/**
 * Base data fields present on all collection items
 */
export type BaseItemData = {
  title?: string;
  name?: string;
  subtitle?: string;
  order?: number;
  tags?: string[];
  hidden?: boolean;
  no_index?: boolean;
  featured?: boolean;
  permalink?: string;
  eleventyNavigation?: PagesCMSEleventyNavigation;
  meta_description?: string;
  thumbnail?: PagesCMSImage;
  image?: PagesCMSImage;
};

/**
 * Product-specific data fields
 */
export type ProductItemData = BaseItemData & {
  options?: PagesCMSOption[];
  specs?: PagesCMSSpec[];
  faqs?: PagesCMSFaq[];
  tabs?: PagesCMSTab[];
  filter_attributes?: PagesCMSFilterAttribute[];
  categories?: string[];
  gallery?: PagesCMSImage[] | Record<string, PagesCMSImage>;
};

/**
 * Event-specific data fields
 */
export type EventItemData = BaseItemData & {
  event_date?: string;
  recurring_date?: string;
  event_location?: string;
  ical_url?: string;
};

/**
 * Review-specific data fields
 */
export type ReviewItemData = BaseItemData & {
  rating?: number;
  reviewer?: string;
  review_date?: string;
  product?: string;
  location?: string;
  event?: string;
};

/**
 * Property-specific data fields
 */
export type PropertyItemData = BaseItemData & {
  filter_attributes?: PagesCMSFilterAttribute[];
  specs?: PagesCMSSpec[];
};

/**
 * Location-specific data fields
 */
export type LocationItemData = BaseItemData & {
  opening_times?: PagesCMSOpeningTime[];
  address?: string;
  phone?: string;
  email?: string;
  parentLocation?: string;
};

/**
 * Team member data fields
 */
export type TeamItemData = BaseItemData & {
  role?: string;
  bio?: string;
};

/**
 * Eleventy collection item with PagesCMS-validated data
 * Represents items returned from collectionApi.getFilteredByTag()
 *
 * The data property uses a union of known content types.
 * For type narrowing, check item.data.tags or use type guards.
 */
export type EleventyCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: BaseItemData & Partial<ProductItemData & EventItemData & ReviewItemData & PropertyItemData & LocationItemData & TeamItemData>;
};

/**
 * Eleventy CollectionApi - passed to collection callbacks
 * getFilteredByTag always returns an array (empty if no matches)
 */
export type EleventyCollectionApi = {
  getFilteredByTag(tag: string): EleventyCollectionItem[];
};
