/**
 * Collection definitions for CMS customisation
 *
 * Each collection has:
 * - name: Internal collection name
 * - label: Display label in CMS
 * - path: Path to content files
 * - description: Human-readable description for prompts
 * - dependencies: Other collections this one requires
 */

import { filter, unique } from "#utils/fp/array.js";

/**
 * @typedef {Object} CollectionDefinition
 * @property {string} name - Internal collection name
 * @property {string} label - Display label in CMS
 * @property {string} path - Path to content files
 * @property {string} description - Human-readable description for prompts
 * @property {string[]} dependencies - Collections this one requires (empty when none)
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
    dependencies: [],
    required: true,
  },
  {
    name: "news",
    label: "News",
    path: "src/news",
    description: "Blog posts and news articles",
    dependencies: [],
  },
  {
    name: "guide-categories",
    label: "Guide Categories",
    path: "src/guide-categories",
    description: "Categories for organizing guide pages",
    dependencies: [],
  },
  {
    name: "guide-pages",
    label: "Guide Pages",
    path: "src/guide-pages",
    description: "Individual guide/documentation pages",
    dependencies: ["guide-categories"],
  },
  {
    name: "snippets",
    label: "Snippets",
    path: "src/snippets",
    description: "Reusable content snippets",
    dependencies: [],
    internal: true,
    required: true,
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
 * Get direct dependencies for a collection. Every definition carries an
 * explicit dependencies array, so an unknown name fails loudly here.
 * @param {string} name
 */
const getCollectionDeps = (name) => {
  const collection = getCollection(name);
  if (!collection) throw new Error(`Unknown collection "${name}"`);
  return collection.dependencies;
};

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
