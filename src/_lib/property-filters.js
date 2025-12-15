import strings from "../_data/strings.js";
import { createFilterConfig } from "./item-filters.js";

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
