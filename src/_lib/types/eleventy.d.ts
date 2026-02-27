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
  PagesCMSOption,
  PagesCMSSpec,
  PagesCMSFaq,
  PagesCMSFilterAttribute,
  PagesCMSOpeningTime,
} from './pages-cms-generated.d.ts';
import type { RawTab, EleventyNav } from './content.d.ts';

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
  title: string;
  name?: string;
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
  /** Header image path */
  header_image?: string;
};

/**
 * Product-specific data fields
 */
export type ProductItemData = BaseItemData & {
  /** Product options (sizes, variants, etc.). Defaults to [] via products.json */
  options: PagesCMSOption[];
  /** Standalone price field (used when options is empty). May contain currency symbols. */
  price?: string | number;
  /** Product specifications */
  specs?: PagesCMSSpec[];
  /** Frequently asked questions */
  faqs?: PagesCMSFaq[];
  /** Additional content tabs (body may be undefined before eleventyComputed) */
  tabs?: RawTab[];
  /** Filter attributes for faceted search. Defaults to [] via products.json */
  filter_attributes: PagesCMSFilterAttribute[];
  /** Category slugs this product belongs to */
  categories: string[];
  /** Gallery image paths */
  gallery: string[];
  /** Event slugs this product is associated with */
  events?: string[];
  /** Search keywords for this product (guaranteed [] by 11tydata boundary) */
  keywords: string[];
};

/**
 * Category-specific data fields
 */
export type CategoryItemData = BaseItemData & {
  /** Menu slugs this category belongs to */
  menus?: string[];
  /** Parent category slug for hierarchical categories */
  parent?: string;
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
  /** Event location description */
  event_location?: string;
  /** iCal URL */
  ical_url?: string;
};

/**
 * Review-specific data fields
 */
export type ReviewItemData = BaseItemData & {
  /** Rating (typically 1-5) */
  rating?: number;
  /** Reviewer name */
  reviewer?: string;
  /** Review date */
  review_date?: string;
  /** Product slugs this review is for */
  products?: string[];
  /** Category slugs this review is for */
  categories?: string[];
  /** Property slugs this review is for */
  properties?: string[];
};

/**
 * Property-specific data fields
 */
export type PropertyItemData = BaseItemData & {
  /** Filter attributes for faceted search */
  filter_attributes?: PagesCMSFilterAttribute[];
  /** Property specifications */
  specs?: PagesCMSSpec[];
  /** Location slugs this property belongs to */
  locations: string[];
  /** Gallery image paths */
  gallery: string[];
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
  >;

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
export type EleventyComputedData = Omit<EleventyCollectionItemData, 'title'> & {
  title: string;
  page: EleventyPageData;
  site: import('./config.d.ts').SiteInfo;
  config?: import('./config.d.ts').SiteConfig;
  header_image?: string;
  header_text?: string;
  meta_title?: string;
  description?: string;
  snippet?: string;
  layout?: string;
  /** Computed metadata for schema.org (empty object if not defined) */
  metaComputed?: Record<string, unknown>;
  /** Design system blocks for block-based content */
  blocks?: Array<{ type: string; [key: string]: unknown }>;
  /** Video embeds with computed thumbnail_url */
  videos?: Array<{ id: string; title: string; thumbnail_url?: string | null }>;
};
