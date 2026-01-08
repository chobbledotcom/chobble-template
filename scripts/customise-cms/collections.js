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

import { filter } from "#utils/array-utils.js";

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
 * Get collection by name
 */
export const getCollection = (name) => COLLECTIONS.find((c) => c.name === name);

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
 * Get all dependencies for selected collections
 */
export const resolveDependencies = (selectedNames) => {
  const resolved = new Set(selectedNames);

  const addDeps = (name) => {
    const collection = getCollection(name);
    if (collection?.dependencies) {
      for (const dep of collection.dependencies) {
        if (!resolved.has(dep)) {
          resolved.add(dep);
          addDeps(dep);
        }
      }
    }
  };

  for (const name of selectedNames) {
    addDeps(name);
  }

  return [...resolved];
};
