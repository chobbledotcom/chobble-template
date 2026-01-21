/**
 * Unified HTML transform for Eleventy.
 *
 * Performs transforms in two phases for optimal performance:
 * 1. String-based phase: URL/email linkification (no DOM needed, uses linkifyjs)
 * 2. DOM-based phase: Phone linkification, external links, tables, images
 *
 * This dramatically reduces happy-dom overhead by avoiding DOM parsing
 * for URL/email linkification entirely.
 */

import linkifyHtmlLib from "linkify-html";
import configModule from "#data/config.js";
import { memoize } from "#toolkit/fp/memoize.js";
import {
  addExternalLinkAttrs,
  getExternalLinkAttrs,
} from "#transforms/external-links.js";
import { processImages } from "#transforms/images.js";
import {
  formatUrlDisplay,
  linkifyPhones,
  SKIP_TAGS,
} from "#transforms/linkify.js";
import { wrapTables } from "#transforms/responsive-tables.js";
import { loadDOM } from "#utils/lazy-dom.js";

const getConfig = memoize(configModule);

/**
 * Create the unified HTML transform
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {(content: string, outputPath: string) => Promise<string>}
 */
const createHtmlTransform = (processAndWrapImage) => {
  const buildLinkifyOptions = (targetBlank) => ({
    ignoreTags: [...SKIP_TAGS],
    target: targetBlank ? "_blank" : null,
    rel: targetBlank ? "noopener noreferrer" : null,
    format: { url: formatUrlDisplay },
  });
  return async (content, outputPath) => {
    if (typeof outputPath !== "string" || !outputPath.endsWith(".html")) {
      return content;
    }
    if (!content) return content;
    const config = await getConfig();
    const targetBlank = config?.externalLinksTargetBlank ?? false;
    const linkified = linkifyHtmlLib(content, buildLinkifyOptions(targetBlank));
    const dom = await loadDOM(linkified);
    const { document } = dom.window;
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
  eleventyConfig.addTransform(
    "htmlTransform",
    createHtmlTransform(processAndWrapImage),
  );
  eleventyConfig.addFilter("externalLinkAttrs", async (url) => {
    const config = await getConfig();
    return getExternalLinkAttrs(url, config?.externalLinksTargetBlank ?? false);
  });
};

export { configureHtmlTransform, createHtmlTransform };
