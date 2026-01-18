/**
 * Unified HTML transform for Eleventy.
 *
 * Consolidates all DOM-based transforms into a single pass per HTML file:
 * - Parse DOM once
 * - Apply all transforms in order
 * - Serialize once
 *
 * This dramatically reduces happy-dom overhead by avoiding multiple
 * parse/serialize cycles per file.
 */

import configModule from "#data/config.js";
import { addExternalLinkAttrs, getExternalLinkAttrs } from "#transforms/external-links.js";
import { processImages } from "#transforms/images.js";
import { linkifyEmails, linkifyPhones, linkifyUrls } from "#transforms/linkify.js";
import { wrapTables } from "#transforms/responsive-tables.js";
import { loadDOM } from "#utils/lazy-dom.js";
import { memoize } from "#utils/memoize.js";

const getConfig = memoize(configModule);

/**
 * Create the unified HTML transform
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {(content: string, outputPath: string) => Promise<string>}
 */
const createHtmlTransform = (processAndWrapImage) => {
  return async (content, outputPath) => {
    if (typeof outputPath !== "string" || !outputPath.endsWith(".html")) {
      return content;
    }
    if (!content) return content;
    if (outputPath.includes("/feed.")) return content;

    const config = await getConfig();
    const dom = await loadDOM(content);
    const { document } = dom.window;

    linkifyUrls(document, config);
    linkifyEmails(document, config);
    linkifyPhones(document, config);
    addExternalLinkAttrs(document, config);
    wrapTables(document, config);
    await processImages(document, config, processAndWrapImage);

    return dom.serialize();
  };
};

/**
 * Configure the unified HTML transform for Eleventy
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage - Image processing function
 */
const configureHtmlTransform = (eleventyConfig, processAndWrapImage) => {
  eleventyConfig.addTransform("htmlTransform", createHtmlTransform(processAndWrapImage));
  eleventyConfig.addFilter("externalLinkAttrs", async (url) => {
    const config = await getConfig();
    return getExternalLinkAttrs(url, config?.externalLinksTargetBlank ?? false);
  });
};

export { configureHtmlTransform, createHtmlTransform };
