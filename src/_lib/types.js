/**
 * Shared type definitions for the Chobble Template project.
 *
 * Import types in other files using:
 * @example
 * /** @typedef {import("#lib/types.js").EleventyCollectionItem} EleventyCollectionItem *\/
 */

// =============================================================================
// Eleventy Core Types
// =============================================================================

/**
 * @typedef {Object} EleventyPageData
 * @property {string} url - Page URL path
 * @property {string} fileSlug - File slug (filename without extension)
 * @property {Date} [date] - Page date
 */

/**
 * @typedef {Object} EleventyNavigation
 * @property {number} [order] - Navigation order
 * @property {string} [key] - Navigation key
 */

/**
 * @typedef {Object} EleventyCollectionItemData
 * @property {number} [order] - Sort order
 * @property {string} [title] - Item title
 * @property {string} [name] - Item name (fallback)
 * @property {boolean} [hidden] - Whether item is hidden
 * @property {EleventyNavigation} [eleventyNavigation] - Navigation data
 * @property {FilterAttribute[]} [filter_attributes] - Filter attributes
 * @property {string[]} [categories] - Category references
 * @property {string} [permalink] - Custom permalink
 */

/**
 * @typedef {Object} EleventyCollectionItem
 * @property {EleventyCollectionItemData & Record<string, unknown>} data - Item data from frontmatter
 * @property {string} url - Item URL
 * @property {Date} [date] - Item date
 */

// =============================================================================
// Site Configuration Types
// =============================================================================

/**
 * @typedef {Object} SiteInfo
 * @property {string} url - Base site URL
 * @property {string} name - Site name
 * @property {string} [logo] - Site logo path
 */

// =============================================================================
// Filter System Types
// =============================================================================

/**
 * @typedef {Object} FilterAttribute
 * @property {string} name - Attribute name
 * @property {string} value - Attribute value
 */

/**
 * @typedef {Record<string, string>} FilterSet
 */

/**
 * @typedef {Object} FilterCombination
 * @property {FilterSet} filters - Filter key-value pairs
 * @property {string} path - URL path segment
 * @property {number} count - Number of matching items
 */

/**
 * @typedef {Object} FilterAttributeData
 * @property {Record<string, string[]>} attributes - Attribute name to possible values
 * @property {Record<string, string>} displayLookup - Slug to display text lookup
 */

/**
 * @typedef {Object} FilterOption
 * @property {string} value - Display value
 * @property {string} url - Filter URL
 * @property {boolean} active - Whether option is active
 */

/**
 * @typedef {Object} FilterGroup
 * @property {string} name - Group attribute name
 * @property {string} label - Display label
 * @property {FilterOption[]} options - Available options
 */

/**
 * @typedef {Object} ActiveFilter
 * @property {string} key - Display key
 * @property {string} value - Display value
 * @property {string} removeUrl - URL to remove this filter
 */

/**
 * @typedef {Object} FilterUIData
 * @property {boolean} hasFilters - Whether any filters exist
 * @property {boolean} [hasActiveFilters] - Whether any filters are active
 * @property {ActiveFilter[]} [activeFilters] - Currently active filters
 * @property {string} [clearAllUrl] - URL to clear all filters
 * @property {FilterGroup[]} [groups] - Filter groups for UI
 */

/**
 * @typedef {Object} FilterConfigOptions
 * @property {string} tag - Eleventy collection tag
 * @property {string} permalinkDir - Base permalink directory
 * @property {string} itemsKey - Key for items in page data
 * @property {{ pages: string, redirects: string, attributes: string }} collections - Collection names
 * @property {string} uiDataFilterName - Filter name for UI data
 */

// =============================================================================
// Image Processing Types
// =============================================================================

/**
 * @typedef {Object} ImageProps
 * @property {string} [logName] - Debug logging name
 * @property {string | null} imageName - Image src (string from shortcode, string|null from DOM getAttribute)
 * @property {string | null} alt - Alt text
 * @property {string | null} [classes] - CSS classes
 * @property {string | null} [sizes] - Responsive sizes attribute
 * @property {string | string[] | null} [widths] - Image widths to generate
 * @property {boolean} [returnElement] - Return Element instead of HTML string
 * @property {string | null} [aspectRatio] - Target aspect ratio
 * @property {string | null} [loading] - Loading attribute
 * @property {Document | null} [document] - DOM document for element creation
 */

/**
 * @typedef {Object} ComputeImageProps
 * @property {string | null} imageName - Image src
 * @property {string | null} alt - Alt text
 * @property {string | null} [classes] - CSS classes
 * @property {string | null} [sizes] - Responsive sizes attribute
 * @property {string | string[] | null} [widths] - Image widths to generate
 * @property {string | null} [aspectRatio] - Target aspect ratio
 * @property {string | null} [loading] - Loading attribute
 */

/**
 * @typedef {Object} ImageTransformOptions
 * @property {string} logName - Debug logging name
 * @property {string | null} imageName - Image src from getAttribute (string | null)
 * @property {string | null} alt - Alt text from getAttribute
 * @property {string | null} classes - CSS classes from getAttribute
 * @property {string | null} sizes - Responsive sizes from getAttribute
 * @property {string | null} widths - Image widths from getAttribute
 * @property {string | null} aspectRatio - Aspect ratio from custom attribute
 * @property {null} loading - Always null from transform
 * @property {true} returnElement - Always true for transform
 * @property {Document} document - DOM document for element creation
 */

/**
 * @typedef {(options: ImageTransformOptions) => Promise<Element>} ProcessImageFn
 */

// =============================================================================
// Product Types
// =============================================================================

/**
 * @typedef {Object} ProductOption
 * @property {string} name - Option name
 * @property {string | number} unit_price - Unit price
 * @property {number} [days] - Hire duration in days
 * @property {number} [max_quantity] - Maximum quantity
 * @property {string} [sku] - Stock keeping unit
 */

/**
 * @typedef {Object} ProductSpec
 * @property {string} name - Specification name
 * @property {string} value - Specification value
 */

/**
 * @typedef {Object} ProductData
 * @property {ProductOption[]} [options] - Product options
 * @property {string} title - Product title
 */

/**
 * @typedef {Object} CartAttributesParams
 * @property {string} title - Product title
 * @property {string} subtitle - Product subtitle
 * @property {ProductOption[]} options - Processed options
 * @property {ProductSpec[]} [specs] - Product specifications
 * @property {string} mode - Product mode (hire, buy, etc.)
 */

// =============================================================================
// Schema.org Types
// =============================================================================

/**
 * @typedef {Object} FAQ
 * @property {string} question - FAQ question
 * @property {string} answer - FAQ answer
 */

/**
 * @typedef {Object} SchemaOrgMeta
 * @property {string} [url] - Canonical URL
 * @property {string} [title] - Title
 * @property {string} [description] - Description
 * @property {{ src: string }} [image] - Image info
 * @property {FAQ[]} [faq] - FAQ items
 * @property {string} [name] - Name
 * @property {string} [brand] - Brand name
 * @property {Record<string, unknown>} [offers] - Offer data
 * @property {Record<string, unknown>[]} [reviews] - Review data
 * @property {Record<string, unknown>} [rating] - Rating data
 * @property {string} [datePublished] - Published date
 * @property {Record<string, unknown>} [author] - Author info
 * @property {Record<string, unknown>} [publisher] - Publisher info
 * @property {Record<string, unknown>} [organization] - Organization info
 */

// =============================================================================
// DOM Types
// =============================================================================

/**
 * @typedef {Record<string, string | null | undefined>} ElementAttributes
 */

/**
 * @typedef {string | Element | Element[] | null} ElementChildren
 */

/**
 * @typedef {import('happy-dom').Window} HappyDOMWindow
 */

/**
 * @typedef {Object} DOM
 * @property {HappyDOMWindow} window - Happy-DOM window instance
 * @property {() => string} serialize - Serialize to HTML string
 */

// =============================================================================
// Memoization Types
// =============================================================================

/**
 * @template {unknown[]} Args
 * @template R
 * @typedef {Object} MemoizeOptions
 * @property {(args: Args) => string | number} [cacheKey] - Custom cache key function
 */

// Export empty object to make this a module
export {};
