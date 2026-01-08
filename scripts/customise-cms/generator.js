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
  createReferenceField,
  ELEVENTY_NAVIGATION_FIELD,
  FAQS_FIELD,
  FEATURES_FIELD,
  FILTER_ATTRIBUTES_FIELD,
  GALLERY_FIELD,
  PRODUCT_OPTIONS_FIELD,
  SPECS_FIELD,
  TABS_FIELD,
} from "#scripts/customise-cms/fields.js";

// Field builders for each collection type
const COLLECTION_FIELD_BUILDERS = {
  pages: () => [
    COMMON_FIELDS.header_image,
    COMMON_FIELDS.header_text,
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.body,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    ELEVENTY_NAVIGATION_FIELD,
    { name: "layout", type: "string" },
  ],

  categories: () => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.body,
    COMMON_FIELDS.featured,
    COMMON_FIELDS.header_image,
    COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    COMMON_FIELDS.subtitle,
  ],

  team: () => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    { name: "snippet", type: "string", label: "Role" },
    { name: "image", type: "image", label: "Profile Image" },
    COMMON_FIELDS.header_image,
    {
      name: "body",
      label: "Biography",
      type: "code",
      options: { language: "markdown" },
    },
  ],

  guides: () => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.header_image,
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.body,
    COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  ],

  snippets: () => [COMMON_FIELDS.name, COMMON_FIELDS.body],

  menus: () => [
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.order,
    COMMON_FIELDS.header_image,
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.body,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  ],
};

const buildNewsFields = (config) => {
  const fields = [
    COMMON_FIELDS.title,
    COMMON_FIELDS.header_image,
    { name: "date", label: "Date", type: "date" },
  ];
  if (config.collections.includes("team")) {
    fields.push(
      createReferenceField("author", "Author", "team", "title", false),
    );
  }
  fields.push(
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.body,
    COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  );
  return fields;
};

const buildProductsFields = (config) => {
  const fields = [
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.header_image,
  ];
  if (config.collections.includes("categories")) {
    fields.push(createReferenceField("categories", "Categories", "categories"));
  }
  if (config.collections.includes("events")) {
    fields.push(createReferenceField("events", "Events", "events"));
  }
  fields.push(
    PRODUCT_OPTIONS_FIELD,
    { name: "etsy_url", label: "Etsy URL", type: "string" },
    COMMON_FIELDS.body,
  );
  if (config.features.features) {
    fields.push(FEATURES_FIELD);
  }
  fields.push(
    FILTER_ATTRIBUTES_FIELD,
    COMMON_FIELDS.header_text,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    COMMON_FIELDS.subtitle,
  );
  return fields;
};

const buildReviewsFields = (config) => {
  const fields = [
    COMMON_FIELDS.name,
    { name: "url", type: "string", label: "URL" },
    { name: "rating", type: "number", label: "Rating" },
    { name: "thumbnail", type: "image", label: "Reviewer Photo" },
    COMMON_FIELDS.body,
  ];
  if (config.collections.includes("products")) {
    fields.push(createReferenceField("products", "Products", "products"));
  }
  return fields;
};

const buildEventsFields = () => [
  COMMON_FIELDS.thumbnail,
  COMMON_FIELDS.header_image,
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
  COMMON_FIELDS.header_text,
  COMMON_FIELDS.meta_title,
  COMMON_FIELDS.meta_description,
];

const buildLocationsFields = (config) => {
  const fields = [
    COMMON_FIELDS.title,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.subtitle,
  ];
  if (config.collections.includes("categories")) {
    fields.push(createReferenceField("categories", "Categories", "categories"));
  }
  fields.push(
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
    COMMON_FIELDS.body,
  );
  return fields;
};

const buildPropertiesFields = (config) => {
  const fields = [
    COMMON_FIELDS.title,
    COMMON_FIELDS.subtitle,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.header_image,
    COMMON_FIELDS.featured,
  ];
  if (config.collections.includes("locations")) {
    fields.push(createReferenceField("locations", "Locations", "locations"));
  }
  fields.push(
    { name: "bedrooms", type: "number", label: "Bedrooms" },
    { name: "bathrooms", type: "number", label: "Bathrooms" },
    { name: "sleeps", type: "number", label: "Sleeps" },
    { name: "price_per_night", type: "number", label: "Price Per Night" },
  );
  if (config.features.features) {
    fields.push(FEATURES_FIELD);
  }
  fields.push(
    COMMON_FIELDS.body,
    COMMON_FIELDS.meta_title,
    COMMON_FIELDS.meta_description,
  );
  return fields;
};

const buildMenuCategoriesFields = (config) => {
  const fields = [
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    COMMON_FIELDS.order,
  ];
  if (config.collections.includes("menus")) {
    fields.push(createReferenceField("menus", "Menus", "menus"));
  }
  fields.push(COMMON_FIELDS.body);
  return fields;
};

const buildMenuItemsFields = (config) => {
  const fields = [
    COMMON_FIELDS.name,
    COMMON_FIELDS.thumbnail,
    { name: "price", type: "string", label: "Price" },
    { name: "is_vegan", type: "boolean", label: "Is Vegan" },
    { name: "is_gluten_free", type: "boolean", label: "Is Gluten Free" },
  ];
  if (config.collections.includes("menu-categories")) {
    fields.push(
      createReferenceField(
        "menu_categories",
        "Menu Categories",
        "menu-categories",
        "name",
      ),
    );
  }
  fields.push(
    { name: "description", type: "string", label: "Description" },
    COMMON_FIELDS.body,
  );
  return fields;
};

const getCoreFields = (collectionName, config) => {
  const staticBuilder = COLLECTION_FIELD_BUILDERS[collectionName];
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
  const collection = getCollection(collectionName);
  if (collectionName === "snippets") return fields;

  if (config.features.permalinks) fields.push(COMMON_FIELDS.permalink);
  if (config.features.redirects) fields.push(COMMON_FIELDS.redirect_from);
  if (config.features.faqs) fields.push(FAQS_FIELD);
  if (config.features.galleries && collection?.supportsGallery)
    fields.push(GALLERY_FIELD);
  if (config.features.specs && collection?.supportsSpecs)
    fields.push(SPECS_FIELD);
  if (collectionName === "products") fields.push(TABS_FIELD);

  return fields;
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

const generateCollectionConfig = (collectionName, config) => {
  const collection = getCollection(collectionName);
  if (!collection) return null;

  const collectionConfig = {
    name: collectionName,
    label: collection.label,
    path: collection.path,
    type: "collection",
    subfolders: collectionName === "locations",
  };

  if (FILENAME_COLLECTIONS.includes(collectionName)) {
    collectionConfig.filename = "{primary}.md";
  }

  if (VIEW_CONFIGS[collectionName]) {
    collectionConfig.view = VIEW_CONFIGS[collectionName];
  }

  collectionConfig.fields = buildCollectionFields(collectionName, config);

  return collectionConfig;
};

const getHomepageConfig = () => ({
  name: "homepage",
  label: "Homepage Settings",
  type: "file",
  path: "src/_data/homepage.json",
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

const getSiteConfig = () => ({
  name: "site",
  label: "Site Configuration",
  type: "file",
  path: "src/_data/site.json",
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

const getMetaConfig = () => ({
  name: "meta",
  label: "Meta Configuration",
  type: "file",
  path: "src/_data/meta.json",
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

const getAltTagsConfig = () => ({
  name: "alt-tags",
  label: "Image Alt Tags",
  type: "file",
  path: "src/_data/alt-tags.json",
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
    content: [],
  };

  // Add collections
  for (const collectionName of config.collections) {
    const collectionConfig = generateCollectionConfig(collectionName, config);
    if (collectionConfig) {
      pagesConfig.content.push(collectionConfig);
    }
  }

  // Add file-based configurations
  pagesConfig.content.push(getHomepageConfig());
  pagesConfig.content.push(getSiteConfig());
  pagesConfig.content.push(getMetaConfig());
  pagesConfig.content.push(getAltTagsConfig());

  return YAML.stringify(pagesConfig, {
    indent: 2,
    lineWidth: 0,
  });
};
