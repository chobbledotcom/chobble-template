/**
 * Filter system types
 *
 * Types for the URL-based filtering system used by products and properties.
 */

/**
 * A single filter attribute (name-value pair)
 */
export type { PagesCMSFilterAttribute as FilterAttribute } from './pages-cms-generated.d.ts';

/**
 * A set of active filters (key-value pairs)
 */
export type FilterSet = Record<string, string>;

/**
 * A filter combination with URL path and item count
 */
export type FilterCombination = {
  filters: FilterSet;
  path: string;
  count: number;
};

/**
 * Extracted filter attribute data from collection items
 */
export type FilterAttributeData = {
  attributes: Record<string, string[]>;
  displayLookup: Record<string, string>;
};

/**
 * A single filter option in the UI
 */
export type FilterOption = {
  value: string;
  url: string;
  active: boolean;
};

/**
 * A group of filter options for a single attribute
 */
export type FilterGroup = {
  name: string;
  label: string;
  options: FilterOption[];
};

/**
 * An active filter that can be removed
 */
export type ActiveFilter = {
  key: string;
  value: string;
  removeUrl: string;
};

/**
 * Complete filter UI data for rendering
 */
export type FilterUIData = {
  hasFilters: boolean;
  hasActiveFilters?: boolean;
  activeFilters?: ActiveFilter[];
  clearAllUrl?: string;
  groups?: FilterGroup[];
};

/**
 * Configuration options for setting up a filterable collection
 */
export type FilterConfigOptions = {
  tag: string;
  permalinkDir: string;
  itemsKey: string;
  collections: {
    pages: string;
    redirects: string;
    attributes: string;
  };
  uiDataFilterName: string;
};
