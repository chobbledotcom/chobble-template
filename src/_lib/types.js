/**
 * Shared type definitions for the Chobble Template project.
 *
 * Import types in other files using JSDoc typedef with import syntax.
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
 * @property {string} [subtitle] - Item subtitle
 * @property {boolean} [hidden] - Whether item is hidden
 * @property {boolean} [no_index] - Exclude from search index
 * @property {boolean} [featured] - Whether item is featured
 * @property {EleventyNavigation} [eleventyNavigation] - Navigation data
 * @property {FilterAttribute[]} [filter_attributes] - Filter attributes
 * @property {string[]} [categories] - Category references
 * @property {string} [permalink] - Custom permalink
 * @property {string} [meta_description] - Meta description
 * @property {string[]} [tags] - Content tags
 * @property {Image} [thumbnail] - Thumbnail image
 * @property {Image} [image] - Main image
 * @property {Option[]} [options] - Product options
 * @property {ProductSpec[]} [specs] - Specifications
 * @property {Faq[]} [faqs] - FAQs
 * @property {Tab[]} [tabs] - Tabs
 * @property {Image[] | Record<string, Image>} [gallery] - Image gallery
 * @property {string} [event_date] - Event date
 * @property {string} [recurring_date] - Recurring event date
 * @property {string} [event_location] - Event location
 * @property {string} [ical_url] - iCal URL
 * @property {number} [rating] - Review rating
 * @property {string} [reviewer] - Reviewer name
 * @property {string} [review_date] - Review date
 * @property {string} [product] - Related product slug
 * @property {string} [location] - Related location slug
 * @property {string} [event] - Related event slug
 * @property {OpeningTime[]} [opening_times] - Opening times
 * @property {string} [address] - Address
 * @property {string} [phone] - Phone number
 * @property {string} [email] - Email address
 * @property {string} [role] - Team member role
 * @property {string} [bio] - Team member bio
 * @property {string} [parentLocation] - Parent location slug (for nested locations)
 */

/**
 * @typedef {Object} EleventyCollectionItem
 * @property {EleventyCollectionItemData} data - Item data from frontmatter
 * @property {string} url - Item URL
 * @property {string} fileSlug - File slug (filename without extension)
 * @property {Date} [date] - Item date
 */

/**
 * Eleventy Collection API interface
 * @typedef {Object} EleventyCollectionApi
 * @property {(tag: string) => EleventyCollectionItem[]} getFilteredByTag - Get items by tag
 * @property {() => EleventyCollectionItem[]} getAll - Get all collection items
 */

// =============================================================================
// Content Types (from PagesCMS schema)
// =============================================================================

/**
 * Image object from PagesCMS
 * @typedef {Object} Image
 * @property {string} [path] - Image path
 * @property {string} [alt] - Alt text
 */

/**
 * FAQ item
 * @typedef {Object} Faq
 * @property {string} question - FAQ question
 * @property {string} answer - FAQ answer
 */

/**
 * Tab content item
 * @typedef {Object} Tab
 * @property {string} title - Tab title
 * @property {string} [image] - Tab image
 * @property {string} body - Tab body content
 */

/**
 * Opening time entry
 * @typedef {Object} OpeningTime
 * @property {string} day - Day of the week
 * @property {string} hours - Opening hours
 */

/**
 * Product option (alias used in some files)
 * @typedef {Object} Option
 * @property {string} name - Option name
 * @property {string | number} unit_price - Unit price
 * @property {number} [days] - Hire duration in days
 * @property {number} [max_quantity] - Maximum quantity
 * @property {string} [sku] - Stock keeping unit
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

/**
 * @typedef {Object} ProductConfig
 * @property {string} item_widths - Item image widths
 * @property {string} gallery_thumb_widths - Gallery thumbnail widths
 * @property {string} gallery_image_widths - Gallery image widths
 * @property {string} header_image_widths - Header image widths
 * @property {string | null} item_list_aspect_ratio - Item list aspect ratio
 * @property {number | null} max_images - Maximum images to show
 */

/**
 * @typedef {Object} ScreenshotConfig
 * @property {boolean} [enabled] - Whether screenshots are enabled
 * @property {boolean} [autoCapture] - Auto capture on build
 * @property {string[]} [collections] - Collections to screenshot
 * @property {string[]} [pages] - Specific pages to screenshot
 * @property {string} [outputDir] - Output directory
 * @property {number} [port] - Server port
 * @property {string} [viewport] - Viewport size
 * @property {number} [timeout] - Timeout in ms
 * @property {number} [limit] - Limit number of screenshots
 */

/**
 * @typedef {'stripe' | 'paypal' | 'quote' | null} CartMode
 */

/**
 * @typedef {'buy' | 'hire' | null} ProductMode
 */

/**
 * Site configuration after defaults are applied.
 * Values with defaults in DEFAULTS are guaranteed non-null.
 * @typedef {Object} SiteConfig
 * @property {boolean} sticky_mobile_nav - Enable sticky mobile nav
 * @property {boolean} horizontal_nav - Enable horizontal nav
 * @property {boolean} homepage_news - Show news on homepage
 * @property {boolean} homepage_products - Show products on homepage
 * @property {boolean} externalLinksTargetBlank - Open external links in new tab
 * @property {string} template_repo_url - Template repository URL
 * @property {boolean} has_products_filter - Enable products filter
 * @property {boolean} has_properties_filter - Enable properties filter
 * @property {boolean} placeholder_images - Use placeholder images
 * @property {boolean} enable_theme_switcher - Enable theme switcher
 * @property {string} timezone - Site timezone
 * @property {number} reviews_truncate_limit - Reviews truncate limit
 * @property {string[]} list_item_fields - Fields to show in list items
 * @property {boolean} navigation_content_anchor - Add content anchor to nav
 * @property {string[]} design_system_layouts - Design system layouts
 * @property {ProductConfig} products - Product configuration
 * @property {string | null} contact_form_target - Contact form target URL
 * @property {string | null} formspark_id - Formspark ID
 * @property {string | null} botpoison_public_key - Botpoison public key
 * @property {string | null} chobble_link - Chobble link
 * @property {string | null} map_embed_src - Map embed source
 * @property {CartMode} cart_mode - Cart mode
 * @property {string | null} checkout_api_url - Checkout API URL
 * @property {ProductMode} product_mode - Product mode
 * @property {string[] | null} category_order - Category display order
 * @property {ScreenshotConfig | null} screenshots - Screenshot configuration
 * @property {string | null} form_target - Computed form target URL
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
 * @property {string} imageName - Image src (always string: shortcode provides string, transform selector guarantees it)
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
 * @property {string} imageName - Image src (always string after validation)
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
 * @property {string} imageName - Image src (guaranteed by selector [src^="/images/"])
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
 * @typedef {(options: ImageTransformOptions) => Promise<string | Element>} ProcessImageFn
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
 * @property {string} [subtitle] - Product subtitle (optional in frontmatter)
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
