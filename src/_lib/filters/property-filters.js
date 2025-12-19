import strings from "#data/strings.js";
import { createFilterConfig } from "#filters/item-filters.js";

const { configure: configurePropertyFilters } = createFilterConfig({
  tag: "property",
  permalinkDir: strings.property_permalink_dir,
  itemsKey: "properties",
  collections: {
    pages: "filteredPropertyPages",
    redirects: "propertyFilterRedirects",
    attributes: "propertyFilterAttributes",
  },
  uiDataFilterName: "buildPropertyFilterUIData",
});

export { configurePropertyFilters };
