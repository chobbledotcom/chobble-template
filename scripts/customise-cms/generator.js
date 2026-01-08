/**
 * YAML generator for .pages.yml
 *
 * Generates the complete .pages.yml configuration based on user selections
 * using proper YAML serialization
 */

import YAML from "yaml";
import { getCollection } from "#scripts/customise-cms/collections.js";
import {
  COMMON_FIELDS,
  createEleventyNavigationField,
  createReferenceField,
  FAQS_FIELD,
  FEATURES_FIELD,
  FILTER_ATTRIBUTES_FIELD,
  GALLERY_FIELD,
  PRODUCT_OPTIONS_FIELD,
  SPECS_FIELD,
  TABS_FIELD,
} from "#scripts/customise-cms/fields.js";
import { compact, filterMap, memberOf } from "#utils/array-utils.js";

// Helper function to conditionally include header image/text
const withHeaderFields = (config, ...fields) =>
  config.features.header_images
    ? [...fields.flatMap((f) => (Array.isArray(f) ? f : [f]))]
    : [];

// Field builders for each collection type - functions that accept config
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
      config.features.header_images && COMMON_FIELDS.header_image,
      config.features.header_images && COMMON_FIELDS.header_text,
      COMMON_FIELDS.meta_title,
      COMMON_FIELDS.meta_description,
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

  guides: () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      config.features.header_images && COMMON_FIELDS.header_image,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.body,
      config.features.header_images && COMMON_FIELDS.header_text,
      COMMON_FIELDS.meta_title,
      COMMON_FIELDS.meta_description,
    ]),

  snippets: () => [COMMON_FIELDS.name, COMMON_FIELDS.body],

  menus: () =>
    compact([
      COMMON_FIELDS.title,
      COMMON_FIELDS.thumbnail,
      COMMON_FIELDS.order,
      config.features.header_images && COMMON_FIELDS.header_image,
      COMMON_FIELDS.subtitle,
      COMMON_FIELDS.body,
      COMMON_FIELDS.meta_title,
      COMMON_FIELDS.meta_description,
    ]),
});

const buildNewsFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.title,
    config.features.header_images && COMMON_FIELDS.header_image,
    { name: "date", label: "Date", type: "date" },
    hasCollection("team") &&
      createReferenceField("author", "Author", "team", "title", false),
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.body,
    config.features.header_images && COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  ]);
};

const buildProductsFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    config.features.header_images && COMMON_FIELDS.header_image,
    hasCollection("categories") &&
      createReferenceField("categories", "Categories", "categories"),
    hasCollection("events") &&
      createReferenceField("events", "Events", "events"),
    PRODUCT_OPTIONS_FIELD,
    config.features.external_purchases && {
      name: "purchase_url",
      label: "Purchase URL",
      type: "string",
    },
    COMMON_FIELDS.body,
    config.features.features && FEATURES_FIELD,
    FILTER_ATTRIBUTES_FIELD,
    config.features.header_images && COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    COMMON_FIELDS.subtitle,
  ]);
};

const buildReviewsFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.name,
    { name: "url", type: "string", label: "URL" },
    { name: "rating", type: "number", label: "Rating" },
    { name: "thumbnail", type: "image", label: "Reviewer Photo" },
    COMMON_FIELDS.body,
    hasCollection("products") &&
      createReferenceField("products", "Products", "products"),
  ]);
};

const buildEventsFields = (config) =>
  compact([
    COMMON_FIELDS.thumbnail,
    config.features.header_images && COMMON_FIELDS.header_image,
    COMMON_FIELDS.title,
    COMMON_FIELDS.subtitle,
    { name: "event_date", label: "Event Date", type: "date", required: false },
    {
      name: "recurring_date",
      type: "string",
      label: 'Recurring Date (e.g. "Every Friday at 2 PM")',
      required: false,
    },
    { name: "event_location", type: "string", label: "Event Location" },
    {
      name: "map_embed_src",
      type: "string",
      label: "Map Embed URL",
      required: false,
    },
    COMMON_FIELDS.body,
    config.features.header_images && COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  ]);

const buildLocationsFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.subtitle,
    hasCollection("categories") &&
      createReferenceField("categories", "Categories", "categories"),
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    COMMON_FIELDS.body,
  ]);
};

const buildPropertiesFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.title,
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.thumbnail,
    config.features.header_images && COMMON_FIELDS.header_image,
    COMMON_FIELDS.featured,
    hasCollection("locations") &&
      createReferenceField("locations", "Locations", "locations"),
    { name: "bedrooms", type: "number", label: "Bedrooms" },
    { name: "bathrooms", type: "number", label: "Bathrooms" },
    { name: "sleeps", type: "number", label: "Sleeps" },
    { name: "price_per_night", type: "number", label: "Price Per Night" },
    config.features.features && FEATURES_FIELD,
    COMMON_FIELDS.body,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  ]);
};

const buildMenuCategoriesFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.order,
    hasCollection("menus") && createReferenceField("menus", "Menus", "menus"),
    COMMON_FIELDS.body,
  ]);
};

const buildMenuItemsFields = (config) => {
  const hasCollection = memberOf(config.collections);
  return compact([
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    { name: "price", type: "string", label: "Price" },
    { name: "is_vegan", type: "boolean", label: "Is Vegan" },
    { name: "is_gluten_free", type: "boolean", label: "Is Gluten Free" },
    hasCollection("menu-categories") &&
      createReferenceField(
        "menu_categories",
        "Menu Categories",
        "menu-categories",
        "name",
      ),
    { name: "description", type: "string", label: "Description" },
    COMMON_FIELDS.body,
  ]);
};

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
    "menu-categories": buildMenuCategoriesFields,
    "menu-items": buildMenuItemsFields,
  };

  const builder = dynamicBuilders[collectionName];
  return builder ? builder(config) : [];
};

const addOptionalFields = (fields, collectionName, config) => {
  if (collectionName === "snippets") return fields;

  const collection = getCollection(collectionName);
  return compact([
    ...fields,
    config.features.permalinks && COMMON_FIELDS.permalink,
    config.features.redirects && COMMON_FIELDS.redirect_from,
    config.features.faqs && FAQS_FIELD,
    config.features.galleries && collection?.supportsGallery && GALLERY_FIELD,
    config.features.specs && collection?.supportsSpecs && SPECS_FIELD,
    collectionName === "products" && TABS_FIELD,
  ]);
};

const buildCollectionFields = (collectionName, config) => {
  const fields = getCoreFields(collectionName, config);
  return addOptionalFields(fields, collectionName, config);
};

const VIEW_CONFIGS = {
  pages: {
    fields: ["permalink", "meta_title", "header_text"],
    primary: "header_text",
    sort: ["header_text"],
  },
  events: {
    fields: ["title", "event_date", "recurring_date", "event_location"],
    primary: "title",
    sort: ["title"],
  },
  locations: {
    fields: ["title", "subtitle"],
    primary: "title",
    sort: ["title"],
  },
  properties: {
    fields: ["title", "subtitle", "bedrooms", "sleeps"],
    primary: "title",
    sort: ["title"],
  },
};

const FILENAME_COLLECTIONS = [
  "categories",
  "team",
  "events",
  "locations",
  "properties",
  "guides",
  "snippets",
];

const hasFilenameConfig = memberOf(FILENAME_COLLECTIONS);

// Helper to get data path based on whether src folder exists
const getDataPath = (hasSrcFolder) =>
  hasSrcFolder ? "src/_data" : "_data";

const generateCollectionConfig = (collectionName, config) => {
  const collection = getCollection(collectionName, config.hasSrcFolder);
  if (!collection) return null;

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

  if (VIEW_CONFIGS[collectionName]) {
    collectionConfig.view = VIEW_CONFIGS[collectionName];
  }

  collectionConfig.fields = buildCollectionFields(collectionName, config);

  return collectionConfig;
};

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
        {
          name: "founders",
          label: "Founders",
          type: "object",
          list: true,
          fields: [{ name: "name", type: "string", label: "Name" }],
        },
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

export const generatePagesYaml = (config) => {
  const collectionConfigs = filterMap(
    (name) => getCollection(name),
    (name) => generateCollectionConfig(name, config),
  )(config.collections);

  const hasSrcFolder = config.hasSrcFolder ?? true;
  const customHomePage = config.customHomePage ?? false;
  const dataPath = getDataPath(hasSrcFolder);

  // Build content array, conditionally including homepage
  const contentArray = [
    ...collectionConfigs,
    ...(customHomePage ? [] : [getHomepageConfig(dataPath)]),
    getSiteConfig(dataPath),
    getMetaConfig(dataPath),
    getAltTagsConfig(dataPath),
  ];

  const pagesConfig = {
    media: {
      input: "src/images",
      output: "/images",
      path: "src/images",
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
