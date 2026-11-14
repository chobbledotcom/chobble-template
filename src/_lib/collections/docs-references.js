/**
 * Registers the docs-references collection the paginated reference template
 * consumes. The items come from `#utils/docs-references.js`, which reads
 * the repository's reference documents and publish-transforms them.
 */
import { buildDocsReferences } from "#utils/docs-references.js";

/** @param {*} eleventyConfig */
const configureDocsReferences = (eleventyConfig) => {
  eleventyConfig.addCollection("docsReferences", () => buildDocsReferences());
};

export { configureDocsReferences };
