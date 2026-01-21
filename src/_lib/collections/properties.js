import { addGallery } from "#collections/products.js";
import { reviewsRedirects, withReviewsPage } from "#collections/reviews.js";
import {
  createArrayFieldIndexer,
  getFeatured,
} from "#utils/collection-utils.js";
import { sortItems } from "#utils/sorting.js";

/** Index properties by location for O(1) lookups, cached per properties array */
const indexByLocation = createArrayFieldIndexer("locations");

const getPropertiesByLocation = (properties, locationSlug) => {
  if (!properties || !locationSlug) return [];
  return (indexByLocation(properties)[locationSlug] ?? []).sort(sortItems);
};

/** Get featured properties - uses shared getFeatured utility */
const getFeaturedProperties = getFeatured;

const propertiesWithReviewsPage = withReviewsPage("properties", addGallery);
const propertyReviewsRedirects = reviewsRedirects("properties");

const configureProperties = (eleventyConfig) => {
  eleventyConfig.addCollection("properties", (collectionApi) =>
    collectionApi.getFilteredByTag("properties").map(addGallery),
  );
  eleventyConfig.addCollection(
    "propertiesWithReviewsPage",
    propertiesWithReviewsPage,
  );
  eleventyConfig.addCollection(
    "propertyReviewsRedirects",
    propertyReviewsRedirects,
  );
  eleventyConfig.addFilter("getPropertiesByLocation", getPropertiesByLocation);
  eleventyConfig.addFilter("getFeaturedProperties", getFeaturedProperties);
};

export { configureProperties };
