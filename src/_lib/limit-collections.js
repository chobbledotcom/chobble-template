import fg from "fast-glob";
import production from "../_data/production.js";

const COLLECTION_LIMIT = 10;

const COLLECTIONS_TO_LIMIT = [
  { name: "news", glob: "./src/news/**/*.md" },
  { name: "products", glob: "./src/products/**/*.md" },
];

const limitCollection = (eleventyConfig, { name, glob }) => {
  const files = fg
    .sync(glob, { stats: true })
    .sort((a, b) => b.stats.birthtimeMs - a.stats.birthtimeMs)
    .splice(COLLECTION_LIMIT);

  if (files.length > 0) {
    console.log(
      `Trimming ${files.length} ${name} items in dev mode (keeping latest ${COLLECTION_LIMIT})`,
    );
    files.forEach((f) => eleventyConfig.ignores.add(f.path));
  } else {
    console.log(
      `Not trimming ${name} - ${COLLECTION_LIMIT} or fewer items found`,
    );
  }
};

const configureLimitCollections = (eleventyConfig) => {
  if (production) {
    console.log("Production build - including all collection items");
    return;
  }

  COLLECTIONS_TO_LIMIT.forEach((collection) =>
    limitCollection(eleventyConfig, collection),
  );
};

export { configureLimitCollections, limitCollection, COLLECTION_LIMIT };
