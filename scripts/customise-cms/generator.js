/**
 * YAML generator for .pages.yml
 *
 * Generates the complete .pages.yml configuration based on user selections
 * using proper YAML serialization
 */

import YAML from "yaml";
import pageLayouts from "#data/pageLayouts.js";
import { getCollection } from "#scripts/customise-cms/collections.js";
import {
  COMMON_FIELDS,
  createAddOnsField,
  createEleventyNavigationField,
  createMarkdownField,
  createObjectListField,
  createReferenceField,
  createTabsField,
  FAQS_FIELD,
  FEATURES_FIELD,
  FILTER_ATTRIBUTES_FIELD,
  GALLERY_FIELD,
  getBodyField,
  KEYWORDS_FIELD,
  PRODUCT_OPTIONS_FIELD,
  SPECS_FIELD,
  VIDEOS_FIELD,
} from "#scripts/customise-cms/fields.js";
import {
  compact,
  filter,
  filterMap,
  memberOf,
  pipe,
} from "#toolkit/fp/array.js";
import { BLOCK_CMS_FIELDS } from "#utils/block-schema.js";

/**
 * @typedef {import('./config.js').CmsConfig} CmsConfig
 * @typedef {import('./fields.js').CmsField} CmsField
 * @typedef {import('./collections.js').CollectionDefinition} CollectionDefinition
 */

/**
 * Common meta fields added to most collections
 * @type {CmsField[]}
 */
const META_FIELDS = [COMMON_FIELDS.meta_title, COMMON_FIELDS.meta_description];

/**
 * @typedef {Object} FieldContext
 * @property {CmsField} body - Body field (code or rich-text based on config)
 * @property {CmsField} tabs - Tabs field with appropriate body type
 * @property {(label: string) => CmsField} bodyWithLabel - Create body field with custom label
 */

/**
 * Create precomputed fields based on visual editor setting
 * @param {boolean} useVisualEditor - Whether to use rich-text editor
 * @returns {FieldContext} Precomputed field context
 */
const createFieldContext = (useVisualEditor) => {
  const body = getBodyField(useVisualEditor);
  return {
    body,
    tabs: createTabsField(useVisualEditor),
    bodyWithLabel: (label) => ({ ...body, label }),
  };
};

/**
 * Get optional header fields based on config
 * @param {CmsConfig} config - CMS configuration
 * @returns {(false | CmsField)[]} Header fields or false values to be compacted
 */
const getHeaderFields = (config) => [
  config.features.header_images && COMMON_FIELDS.header_image,
  config.features.header_images && COMMON_FIELDS.header_text,
];

/**
 * Get common trailing content fields (subtitle, body, header_text, meta)
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {(false | CmsField)[]} Content fields with optional header_text
 */
const getContentFields = (config, fields) => [
  COMMON_FIELDS.subtitle,
  fields.body,
  config.features.header_images && COMMON_FIELDS.header_text,
  ...META_FIELDS,
];

/**
 * Top of every item: title, subtitle, thumbnail, order
 * @returns {CmsField[]}
 */
const getItemTop = () => [
  COMMON_FIELDS.title,
  COMMON_FIELDS.subtitle,
  COMMON_FIELDS.thumbnail,
  COMMON_FIELDS.order,
];

/**
 * Bottom of every item: body, header_image, header_text (if enabled), meta
 * @param {CmsConfig} config
 * @param {FieldContext} fields - Precomputed fields
 * @returns {(false | CmsField)[]}
 */
const getItemBottom = (config, fields) => [
  fields.body,
  config.features.header_images && COMMON_FIELDS.header_image,
  config.features.header_images && COMMON_FIELDS.header_text,
  ...META_FIELDS,
];

/**
 * Build fields with an "enabled" helper that checks if a collection is enabled
 * @param {(enabled: (name: string) => boolean) => (false | CmsField)[]} buildFn
 * @returns {(config: CmsConfig) => CmsField[]}
 */
const withEnabled = (buildFn) => (config) =>
  pipe(memberOf, buildFn, compact)(config.collections);

/**
 * Build fields for an item (top, [middle], bottom)
 * @param {(enabled: (name: string) => boolean) => (false | CmsField)[]} middle
 * @returns {(config: CmsConfig, fields: FieldContext) => CmsField[]}
 */
const buildItem = (middle) => (config, fields) =>
  withEnabled((enabled) => [
    ...getItemTop(),
    ...middle(enabled),
    ...getItemBottom(config, fields),
  ])(config);

/**
 * @typedef {Object} ViewConfig
 * @property {string[]} fields - Fields to display in list view
 * @property {string} primary - Primary display field
 * @property {string[]} sort - Fields to sort by
 */

/**
 * @typedef {Object} CollectionConfig
 * @property {string} name - Collection name
 * @property {string} label - Display label
 * @property {string} path - Content path
 * @property {string} type - Config type ("collection" | "file")
 * @property {boolean} [subfolders] - Enable subfolders
 * @property {string} [filename] - Filename template
 * @property {ViewConfig} [view] - View configuration
 * @property {CmsField[]} fields - Field configurations
 */

/**
 * @typedef {Object} PagesConfig
 * @property {Object} media - Media configuration
 * @property {Object} settings - Settings configuration
 * @property {CollectionConfig[]} content - Content configurations
 */

/**
 * Helper function to conditionally include header image/text
 * @param {CmsConfig} config - CMS configuration
 * @param {...(CmsField | CmsField[])} fields - Fields to include if header_images enabled
 * @returns {CmsField[]} Fields if header_images is enabled, empty array otherwise
 */
const withHeaderFields = (config, ...fields) =>
  config.features.header_images
    ? [...fields.flatMap((f) => (Array.isArray(f) ? f : [f]))]
    : [];

/**
 * Field builders for each collection type - functions that accept config and fields
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {Record<string, () => CmsField[]>} Map of collection names to field builder functions
 */
const getCollectionFieldBuilders = (config, fields) => ({
  pages: () =>
    compact([
      ...withHeaderFields(
        config,
        COMMON_FIELDS.header_image,
        COMMON_FIELDS.header_text,
      ),
      COMMON_FIELDS.subtitle,
      fields.body,
      COMMON_FIELDS.meta_title,
      COMMON_FIELDS.meta_description,
      createEleventyNavigationField(config.features.external_navigation_urls),
      { name: "layout", type: "string" },
      config.features.no_index && COMMON_FIELDS.no_index,
      config.features.videos && VIDEOS_FIELD,
    ]),

  categories: () => {
    const enabled = memberOf(config.collections);
    return compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      config.features.parent_categories &&
        createReferenceField("parent", "Parent Category", "categories", false),
      productsRefList(enabled),
      fields.body,
      config.features.below_products &&
        createMarkdownField(
          "below_products",
          "Below Products Description",
          config.features.use_visual_editor,
        ),
      COMMON_FIELDS.featured,
      config.features.keywords && KEYWORDS_FIELD,
      ...getHeaderFields(config),
      ...META_FIELDS,
      COMMON_FIELDS.subtitle,
    ]);
  },

  team: () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      COMMON_FIELDS.order,
      { name: "snippet", type: "string", label: "Role" },
      { name: "image", type: "image", label: "Profile Image" },
      config.features.header_images && COMMON_FIELDS.header_image,
      fields.bodyWithLabel("Biography"),
    ]),

  "guide-categories": () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.order,
      { name: "icon", type: "image", label: "Icon" },
      memberOf(config.collections)("properties") &&
        createReferenceField("property", "Property", "properties", false),
      fields.body,
    ]),

  snippets: () => [COMMON_FIELDS.name, fields.body],

  menus: () => compact([...getItemTop(), ...getItemBottom(config, fields)]),
});

/**
 * Build fields for the news collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} News collection fields
 */
const buildNewsFields = (config, fields) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.title,
    config.features.header_images && COMMON_FIELDS.header_image,
    { name: "date", label: "Date", type: "date" },
    enabled("team") && createReferenceField("author", "Author", "team", false),
    ...getContentFields(config, fields),
    config.features.no_index && COMMON_FIELDS.no_index,
  ])(config);

/**
 * Create a categories reference field predicate
 * @param {(name: string) => boolean} enabled - Collection enablement checker
 * @returns {false | CmsField} Categories reference field or false
 */
const categoriesRef = (enabled) =>
  enabled("categories") &&
  createReferenceField("categories", "Categories", "categories");

/**
 * Create a products object list field with nested reference
 * @param {(name: string) => boolean} enabled - Collection enablement checker
 * @returns {false | CmsField} Products object list field or false
 */
const productsRefList = (enabled) =>
  enabled("products") && {
    ...createObjectListField("products", "Products", [
      createReferenceField("product", "Product", "products", false),
    ]),
    _componentName: "products_list",
  };

/**
 * Build fields for the products collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Products collection fields
 */
const buildProductsFields = (config, fields) =>
  buildItem((enabled) => [
    categoriesRef(enabled),
    enabled("events") && createReferenceField("events", "Events", "events"),
    PRODUCT_OPTIONS_FIELD,
    config.features.external_purchases && {
      name: "purchase_url",
      label: "Purchase URL",
      type: "string",
    },
    config.features.features && FEATURES_FIELD,
    config.features.keywords && KEYWORDS_FIELD,
    FILTER_ATTRIBUTES_FIELD,
  ])(config, fields);

/**
 * Build fields for the reviews collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Reviews collection fields
 */
const buildReviewsFields = (config, fields) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.name,
    { name: "url", type: "string", label: "URL" },
    { name: "rating", type: "number", label: "Rating" },
    { name: "thumbnail", type: "image", label: "Reviewer Photo" },
    fields.body,
    enabled("products") &&
      createReferenceField("products", "Products", "products"),
  ])(config);

/**
 * Build fields for the events collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Events collection fields
 */
const buildEventsFields = (config, fields) =>
  buildItem((enabled) => [
    COMMON_FIELDS.featured,
    config.features.event_locations_and_dates && {
      name: "event_date",
      label: "Event Date",
      type: "date",
      required: false,
    },
    config.features.event_locations_and_dates && {
      name: "recurring_date",
      type: "string",
      label: 'Recurring Date (e.g. "Every Friday at 2 PM")',
      required: false,
    },
    config.features.event_locations_and_dates && {
      name: "event_location",
      type: "string",
      label: "Event Location",
    },
    productsRefList(enabled),
    config.features.event_locations_and_dates && {
      name: "map_embed_src",
      type: "string",
      label: "Map Embed URL",
      required: false,
    },
  ])(config, fields);

/**
 * Build fields for the locations collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Locations collection fields
 */
const buildLocationsFields = (config, fields) =>
  buildItem((enabled) => [categoriesRef(enabled)])(config, fields);

/**
 * Build fields for the properties collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Properties collection fields
 */
const buildPropertiesFields = (config, fields) =>
  buildItem((enabled) => [
    COMMON_FIELDS.featured,
    enabled("locations") &&
      createReferenceField("locations", "Locations", "locations"),
    { name: "bedrooms", type: "number", label: "Bedrooms" },
    { name: "bathrooms", type: "number", label: "Bathrooms" },
    { name: "sleeps", type: "number", label: "Sleeps" },
    { name: "price_per_night", type: "number", label: "Price Per Night" },
    { name: "formspark_id", type: "string", label: "Formspark ID" },
    config.features.features && FEATURES_FIELD,
  ])(config, fields);

/**
 * Build fields for the menu-categories collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Menu categories collection fields
 */
const buildMenuCategoriesFields = (config, fields) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.order,
    enabled("menus") && createReferenceField("menus", "Menus", "menus"),
    fields.body,
  ])(config);

/**
 * Build fields for the menu-items collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Menu items collection fields
 */
const buildMenuItemsFields = (config, fields) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    { name: "price", type: "string", label: "Price" },
    { name: "is_vegan", type: "boolean", label: "Is Vegan" },
    { name: "is_gluten_free", type: "boolean", label: "Is Gluten Free" },
    enabled("menu-categories") &&
      createReferenceField(
        "menu_categories",
        "Menu Categories",
        "menu-categories",
      ),
    { name: "description", type: "string", label: "Description" },
    fields.body,
  ])(config);

/**
 * Build fields for the guide-pages collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Guide pages collection fields
 */
const buildGuidePagesFields = (config, fields) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.subtitle,
    enabled("guide-categories") &&
      createReferenceField(
        "guide-category",
        "Guide Category",
        "guide-categories",
        false,
      ),
    COMMON_FIELDS.order,
    fields.body,
  ])(config);

/**
 * Get core fields for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fields - Precomputed fields
 * @returns {CmsField[]} Core fields for the collection
 */
const getCoreFields = (collectionName, config, fields) => {
  const builders = getCollectionFieldBuilders(config, fields);
  const staticBuilder = builders[collectionName];
  if (staticBuilder) return staticBuilder();

  const dynamicBuilders = {
    news: buildNewsFields,
    products: buildProductsFields,
    reviews: buildReviewsFields,
    events: buildEventsFields,
    locations: buildLocationsFields,
    properties: buildPropertiesFields,
    "guide-pages": buildGuidePagesFields,
    "menu-categories": buildMenuCategoriesFields,
    "menu-items": buildMenuItemsFields,
  };

  const builder = dynamicBuilders[collectionName];
  return builder ? builder(config, fields) : [];
};

/**
 * Get collection-specific optional fields based on what the collection supports
 * @param {CollectionDefinition} collection - Collection definition
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {(false | CmsField)[]} Collection-specific optional fields
 */
const getCollectionSpecificFields = (collection, config, fieldContext) => [
  config.features.galleries && collection.supportsGallery && GALLERY_FIELD,
  config.features.specs && collection.supportsSpecs && SPECS_FIELD,
  config.features.add_ons &&
    collection.supportsAddOns &&
    createAddOnsField(config.features.use_visual_editor),
  collection.supportsTabs && fieldContext.tabs,
];

/**
 * Add optional fields based on configuration
 * @param {CmsField[]} coreFields - Existing fields
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CmsField[]} Fields with optional fields added
 */
const addOptionalFields = (
  coreFields,
  collectionName,
  config,
  fieldContext,
) => {
  if (collectionName === "snippets") return coreFields;

  const collection = getCollection(collectionName);
  return compact([
    ...coreFields,
    config.features.permalinks && COMMON_FIELDS.permalink,
    config.features.redirects && COMMON_FIELDS.redirect_from,
    config.features.faqs && FAQS_FIELD,
    ...getCollectionSpecificFields(collection, config, fieldContext),
  ]);
};

/**
 * Build all fields for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CmsField[]} Complete field configuration for the collection
 */
const buildCollectionFields = (collectionName, config, fieldContext) => {
  const coreFields = getCoreFields(collectionName, config, fieldContext);
  return addOptionalFields(coreFields, collectionName, config, fieldContext);
};

/**
 * Extract field names from an array of CmsField objects
 * @param {CmsField[]} fields - Array of field configurations
 * @returns {string[]} Array of field names
 */
const extractFieldNames = (fields) => fields.map((f) => f.name);

/**
 * Filter a list of field names to only include those that are available
 * @param {string[]} requestedFields - Fields to filter
 * @param {string[]} availableFields - Fields that are actually available
 * @returns {string[]} Filtered list of available fields
 */
const filterToAvailable = (requestedFields, availableFields) =>
  filter(memberOf(availableFields))(requestedFields);

/**
 * Create a validated view config with only available fields
 * @param {ViewConfig} rawConfig - Raw view configuration
 * @param {string[]} availableFields - Fields that are actually available
 * @returns {ViewConfig} Validated view configuration
 */
const createValidatedViewConfig = (rawConfig, availableFields) => {
  const validFields = filterToAvailable(rawConfig.fields, availableFields);
  const validSort = filterToAvailable(rawConfig.sort, availableFields);

  // Use first valid field as primary if original primary is unavailable
  const validPrimary = availableFields.includes(rawConfig.primary)
    ? rawConfig.primary
    : validFields[0] || availableFields[0] || "title";

  return {
    fields: validFields.length > 0 ? validFields : ["title"],
    primary: validPrimary,
    sort: validSort.length > 0 ? validSort : [validPrimary],
  };
};

/**
 * Get raw view configurations for collections (before validation)
 * @param {CmsConfig} config - CMS configuration
 * @returns {Record<string, ViewConfig>} Raw view configurations by collection name
 */
const getRawViewConfigs = (_config) => ({
  pages: {
    fields: ["thumbnail", "permalink", "meta_title", "header_text"],
    primary: "meta_title",
    sort: ["meta_title"],
  },
  events: {
    fields: [
      "thumbnail",
      "title",
      "event_date",
      "recurring_date",
      "event_location",
    ],
    primary: "title",
    sort: ["title"],
  },
  locations: {
    fields: ["thumbnail", "title", "subtitle"],
    primary: "title",
    sort: ["title"],
  },
  properties: {
    fields: ["thumbnail", "title", "subtitle", "bedrooms", "sleeps"],
    primary: "title",
    sort: ["title"],
  },
});

/**
 * Get validated view configuration for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {ViewConfig | undefined} Validated view configuration or undefined
 */
const getValidatedViewConfig = (collectionName, config, fieldContext) => {
  const rawConfigs = getRawViewConfigs(config);
  const rawConfig = rawConfigs[collectionName];

  if (!rawConfig) return undefined;

  const collectionFields = buildCollectionFields(
    collectionName,
    config,
    fieldContext,
  );
  const availableFieldNames = extractFieldNames(collectionFields);

  return createValidatedViewConfig(rawConfig, availableFieldNames);
};

/**
 * Collections that use the default date-based filename pattern
 * @type {string[]}
 */
const DATE_FILENAME_COLLECTIONS = ["news"];

/**
 * Check if a collection uses filename-based primary key (all except date-based ones)
 * @type {(name: string) => boolean}
 */
const hasFilenameConfig = (name) => !memberOf(DATE_FILENAME_COLLECTIONS)(name);

/**
 * Helper to get data path based on whether src folder exists
 * @param {boolean} hasSrcFolder - Whether template has src/ folder
 * @returns {string} Data path
 */
const getDataPath = (hasSrcFolder) => (hasSrcFolder ? "src/_data" : "_data");

/**
 * Generate configuration for a single collection
 * @param {string} collectionName - Name of the collection (must exist in COLLECTIONS)
 * @param {CmsConfig} config - CMS configuration
 * @param {FieldContext} fieldContext - Precomputed fields
 * @returns {CollectionConfig} Collection configuration
 */
const generateCollectionConfig = (collectionName, config, fieldContext) => {
  const collection = getCollection(collectionName, config.hasSrcFolder);

  const collectionConfig = {
    name: collectionName,
    label: collection.label,
    path: collection.path,
    type: "collection",
    subfolders: collectionName === "locations",
  };

  if (hasFilenameConfig(collectionName)) {
    collectionConfig.filename = "{primary}.md";
  }

  const viewConfig = getValidatedViewConfig(
    collectionName,
    config,
    fieldContext,
  );
  if (viewConfig) {
    collectionConfig.view = viewConfig;
  }

  if (collectionName === "pages") {
    const pageLayoutSlugs = Object.keys(pageLayouts);
    if (pageLayoutSlugs.length > 0) {
      collectionConfig.exclude = pageLayoutSlugs.map((slug) => `${slug}.md`);
    }
  }

  collectionConfig.fields = buildCollectionFields(
    collectionName,
    config,
    fieldContext,
  );

  return collectionConfig;
};

/**
 * Generate homepage settings configuration
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Homepage settings configuration
 */
const getHomepageConfig = (dataPath) => ({
  name: "homepage",
  label: "Homepage Settings",
  type: "file",
  path: `${dataPath}/homepage.json`,
  fields: [
    {
      name: "show_products",
      type: "boolean",
      label: "Show Products Section",
      default: true,
    },
    {
      name: "show_menus",
      type: "boolean",
      label: "Show Menus Section",
      default: true,
    },
    {
      name: "show_news",
      type: "boolean",
      label: "Show News Section",
      default: true,
    },
    {
      name: "show_recurring_events",
      type: "boolean",
      label: "Show Recurring Events",
      default: true,
    },
  ],
});

/**
 * Generate site configuration
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Site configuration
 */
const getSiteConfig = (dataPath) => ({
  name: "site",
  label: "Site Configuration",
  type: "file",
  path: `${dataPath}/site.json`,
  fields: [
    { name: "name", type: "string", label: "Site Name" },
    { name: "url", type: "string", label: "Site URL" },
    {
      name: "opening_times",
      label: "Opening Times",
      type: "object",
      list: true,
      fields: [
        { name: "day", type: "string", label: "Day", required: true },
        { name: "hours", type: "string", label: "Hours", required: true },
      ],
    },
    {
      name: "socials",
      label: "Social Media Links",
      type: "object",
      fields: [
        { name: "Github", type: "string", label: "Github" },
        { name: "Forgejo", type: "string", label: "Forgejo" },
        { name: "Facebook", type: "string", label: "Facebook" },
        { name: "Instagram", type: "string", label: "Instagram" },
        { name: "TikTok", type: "string", label: "TikTok" },
        { name: "Google", type: "string", label: "Google" },
        { name: "WhatsApp", type: "string", label: "WhatsApp" },
        { name: "RSS", type: "string", label: "RSS" },
      ],
    },
    { name: "map_embed_src", type: "string", label: "Map Embed URL" },
  ],
});

/**
 * Generate meta configuration
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Meta configuration
 */
const getMetaConfig = (dataPath) => ({
  name: "meta",
  label: "Meta Configuration",
  type: "file",
  path: `${dataPath}/meta.json`,
  fields: [
    {
      name: "language",
      type: "string",
      label: "Language Code",
      default: "en-GB",
    },
    {
      name: "organization",
      label: "Organization",
      type: "object",
      fields: [
        {
          name: "description",
          type: "string",
          label: "Organization Description",
        },
        { name: "legalName", type: "string", label: "Legal Name" },
        { name: "foundingDate", type: "string", label: "Founding Date" },
        createObjectListField("founders", "Founders", [
          { name: "name", type: "string", label: "Name" },
        ]),
        {
          name: "address",
          label: "Address",
          type: "object",
          fields: [
            { name: "streetAddress", type: "string", label: "Street Address" },
            { name: "addressLocality", type: "string", label: "City" },
            { name: "addressRegion", type: "string", label: "Region/State" },
            { name: "postalCode", type: "string", label: "Postal Code" },
            { name: "addressCountry", type: "string", label: "Country Code" },
          ],
        },
        {
          name: "contactPoint",
          label: "Contact Points",
          type: "object",
          list: true,
          fields: [
            { name: "telephone", type: "string", label: "Telephone" },
            { name: "contactType", type: "string", label: "Contact Type" },
            { name: "areaServed", type: "string", label: "Area Served" },
            {
              name: "availableLanguage",
              type: "string",
              label: "Available Languages",
              list: true,
            },
          ],
        },
      ],
    },
  ],
});

/**
 * Generate alt tags configuration
 * @param {string} dataPath - Path to data directory
 * @returns {CollectionConfig} Alt tags configuration
 */
const getAltTagsConfig = (dataPath) => ({
  name: "alt-tags",
  label: "Image Alt Tags",
  type: "file",
  path: `${dataPath}/alt-tags.json`,
  fields: [
    {
      name: "images",
      type: "object",
      list: true,
      fields: [
        { name: "path", type: "image", label: "Image" },
        { name: "alt", type: "string", label: "Alt Text" },
      ],
    },
  ],
});

/**
 * Get page layout schemas from pageLayouts data
 * @returns {Array<{slug: string, schema: object}>} Array of page layout definitions
 */
const getPageLayoutSchemas = () =>
  Object.entries(pageLayouts).map(([slug, schema]) => ({ slug, schema }));

/**
 * Convert a non-markdown schema field to a generic CMS field
 * @param {string} name - Field name
 * @param {object} fieldSchema - Field schema from JSON
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS field configuration
 */
const buildGenericCmsField = (name, fieldSchema, useVisualEditor) => ({
  name,
  type: fieldSchema.type,
  label: fieldSchema.label || name,
  ...(fieldSchema.required && { required: true }),
  ...(fieldSchema.default !== undefined && { default: fieldSchema.default }),
  ...(fieldSchema.list && { list: true }),
  ...(fieldSchema.fields && {
    fields: Object.entries(fieldSchema.fields).map(([n, f]) =>
      schemaFieldToCmsField(n, f, useVisualEditor),
    ),
  }),
});

/**
 * Valid field types for page layout schema fields.
 * Use "markdown" for rich-text/code editor fields — never "rich-text" directly.
 * @type {Set<string>}
 */
const VALID_SCHEMA_FIELD_TYPES = new Set([
  "string",
  "number",
  "boolean",
  "image",
  "object",
  "markdown",
  "reference",
]);

/**
 * Convert a page layout block schema field to a CMS field
 * @param {string} name - Field name
 * @param {object} fieldSchema - Field schema from JSON
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS field configuration
 */
const schemaFieldToCmsField = (name, fieldSchema, useVisualEditor) => {
  if (!VALID_SCHEMA_FIELD_TYPES.has(fieldSchema.type)) {
    throw new Error(
      `Invalid field type "${fieldSchema.type}" for field "${name}". ` +
        `Valid types: ${[...VALID_SCHEMA_FIELD_TYPES].join(", ")}. ` +
        `Use "markdown" instead of "rich-text" for rich text editor fields.`,
    );
  }

  if (fieldSchema.type === "markdown") {
    return createMarkdownField(
      name,
      fieldSchema.label || name,
      useVisualEditor,
      {
        ...(fieldSchema.required && { required: true }),
      },
    );
  }

  if (fieldSchema.type === "reference") {
    return createReferenceField(
      name,
      fieldSchema.label || name,
      fieldSchema.collection,
      fieldSchema.multiple !== false,
    );
  }

  return buildGenericCmsField(name, fieldSchema, useVisualEditor);
};

/**
 * Convert a block type slug to a human-readable label
 * @param {string} type - Block type slug (e.g., "section-header")
 * @returns {string} Human-readable label (e.g., "Section Header")
 */
const blockTypeToLabel = (type) =>
  type
    .split(/[-_]/)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

/**
 * Convert a block type slug to a component name (e.g. "section-header" -> "block_section_header")
 * @param {string} type - Block type slug
 * @returns {string} Component name
 */
const blockTypeToComponentName = (type) => `block_${type.replace(/-/g, "_")}`;

/**
 * Build a CMS block component definition from BLOCK_CMS_FIELDS for one block type.
 * Each block is tagged with _componentName so it's extracted into the top-level
 * components map and replaced with a component reference downstream.
 * @param {string} type - Block type slug (must exist in BLOCK_CMS_FIELDS)
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS block configuration
 */
const buildBlockComponent = (type, useVisualEditor) => {
  const fieldsSchema = BLOCK_CMS_FIELDS[type];
  if (!fieldsSchema) {
    throw new Error(
      `Block type "${type}" is not defined in BLOCK_CMS_FIELDS. ` +
        "Add it to src/_lib/utils/block-schema.js or remove it from page-layouts.",
    );
  }
  return {
    name: type,
    label: blockTypeToLabel(type),
    type: "object",
    fields: Object.entries(fieldsSchema).map(([name, fieldSchema]) =>
      schemaFieldToCmsField(name, fieldSchema, useVisualEditor),
    ),
    _componentName: blockTypeToComponentName(type),
  };
};

/**
 * Generate CMS block field for the list of block types this page supports.
 * Block field definitions come from BLOCK_CMS_FIELDS in block-schema.js — the
 * single source of truth — so the same block type always resolves to the same
 * component no matter which page uses it.
 * @param {string[]} blockTypes - Block type slugs supported on this page
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} CMS blocks field configuration using type: block
 */
const generateBlocksField = (blockTypes, useVisualEditor) => ({
  name: "blocks",
  label: "Content Blocks",
  type: "block",
  list: true,
  blockKey: "type",
  blocks: blockTypes.map((type) => buildBlockComponent(type, useVisualEditor)),
});

/**
 * Generate page layout configuration for CMS
 * Edits the markdown file's front matter blocks, using the block list from JSON
 * @param {string} slug - Page slug
 * @param {object} schema - Layout schema with `label` and `blocks` (string[])
 * @param {FieldContext} fieldContext - Precomputed fields
 * @param {boolean} useVisualEditor - Whether to use rich-text editor for markdown fields
 * @returns {object} Collection configuration for this page layout
 */
const generatePageLayoutConfig = (
  slug,
  schema,
  fieldContext,
  useVisualEditor,
) => ({
  name: `page-${slug}`,
  label: schema.label,
  type: "file",
  path: `src/pages/${slug}.md`,
  fields: [
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    generateBlocksField(schema.blocks, useVisualEditor),
    fieldContext.body,
  ],
});

/**
 * Extract a component definition from a field, stripping internal markers
 * @param {CmsField} field - Field with _componentName
 * @returns {object} Component definition (field without name and _componentName)
 */
const fieldToComponentDef = (field) => {
  const { name: _name, _componentName: _cn, ...def } = field;
  return def;
};

/**
 * Recursively scan fields and register component definitions.
 * Descends into nested `fields` arrays and also `blocks` arrays (for block-type fields).
 * @param {CmsField[]} fields - Fields to scan
 * @param {Record<string, object>} components - Accumulator for component definitions
 */
const scanFieldsForComponents = (fields, components) => {
  if (!fields) return;
  for (const field of fields) {
    if (field._componentName && !components[field._componentName]) {
      components[field._componentName] = fieldToComponentDef(field);
    }
    scanFieldsForComponents(field.fields, components);
    scanFieldsForComponents(field.blocks, components);
  }
};

/**
 * Collect all unique component definitions from content arrays
 * @param {CollectionConfig[]} contentArray - All content configurations
 * @returns {Record<string, object>} Map of component name to definition
 */
const collectComponents = (contentArray) => {
  const components = {};
  for (const item of contentArray) {
    scanFieldsForComponents(item.fields, components);
  }
  return components;
};

/**
 * Replace a single field with a component reference when applicable,
 * otherwise recursively process its nested `fields` / `blocks` arrays.
 * @param {CmsField} field - Field configuration
 * @returns {CmsField} Transformed field
 */
const replaceFieldWithComponentRef = (field) => {
  if (field._componentName) {
    return { name: field.name, component: field._componentName };
  }
  const updates = {};
  if (field.fields) updates.fields = replaceWithComponentRefs(field.fields);
  if (field.blocks) updates.blocks = replaceWithComponentRefs(field.blocks);
  return Object.keys(updates).length > 0 ? { ...field, ...updates } : field;
};

/**
 * Replace component fields with component references in a fields array.
 * Descends into nested `fields` arrays and also `blocks` arrays (for block-type fields).
 * @param {CmsField[]} fields - Array of field configurations
 * @returns {CmsField[]} Fields with component references replacing full definitions
 */
const replaceWithComponentRefs = (fields) => {
  if (!fields) return fields;
  return fields.map(replaceFieldWithComponentRef);
};

/**
 * Apply component references to all content items
 * @param {CollectionConfig[]} contentArray - All content configurations
 * @returns {CollectionConfig[]} Content with component references
 */
const applyComponentRefs = (contentArray) =>
  contentArray.map((item) =>
    item.fields
      ? { ...item, fields: replaceWithComponentRefs(item.fields) }
      : item,
  );

/**
 * Generate complete .pages.yml configuration
 * @param {CmsConfig} config - CMS configuration
 * @returns {string} YAML string for .pages.yml
 */
export const generatePagesYaml = (config) => {
  // Create field context once - precomputes body and tabs fields based on visual editor setting
  const fieldContext = createFieldContext(config.features.use_visual_editor);

  const collectionConfigs = filterMap(
    (name) => getCollection(name),
    (name) => generateCollectionConfig(name, config, fieldContext),
  )(config.collections);

  const hasSrcFolder = config.hasSrcFolder ?? true;
  const customHomePage = config.customHomePage ?? false;
  const dataPath = getDataPath(hasSrcFolder);
  const imagesPath = hasSrcFolder ? "src/images" : "images";

  // Load page layout schemas and generate their configs
  const pageLayoutSchemas = getPageLayoutSchemas();
  const useVisualEditor = config.features.use_visual_editor;
  const pageLayoutConfigs = pageLayoutSchemas.map(({ slug, schema }) =>
    generatePageLayoutConfig(slug, schema, fieldContext, useVisualEditor),
  );

  // Build content array, conditionally including homepage
  const contentArray = [
    ...collectionConfigs,
    ...pageLayoutConfigs,
    ...(customHomePage ? [] : [getHomepageConfig(dataPath)]),
    getSiteConfig(dataPath),
    getMetaConfig(dataPath),
    getAltTagsConfig(dataPath),
  ];

  // Extract components from fields and replace with references
  const components = collectComponents(contentArray);
  const contentWithRefs = applyComponentRefs(contentArray);

  const pagesConfig = {
    media: {
      input: imagesPath,
      output: "/images",
      path: imagesPath,
      categories: ["image"],
      rename: true,
    },
    settings: {
      hide: true,
      content: {
        merge: true,
      },
    },
    ...(Object.keys(components).length > 0 && { components }),
    content: contentWithRefs,
  };

  return YAML.stringify(pagesConfig, {
    indent: 2,
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
};
