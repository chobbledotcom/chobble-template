import strings from "#data/strings.js";
import { createFilterConfig } from "#filters/item-filters.js";

const { configure: configureProductFilters } = createFilterConfig({
  tag: "product",
  permalinkDir: strings.product_permalink_dir,
  itemsKey: "products",
  collections: {
    pages: "filteredProductPages",
    redirects: "filterRedirects",
    attributes: "filterAttributes",
  },
  uiDataFilterName: "buildFilterUIData",
});

export { configureProductFilters };
