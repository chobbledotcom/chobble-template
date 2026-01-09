/**
 * @fileoverview PagesCMS validation types
 *
 * These types represent data that has been validated by PagesCMS.
 * They document which fields are guaranteed to exist by the schema (.pages.yml),
 * allowing removal of defensive null/undefined checks.
 *
 * Pattern:
 * - PagesCMS* types: What the schema guarantees (required fields)
 * - EleventyItem & PagesCMS*: Complete type including Eleventy metadata
 */

/**
 * Spec object as validated by PagesCMS
 * @typedef {Object} PagesCMSSpec
 * @property {string} name - Required by schema (pages.yml line 137)
 * @property {string} value - Required by schema (pages.yml line 138)
 */
export interface PagesCMSSpec {
  name: string;
  value: string;
}

/**
 * Product option as validated by PagesCMS
 * @typedef {Object} PagesCMSProductOption
 * @property {string} name - Required by schema (pages.yml line 89)
 * @property {number} unit_price - Required by schema (pages.yml line 97)
 * @property {number} [max_quantity] - Optional (pages.yml line 90-93, has default: 10)
 * @property {number} [days] - Optional, for hire products (pages.yml line 98)
 */
export interface PagesCMSProductOption {
  name: string;
  unit_price: number;
  max_quantity?: number;
  days?: number;
  sku?: string;
}

/**
 * Filter attribute as validated by PagesCMS
 * @typedef {Object} PagesCMSFilterAttribute
 * @property {string} name - Required by schema (pages.yml line 110)
 * @property {string} value - Required by schema (pages.yml line 111)
 */
export interface PagesCMSFilterAttribute {
  name: string;
  value: string;
}

/**
 * FAQ as validated by PagesCMS (used across multiple collections)
 * @typedef {Object} PagesCMSFaq
 * @property {string} question - Required by schema (pages.yml line 51, 125, etc.)
 * @property {string} answer - Required by schema (pages.yml line 52, 126, etc.)
 */
export interface PagesCMSFaq {
  question: string;
  answer: string;
}

/**
 * Tab object as validated by PagesCMS
 * @typedef {Object} PagesCMSTab
 * @property {string} title - Required by schema (pages.yml line 144)
 * @property {string} body - Required by schema (pages.yml line 150)
 */
export interface PagesCMSTab {
  title: string;
  body: string;
}

/**
 * Opening times as validated by PagesCMS (site configuration)
 * @typedef {Object} PagesCMSOpeningTime
 * @property {string} day - Required by schema (pages.yml line 650)
 * @property {string} hours - Required by schema (pages.yml line 651)
 */
export interface PagesCMSOpeningTime {
  day: string;
  hours: string;
}

/**
 * Mapping of collection names to their PagesCMS-validated data
 *
 * This helps identify which collections have guaranteed schema validation
 * and thus where defensive null checks can be removed.
 *
 * Use this when accessing collection data that has passed PagesCMS validation.
 */
export interface PagesCMSCollections {
  // Specs appear in: products (line 132), properties (line 452)
  specs: PagesCMSSpec[];

  // Product options appear in: products (line 84)
  options: PagesCMSProductOption[];

  // Filter attributes appear in: products (line 105)
  filter_attributes: PagesCMSFilterAttribute[];

  // FAQs appear across all collections (lines 46, 120, 174, 216, 269, 300, 337, 382, 441, 482, 515, 552, 592)
  faqs: PagesCMSFaq[];

  // Tabs appear in: products (line 139)
  tabs: PagesCMSTab[];

  // Opening times appear in: site config (line 645)
  opening_times: PagesCMSOpeningTime[];
}

/**
 * Eleventy collection item data that has been validated by PagesCMS
 *
 * When accessing properties that PagesCMS guarantees as required,
 * you can safely remove defensive checks.
 *
 * Example:
 * - BAD (over-defensive):   spec?.name?.toLowerCase()
 * - GOOD (with PagesCMS):   spec.name.toLowerCase()
 *
 * The optional chaining is only needed for arrays/objects that don't
 * have `required: true` in .pages.yml
 */
export interface EleventyItemData {
  // Properties that may exist depending on the collection
  [key: string]: unknown;
}

/**
 * Helper to extract validated fields from item data
 *
 * @example
 * // When you know specs exist (from the template context)
 * import type { PagesCMSSpec } from "#lib/types/pages-cms";
 * const specs: PagesCMSSpec[] = item.data.specs;
 * // Now you can safely access spec.name without optional chaining
 */
