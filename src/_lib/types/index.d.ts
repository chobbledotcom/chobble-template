/**
 * Chobble Template Type Definitions
 *
 * Central export for all type definitions.
 * Import from '#lib/types' to access any type.
 */

// =============================================================================
// Configuration Types
// =============================================================================
export type {
  ProductConfig,
  ScreenshotConfig,
  CartMode,
  ProductMode,
  SiteConfig,
  SiteInfo,
} from './config.d.ts';

// =============================================================================
// Eleventy Types
// =============================================================================
export type {
  // Page data
  EleventyPageData,
  EleventyNavigation,
  EleventyComputedData,
  EleventyCollectionApi,

  // Base types
  BaseItemData,

  // Specific item data types
  ProductItemData,
  CategoryItemData,
  EventItemData,
  ReviewItemData,
  PropertyItemData,
  LocationItemData,
  TeamItemData,
  NewsItemData,
  MenuItemData,
  MenuCategoryItemData,

  // Specific collection item types (preferred for type safety)
  ProductCollectionItem,
  CategoryCollectionItem,
  EventCollectionItem,
  ReviewCollectionItem,
  PropertyCollectionItem,
  LocationCollectionItem,
  TeamCollectionItem,
  NewsCollectionItem,
  MenuItemCollectionItem,
  MenuCategoryCollectionItem,

  // Backward compatible types (deprecated)
  EleventyCollectionItemData,
  EleventyCollectionItem,
} from './eleventy.d.ts';

// =============================================================================
// Content Types (from PagesCMS + extensions)
// =============================================================================
export type {
  // Short names
  Spec,
  Faq,
  Tab,
  Option,
  FilterAttribute,
  OpeningTime,
  EleventyNav,
  Social,
  Organization,
  Image,
  Block,
  // PagesCMS prefixed names
  PagesCMSEleventyNavigation,
  PagesCMSImage,
  PagesCMSOption,
  PagesCMSSpec,
  PagesCMSFaq,
  PagesCMSTab,
  PagesCMSFilterAttribute,
  PagesCMSOpeningTime,
  // Extended types
  ProductOption,
  ProductSpec,
  ProductData,
  CartAttributesParams,
} from './content.d.ts';

// =============================================================================
// Filter System Types
// =============================================================================
export type {
  FilterSet,
  FilterCombination,
  FilterAttributeData,
  FilterOption,
  FilterGroup,
  ActiveFilter,
  FilterUIData,
  FilterConfigOptions,
} from './filters.d.ts';

// =============================================================================
// Media/Image Types
// =============================================================================
export type {
  ImageProps,
  ComputeImageProps,
  ImageTransformOptions,
  ProcessImageFn,
} from './media.d.ts';

// =============================================================================
// DOM Types
// =============================================================================
export type {
  ElementAttributes,
  ElementChildren,
  HappyDOMWindow,
  DOM,
} from './dom.d.ts';

// =============================================================================
// Schema.org Types
// =============================================================================
export type { SchemaOrgMeta } from './schema.d.ts';

// =============================================================================
// Utility Types
// =============================================================================
export type { MemoizeOptions } from './utils.d.ts';

// =============================================================================
// HTML Tokenizer Types
// =============================================================================
export type {
  HtmlAttribute,
  CharsToken,
  CommentToken,
  StartTagToken,
  EndTagToken,
  DoctypeToken,
  HtmlToken,
  HtmlTokenType,
  TokenTransformFn,
} from './html-tokenizer.d.ts';
