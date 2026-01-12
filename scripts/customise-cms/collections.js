/**
 * Collection definitions for CMS customisation
 *
 * Each collection has:
 * - name: Internal collection name
 * - label: Display label in CMS
 * - path: Path to content files
 * - description: Human-readable description for prompts
 * - supportsFeatures: Whether collection can have features list
 * - supportsSpecs: Whether collection can have specifications
 * - supportsGallery: Whether collection can have image gallery
 * - dependencies: Other collections this one requires
 */

import { filter, unique } from "#utils/array-utils.js";

/**
 * @typedef {Object} CollectionDefinition
 * @property {string} name - Internal collection name
 * @property {string} label - Display label in CMS
 * @property {string} path - Path to content files
 * @property {string} description - Human-readable description for prompts
 * @property {boolean} supportsFeatures - Whether collection can have features list
 * @property {boolean} supportsSpecs - Whether collection can have specifications
 * @property {boolean} supportsGallery - Whether collection can have image gallery
 * @property {boolean} supportsTabs - Whether collection can have tabbed content
 * @property {string[]} [dependencies] - Other collections this one requires
 * @property {boolean} [required] - Whether collection is required (cannot be disabled)
 * @property {boolean} [internal] - Whether collection is internal (not shown to users)
 */

/**
 * All available collection definitions
 * @type {CollectionDefinition[]}
 */
export const COLLECTIONS = [
  {
    name: "pages",
    label: "Pages",
    path: "src/pages",
    description: "Static pages (about, contact, etc.)",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
    required: true,
  },
  {
    name: "products",
    label: "Products",
    path: "src/products",
    description: "Products for sale or hire",
    supportsFeatures: true,
    supportsSpecs: true,
    supportsGallery: true,
    supportsTabs: true,
    dependencies: ["categories"],
  },
  {
    name: "categories",
    label: "Categories",
    path: "src/categories",
    description: "Product/content categories",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "news",
    label: "News",
    path: "src/news",
    description: "Blog posts and news articles",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "events",
    label: "Events",
    path: "src/events",
    description: "Events and recurring activities",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "team",
    label: "Team",
    path: "src/team",
    description: "Team member profiles",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "reviews",
    label: "Reviews",
    path: "src/reviews",
    description: "Customer reviews and testimonials",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: false,
    supportsTabs: false,
  },
  {
    name: "locations",
    label: "Locations",
    path: "src/locations",
    description: "Physical locations or service areas",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "properties",
    label: "Properties",
    path: "src/properties",
    description: "Holiday lets or rental properties",
    supportsFeatures: true,
    supportsSpecs: true,
    supportsGallery: true,
    supportsTabs: true,
  },
  {
    name: "guides",
    label: "Guides",
    path: "src/guides",
    description: "How-to guides and documentation",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "menus",
    label: "Menus",
    path: "src/menus",
    description: "Restaurant/cafe menus",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
  },
  {
    name: "menu-categories",
    label: "Menu Categories",
    path: "src/menu-categories",
    description: "Menu section categories",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
    dependencies: ["menus"],
  },
  {
    name: "menu-items",
    label: "Menu Items",
    path: "src/menu-items",
    description: "Individual menu items",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    supportsTabs: false,
    dependencies: ["menu-categories"],
  },
  {
    name: "snippets",
    label: "Snippets",
    path: "src/snippets",
    description: "Reusable content snippets",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: false,
    supportsTabs: false,
    internal: true,
  },
];

/**
 * Get collection by name, optionally adjusting path based on src folder presence
 * @param {string} name - Collection name to find
 * @param {boolean | null} [hasSrcFolder=null] - Whether template has src/ folder (null to return unmodified path)
 * @returns {CollectionDefinition | undefined} The collection definition or undefined if not found
 */
export const getCollection = (name, hasSrcFolder = null) => {
  const collection = COLLECTIONS.find((c) => c.name === name);
  if (!collection || hasSrcFolder === null) return collection;

  // If hasSrcFolder is false, strip the "src/" prefix from the path
  if (!hasSrcFolder && collection.path.startsWith("src/")) {
    return {
      ...collection,
      path: collection.path.slice(4),
    };
  }

  return collection;
};

/**
 * Get collections that can be selected by users (non-internal, non-required)
 * @returns {CollectionDefinition[]} Selectable collections
 */
export const getSelectableCollections = () =>
  filter((c) => !c.internal && !c.required)(COLLECTIONS);

/**
 * Get required collections
 * @returns {CollectionDefinition[]} Required collections
 */
export const getRequiredCollections = () =>
  filter((c) => c.required)(COLLECTIONS);

/**
 * Get direct dependencies for a collection (empty array if none)
 */
const getCollectionDeps = (name) => getCollection(name)?.dependencies || [];

/**
 * Get all dependencies for selected collections (recursive expansion)
 * @param {string[]} selectedNames - Collection names selected by user
 * @returns {string[]} All collection names including resolved dependencies
 */
export const resolveDependencies = (selectedNames) => {
  const names = [...new Set(selectedNames)];
  const withDeps = unique([...names, ...names.flatMap(getCollectionDeps)]);
  return withDeps.length === names.length
    ? names
    : resolveDependencies(withDeps);
};
