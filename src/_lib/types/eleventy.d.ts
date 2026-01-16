/**
 * Eleventy types
 *
 * Types for Eleventy's collection system and page data.
 */

import type {
  PagesCMSEleventyNavigation,
  PagesCMSImage,
  PagesCMSOption,
  PagesCMSSpec,
  PagesCMSFaq,
  PagesCMSTab,
  PagesCMSFilterAttribute,
  PagesCMSOpeningTime,
} from './pages-cms-generated.d.ts';

/**
 * Eleventy page data (url, fileSlug, date)
 */
export type EleventyPageData = {
  url: string;
  fileSlug: string;
  date?: Date;
};

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
 * Union of all collection item data types
 */
export type EleventyCollectionItemData = BaseItemData &
  Partial<
    ProductItemData &
      EventItemData &
      ReviewItemData &
      PropertyItemData &
      LocationItemData &
      TeamItemData
  >;

/**
 * Eleventy collection item
 * Represents items returned from collectionApi.getFilteredByTag()
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
