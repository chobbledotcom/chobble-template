/**
 * Eleventy types
 *
 * Types for Eleventy's collection system and page data.
 *
 * Design principles:
 * - Fields guaranteed by Eleventy are non-optional (e.g., `tags` is always an array)
 * - Fields from frontmatter that may be absent use `?:`
 * - Specific collection item types (e.g., ProductCollectionItem) reduce need for defensive code
 */

import type {
  PagesCMSImage,
  PagesCMSSpec,
  PagesCMSFaq,
  PagesCMSFilterAttribute,
  PagesCMSOpeningTime,
} from './pages-cms-generated.d.ts';
import type { EleventyNav } from './content.d.ts';

/**
 * Eleventy page data (url, fileSlug, date, inputPath)
 */
export type EleventyPageData = {
  url: string;
  fileSlug: string;
  date?: Date;
  inputPath: string;
};

/**
 * Base data fields present on all collection items.
 * Fields guaranteed by Eleventy are non-optional.
 */
export type BaseItemData = {
  name: string;
  /** Subtitle for display */
  subtitle?: string;
  /** Sort order (lower numbers first) */
  order?: number;
  /**
   * Tags array - guaranteed by Eleventy to be an array (empty if unset).
   * Using `string[]` instead of `string[] | undefined` eliminates `?? []` patterns.
   */
  tags: string[];
  /** Whether item is hidden from listings */
  hidden?: boolean;
  /** Whether item should be excluded from search/index */
  no_index?: boolean;
  /** Whether item is featured */
  featured?: boolean;
  /** Custom permalink */
  permalink?: string;
  /** Eleventy navigation configuration */
  eleventyNavigation?: EleventyNav;
  /** Meta description for SEO */
  meta_description?: string;
  /** Thumbnail image path */
  thumbnail?: string;
  /** Main image path */
  image?: string;
  /** Frequently asked questions */
  faqs?: PagesCMSFaq[];
};

/**
 * One option of a product: a size or variant to buy, or a length of hire.
 */
export type ProductOption = {
  /** Option name, e.g. "Large" or "Weekend" */
  name: string;
  /** Price of one of this option */
  unit_price: number;
  /** Days of hire this option prices; set on every option of a hire product */
  days?: number;
};

/**
 * What a product's add-to-quote button carries. See #utils/quote-item.js.
 */
export type QuoteItem = {
  name: string;
  /** Most of the product one quote may hold */
  max_quantity?: number;
  /** True when the product is hired by the day */
  hire: boolean;
  /** Hire prices keyed by days; empty for a product that is bought */
  hire_prices: Record<number, number>;
  /** The choices the button offers: label, name in the quote, price */
  options: { label: string; name: string; unit_price: number }[];
};

/**
 * Product-specific data fields
 */
export type ProductItemData = BaseItemData & {
  /** What a visitor can add to a quote */
  options?: ProductOption[];
  /** Most of the product one quote may hold */
  max_quantity?: number;
  /** Computed from options; null for a product without any */
  quote_item: QuoteItem | null;
  /** If true, the product is left out of the products collection */
  hidden?: boolean;
};

/**
 * Category-specific data fields
 */
export type CategoryItemData = BaseItemData & {
  /** Menu slugs this category belongs to */
  menus?: string[];
  /** Parent category slug for hierarchical categories */
  parent?: string;
  /** Explicit product references for this category */
  products?: {product: string}[];
  /** Search keywords for this category (guaranteed [] by 11tydata boundary) */
  keywords: string[];
};

/**
 * Event-specific data fields
 */
export type EventItemData = BaseItemData & {
  /** Event date (ISO string) */
  event_date?: string;
  /** Recurring date pattern */
  recurring_date?: string;
  /** Event time, free-text (e.g. "10:00am – 5:00pm") */
  event_time?: string;
  /** Event location description */
  event_location?: string;
  /** iCal URL */
  ical_url?: string;
  /** Explicit product references for this event */
  products?: {product: string}[];
};

/**
 * Review-specific data fields
 */
export type ReviewItemData = BaseItemData & {
  /** Reviewer name */
  name: string;
  /** Rating from 1 to 5 */
  rating: number;
  /** Where the review was written, e.g. "google" */
  source?: string;
  /** Link to the review where it was written */
  url?: string;
  /** Site path of the reviewer's photo, e.g. "/images/reviewers/x.webp" */
  avatar?: string;
  /** If true, the review is left out of the reviews collection */
  hidden?: boolean;
};

/**
 * Property-specific data fields
 */
export type PropertyItemData = BaseItemData & {
  /** Filter attributes for faceted search */
  filter_attributes?: PagesCMSFilterAttribute[];
  /** Location slugs this property belongs to */
  locations: string[];
  /** Gallery image paths */
  gallery: string[];
  /** Property-specific Formspark ID (overrides global form target) */
  formspark_id?: string;
};

/**
 * Location-specific data fields
 */
export type LocationItemData = BaseItemData & {
  /** Opening times */
  opening_times?: PagesCMSOpeningTime[];
  /** Address */
  address?: string;
  /** Phone number */
  phone?: string;
  /** Email address */
  email?: string;
  /** Parent location slug for hierarchical locations */
  parentLocation?: string;
};

/**
 * Team member data fields
 */
export type TeamItemData = BaseItemData & {
  /** Sort order (guaranteed by eleventyComputed, defaults to 9999) */
  order: number;
  /** Job title/role */
  role?: string;
  /** Biography */
  bio?: string;
};

/**
 * News/blog post data fields
 */
export type NewsItemData = BaseItemData & {
  /** Publication date (from Eleventy's date) */
  date?: Date;
};

/**
 * Menu item data fields (for restaurant menus, etc.)
 */
export type MenuItemData = BaseItemData & {
  /** Menu categories this item belongs to */
  menu_categories?: string[];
  /** Stock keeping unit for cart/checkout integration */
  sku?: string;
  /** Display price (may contain currency symbols, e.g. "£14.50") */
  price?: string | number;
  /** Description shown alongside the item */
  description?: string;
  /** Per-item override for the cart's maximum line quantity */
  max_quantity?: number | null;
};

/**
 * Menu category data fields
 */
export type MenuCategoryItemData = BaseItemData & {
  /** Menu slugs this category belongs to */
  menus?: string[];
};

/**
 * Guide category data fields
 */
export type GuideCategoryItemData = BaseItemData & {
  /** Property slug this guide category is linked to */
  property?: string;
};

// =============================================================================
// Specific Collection Item Types
// These eliminate defensive code by providing precise typing per collection.
// Defined explicitly (not with generics) for better JSDoc compatibility.
// =============================================================================

/** Product collection item - use with products collection */
export type ProductCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: ProductItemData;
};

/** Category collection item - use with categories collection */
export type CategoryCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: CategoryItemData;
};

/** Event collection item - use with events collection */
export type EventCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: EventItemData;
};

/** Review collection item - use with reviews collection */
export type ReviewCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: ReviewItemData;
};

/** Property collection item - use with properties collection */
export type PropertyCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: PropertyItemData;
};

/** Location collection item - use with locations collection */
export type LocationCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: LocationItemData;
};

/** Team collection item - use with team collection */
export type TeamCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: TeamItemData;
};

/** News collection item - use with news collection */
export type NewsCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: NewsItemData;
};

/** Menu item collection item - use with menu_items collection */
export type MenuItemCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: MenuItemData;
};

/** Menu category collection item - use with menu_categories collection */
export type MenuCategoryCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: MenuCategoryItemData;
};

/** Guide category collection item - use with guide-categories collection */
export type GuideCategoryCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: GuideCategoryItemData;
};

// =============================================================================
// Generic Collection Types
// =============================================================================

/**
 * Union of all collection item data types.
 * Prefer specific data types (ProductItemData, EventItemData, etc.)
 * for better type safety. This union makes all fields optional.
 */
export type EleventyCollectionItemData = BaseItemData &
  Partial<
    ProductItemData &
      CategoryItemData &
      EventItemData &
      ReviewItemData &
      PropertyItemData &
      LocationItemData &
      TeamItemData &
      NewsItemData &
      MenuItemData &
      MenuCategoryItemData &
      GuideCategoryItemData
  > & {
    /** Any other frontmatter keys Eleventy passes through untouched. */
    [key: string]: unknown;
  };

/**
 * Generic Eleventy collection item.
 * Prefer specific types (ProductCollectionItem, etc.) for better type safety.
 */
export type EleventyCollectionItem = {
  url: string;
  fileSlug: string;
  date?: Date;
  data: EleventyCollectionItemData;
};

/**
 * Eleventy CollectionApi - passed to collection callbacks
 * getFilteredByTag always returns an array (empty if no matches)
 */
export type EleventyCollectionApi = {
  getFilteredByTag(tag: string): EleventyCollectionItem[];
  getAll(): EleventyCollectionItem[];
};

/**
 * Eleventy navigation data
 */
export type EleventyNavigation = {
  order?: number;
  key?: string;
};

/**
 * Page data available to eleventyComputed functions.
 * Combines Eleventy's page object with frontmatter data.
 */
export type EleventyComputedData = EleventyCollectionItemData & {
  page: EleventyPageData;
  site: import('./config.d.ts').SiteInfo;
  config?: import('./config.d.ts').SiteConfig;
  meta_title?: string;
  description?: string;
  snippet?: string;
  layout?: string;
  /** Schema.org type override (e.g. "organization" for contact pages) */
  schema_type?: string;
  /** Computed metadata for schema.org (empty object if not defined) */
  metaComputed?: Record<string, unknown>;
  /** Design system blocks for block-based content */
  blocks?: Array<{ type: string; [key: string]: unknown }>;
  /** Marks the page whose blocks are generated from the canonical
   * per-type examples - see `#utils/block-gallery.js` */
  block_gallery?: boolean;
  /** Every language the site publishes, from `_data/languages.json` */
  languages?: import('./utils.d.ts').Language[];
  /** Pages that say the same thing, from `_data/translations.json` */
  translations?: Array<Record<string, string>>;
};
