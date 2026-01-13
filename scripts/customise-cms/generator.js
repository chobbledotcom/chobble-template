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
  createEleventyNavigationField,
  createObjectListField,
  createReferenceField,
  FAQS_FIELD,
  FEATURES_FIELD,
  FILTER_ATTRIBUTES_FIELD,
  GALLERY_FIELD,
  PRODUCT_OPTIONS_FIELD,
  SPECS_FIELD,
  TABS_FIELD,
} from "#scripts/customise-cms/fields.js";
import {
  compact,
  filter,
  filterMap,
  memberOf,
  pipe,
} from "#utils/array-utils.js";

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
 * @returns {(false | CmsField)[]} Content fields with optional header_text
 */
const getContentFields = (config) => [
  COMMON_FIELDS.subtitle,
  COMMON_FIELDS.body,
  config.features.header_images && COMMON_FIELDS.header_text,
  ...META_FIELDS,
];

/**
 * Top of every item: title, subtitle, thumbnail, order
 * @param {CmsConfig} _config - unused for now, but here for future flexibility
 * @returns {CmsField[]}
 */
const getItemTop = (_config) => [
  COMMON_FIELDS.title,
  COMMON_FIELDS.subtitle,
  COMMON_FIELDS.thumbnail,
  COMMON_FIELDS.order,
];

/**
 * Bottom of every item: body, header_image, header_text (if enabled), meta
 * @param {CmsConfig} config
 * @returns {(false | CmsField)[]}
 */
const getItemBottom = (config) => [
  COMMON_FIELDS.body,
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
 * @param {(enabled: (name: string) => boolean, config: CmsConfig) => (false | CmsField)[]} middle
 * @returns {(config: CmsConfig) => CmsField[]}
 */
const buildItem = (middle) => (config) =>
  withEnabled((enabled) => [
    ...getItemTop(config),
    ...middle(enabled, config),
    ...getItemBottom(config),
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
 * Field builders for each collection type - functions that accept config
 * @param {CmsConfig} config - CMS configuration
 * @returns {Record<string, () => CmsField[]>} Map of collection names to field builder functions
 */
const getCollectionFieldBuilders = (config) => ({
  pages: () => [
    ...withHeaderFields(
      config,
      COMMON_FIELDS.header_image,
      COMMON_FIELDS.header_text,
    ),
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.body,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    createEleventyNavigationField(config.features.external_navigation_urls),
    { name: "layout", type: "string" },
  ],

  categories: () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      COMMON_FIELDS.body,
      COMMON_FIELDS.featured,
      ...getHeaderFields(config),
      ...META_FIELDS,
      COMMON_FIELDS.subtitle,
    ]),

  team: () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      { name: "snippet", type: "string", label: "Role" },
      { name: "image", type: "image", label: "Profile Image" },
      config.features.header_images && COMMON_FIELDS.header_image,
      {
        name: "body",
        label: "Biography",
        type: "code",
        options: { language: "markdown" },
      },
    ]),

  "guide-categories": () => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.order,
    { name: "icon", type: "image", label: "Icon" },
    COMMON_FIELDS.body,
  ],

  snippets: () => [COMMON_FIELDS.name, COMMON_FIELDS.body],

  menus: () => compact([...getItemTop(config), ...getItemBottom(config)]),
});

/**
 * Build fields for the news collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} News collection fields
 */
const buildNewsFields = (config) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.title,
    config.features.header_images && COMMON_FIELDS.header_image,
    { name: "date", label: "Date", type: "date" },
    enabled("team") &&
      createReferenceField("author", "Author", "team", "title", false),
    ...getContentFields(config),
  ])(config);

/**
 * Build fields for the products collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Products collection fields
 */
const buildProductsFields = buildItem((enabled, config) => [
  enabled("categories") &&
    createReferenceField("categories", "Categories", "categories"),
  enabled("events") && createReferenceField("events", "Events", "events"),
  PRODUCT_OPTIONS_FIELD,
  config.features.external_purchases && {
    name: "purchase_url",
    label: "Purchase URL",
    type: "string",
  },
  config.features.features && FEATURES_FIELD,
  FILTER_ATTRIBUTES_FIELD,
]);

/**
 * Build fields for the reviews collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Reviews collection fields
 */
const buildReviewsFields = (config) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.name,
    { name: "url", type: "string", label: "URL" },
    { name: "rating", type: "number", label: "Rating" },
    { name: "thumbnail", type: "image", label: "Reviewer Photo" },
    COMMON_FIELDS.body,
    enabled("products") &&
      createReferenceField("products", "Products", "products"),
  ])(config);

/**
 * Build fields for the events collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Events collection fields
 */
const buildEventsFields = buildItem((_, config) => [
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
  config.features.event_locations_and_dates && {
    name: "map_embed_src",
    type: "string",
    label: "Map Embed URL",
    required: false,
  },
]);

/**
 * Build fields for the locations collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Locations collection fields
 */
const buildLocationsFields = buildItem((enabled) => [
  enabled("categories") &&
    createReferenceField("categories", "Categories", "categories"),
]);

/**
 * Build fields for the properties collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Properties collection fields
 */
const buildPropertiesFields = buildItem((enabled, config) => [
  COMMON_FIELDS.featured,
  enabled("locations") &&
    createReferenceField("locations", "Locations", "locations"),
  { name: "bedrooms", type: "number", label: "Bedrooms" },
  { name: "bathrooms", type: "number", label: "Bathrooms" },
  { name: "sleeps", type: "number", label: "Sleeps" },
  { name: "price_per_night", type: "number", label: "Price Per Night" },
  config.features.features && FEATURES_FIELD,
]);

/**
 * Build fields for the menu-categories collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Menu categories collection fields
 */
const buildMenuCategoriesFields = (config) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.order,
    enabled("menus") && createReferenceField("menus", "Menus", "menus"),
    COMMON_FIELDS.body,
  ])(config);

/**
 * Build fields for the menu-items collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Menu items collection fields
 */
const buildMenuItemsFields = (config) =>
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
        "name",
      ),
    { name: "description", type: "string", label: "Description" },
    COMMON_FIELDS.body,
  ])(config);

/**
 * Build fields for the guide-pages collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Guide pages collection fields
 */
const buildGuidePagesFields = (config) =>
  withEnabled((enabled) => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.subtitle,
    enabled("guide-categories") &&
      createReferenceField(
        "guide-category",
        "Guide Category",
        "guide-categories",
        "title",
        false,
      ),
    COMMON_FIELDS.order,
    COMMON_FIELDS.body,
  ])(config);

/**
 * Get core fields for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Core fields for the collection
 */
const getCoreFields = (collectionName, config) => {
  const builders = getCollectionFieldBuilders(config);
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
  return builder ? builder(config) : [];
};

/**
 * Add optional fields based on configuration
 * @param {CmsField[]} fields - Existing fields
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Fields with optional fields added
 */
const addOptionalFields = (fields, collectionName, config) => {
  if (collectionName === "snippets") return fields;

  const collection = getCollection(collectionName);
  return compact([
    ...fields,
    config.features.permalinks && COMMON_FIELDS.permalink,
    config.features.redirects && COMMON_FIELDS.redirect_from,
    config.features.faqs && FAQS_FIELD,
    config.features.galleries && collection.supportsGallery && GALLERY_FIELD,
    config.features.specs && collection.supportsSpecs && SPECS_FIELD,
    collection.supportsTabs && TABS_FIELD,
  ]);
};

/**
 * Build all fields for a collection
 * @param {string} collectionName - Name of the collection
 * @param {CmsConfig} config - CMS configuration
 * @returns {CmsField[]} Complete field configuration for the collection
 */
const buildCollectionFields = (collectionName, config) => {
  const fields = getCoreFields(collectionName, config);
  return addOptionalFields(fields, collectionName, config);
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
 * @returns {ViewConfig | undefined} Validated view configuration or undefined
 */
const getValidatedViewConfig = (collectionName, config) => {
  const rawConfigs = getRawViewConfigs(config);
  const rawConfig = rawConfigs[collectionName];

  if (!rawConfig) return undefined;

  const fields = buildCollectionFields(collectionName, config);
  const availableFieldNames = extractFieldNames(fields);

  return createValidatedViewConfig(rawConfig, availableFieldNames);
};

/**
 * Collections that use filename-based primary key
 * @type {string[]}
 */
const FILENAME_COLLECTIONS = [
  "categories",
  "team",
  "events",
  "locations",
  "properties",
  "guide-categories",
  "guide-pages",
  "snippets",
];

/**
 * Check if a collection uses filename-based primary key
 * @type {(name: string) => boolean}
 */
const hasFilenameConfig = memberOf(FILENAME_COLLECTIONS);

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
 * @returns {CollectionConfig} Collection configuration
 */
const generateCollectionConfig = (collectionName, config) => {
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

  const viewConfig = getValidatedViewConfig(collectionName, config);
  if (viewConfig) {
    collectionConfig.view = viewConfig;
  }

  collectionConfig.fields = buildCollectionFields(collectionName, config);

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
 * Convert a page layout block schema field to a CMS field
 * @param {string} name - Field name
 * @param {object} fieldSchema - Field schema from JSON
 * @returns {object} CMS field configuration
 */
const schemaFieldToCmsField = (name, fieldSchema) => ({
  name,
  type: fieldSchema.type,
  label: fieldSchema.label || name,
  ...(fieldSchema.required && { required: true }),
  ...(fieldSchema.default !== undefined && { default: fieldSchema.default }),
  ...(fieldSchema.list && { list: true }),
  ...(fieldSchema.fields && {
    fields: Object.entries(fieldSchema.fields).map(([n, f]) =>
      schemaFieldToCmsField(n, f),
    ),
  }),
});

/**
 * Deduplicate fields by name, keeping first occurrence
 * @param {object[]} fields - Array of field objects
 * @returns {object[]} Deduplicated fields
 */
const uniqueByName = (fields) =>
  fields.filter(
    (field, index, arr) =>
      arr.findIndex((f) => f.name === field.name) === index,
  );

/**
 * Generate CMS fields for a blocks array based on schema
 * @param {object} schema - Layout schema with blocks array
 * @returns {object} CMS blocks field configuration
 */
const generateBlocksField = (schema) => ({
  name: "blocks",
  label: "Content Blocks",
  type: "object",
  list: true,
  fields: uniqueByName(
    schema.blocks.flatMap((block) => [
      {
        name: "type",
        type: "string",
        label: "Block Type",
        default: block.type,
      },
      ...Object.entries(block.fields).map(([name, fieldSchema]) =>
        schemaFieldToCmsField(name, fieldSchema),
      ),
    ]),
  ),
});

/**
 * Generate page layout configuration for CMS
 * Edits the markdown file's front matter blocks, using schema from JSON
 * @param {string} slug - Page slug
 * @param {object} schema - Layout schema
 * @returns {object} Collection configuration for this page layout
 */
const generatePageLayoutConfig = (slug, schema) => ({
  name: `page-${slug}`,
  label: schema.label,
  type: "file",
  path: `src/pages/${slug}.md`,
  fields: [
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    generateBlocksField(schema),
    COMMON_FIELDS.body,
  ],
});

/**
 * Generate complete .pages.yml configuration
 * @param {CmsConfig} config - CMS configuration
 * @returns {string} YAML string for .pages.yml
 */
export const generatePagesYaml = (config) => {
  const collectionConfigs = filterMap(
    (name) => getCollection(name),
    (name) => generateCollectionConfig(name, config),
  )(config.collections);

  const hasSrcFolder = config.hasSrcFolder ?? true;
  const customHomePage = config.customHomePage ?? false;
  const dataPath = getDataPath(hasSrcFolder);
  const imagesPath = hasSrcFolder ? "src/images" : "images";

  // Load page layout schemas and generate their configs
  const pageLayoutSchemas = getPageLayoutSchemas();
  const pageLayoutConfigs = pageLayoutSchemas.map(({ slug, schema }) =>
    generatePageLayoutConfig(slug, schema),
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

  const pagesConfig = {
    media: {
      input: imagesPath,
      output: "/images",
      path: imagesPath,
      categories: ["image"],
    },
    settings: {
      hide: true,
      content: {
        merge: true,
      },
    },
    content: contentArray,
  };

  return YAML.stringify(pagesConfig, {
    indent: 2,
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
};
