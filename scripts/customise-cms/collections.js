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

export const COLLECTIONS = [
  {
    name: "pages",
    label: "Pages",
    path: "src/pages",
    description: "Static pages (about, contact, etc.)",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
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
  },
  {
    name: "news",
    label: "News",
    path: "src/news",
    description: "Blog posts and news articles",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    dependencies: ["team"],
  },
  {
    name: "events",
    label: "Events",
    path: "src/events",
    description: "Events and recurring activities",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
  },
  {
    name: "team",
    label: "Team",
    path: "src/team",
    description: "Team member profiles",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
  },
  {
    name: "reviews",
    label: "Reviews",
    path: "src/reviews",
    description: "Customer reviews and testimonials",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: false,
    dependencies: ["products"],
  },
  {
    name: "locations",
    label: "Locations",
    path: "src/locations",
    description: "Physical locations or service areas",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
    dependencies: ["categories"],
  },
  {
    name: "properties",
    label: "Properties",
    path: "src/properties",
    description: "Holiday lets or rental properties",
    supportsFeatures: true,
    supportsSpecs: true,
    supportsGallery: true,
    dependencies: ["locations"],
  },
  {
    name: "guides",
    label: "Guides",
    path: "src/guides",
    description: "How-to guides and documentation",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
  },
  {
    name: "menus",
    label: "Menus",
    path: "src/menus",
    description: "Restaurant/cafe menus",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
  },
  {
    name: "menu-categories",
    label: "Menu Categories",
    path: "src/menu-categories",
    description: "Menu section categories",
    supportsFeatures: false,
    supportsSpecs: false,
    supportsGallery: true,
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
    internal: true,
  },
];

/**
 * Get collection by name, optionally adjusting path based on src folder presence
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
 */
export const getSelectableCollections = () =>
  filter((c) => !c.internal && !c.required)(COLLECTIONS);

/**
 * Get required collections
 */
export const getRequiredCollections = () =>
  filter((c) => c.required)(COLLECTIONS);

/**
 * Get direct dependencies for a collection (empty array if none)
 */
const getCollectionDeps = (name) => getCollection(name)?.dependencies || [];

/**
 * Get all dependencies for selected collections (recursive expansion)
 */
export const resolveDependencies = (selectedNames) => {
  const names = [...new Set(selectedNames)];
  const withDeps = unique([...names, ...names.flatMap(getCollectionDeps)]);
  return withDeps.length === names.length
    ? names
    : resolveDependencies(withDeps);
};
