/**
 * Unified HTML transform for Eleventy.
 *
 * Performs transforms in phases for optimal performance:
 * 1. String-based phase: URL/email linkification (linkifyjs), external link attrs (tokenizer)
 * 2. DOM-based phase (only when needed): Phone linkification, tables, images
 *
 * DOM parsing is completely skipped when a page has no tables, phone numbers, or local images.
 *
 * FAST_INACCURATE_BUILDS=1 skips all linkification for faster builds.
 */

import linkifyHtmlLib from "linkify-html";
import configModule from "#data/config.js";
import { memoize } from "#toolkit/fp/memoize.js";
import { addExternalLinkAttrs } from "#transforms/external-links.js";
import { processImages } from "#transforms/images.js";
import {
  formatUrlDisplay,
  hasPhonePattern,
  linkifyPhones,
  SKIP_TAGS,
} from "#transforms/linkify.js";
import { hasReadMoreMarker, processReadMore } from "#transforms/read-more.js";
import { wrapTables } from "#transforms/responsive-tables.js";
import { loadDOM } from "#utils/lazy-dom.js";

const getConfig = memoize(configModule);

/**
 * Check if content requires DOM parsing (has tables, images, phone patterns, or read-more markers)
 * @param {string} content
 * @param {number} phoneLen
 * @returns {boolean}
 */
const needsDomParsing = (content, phoneLen) =>
  hasPhonePattern(content, phoneLen) ||
  content.includes("<table") ||
  content.includes('src="/images/') ||
  hasReadMoreMarker(content);

/**
 * Apply DOM-based transforms (phone links, table wrappers, image processing, read-more)
 * Skips phone linkification when FAST_INACCURATE_BUILDS is enabled.
 * @param {string} html
 * @param {object} config
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage
 * @returns {Promise<string>}
 */
const applyDomTransforms = async (html, config, processAndWrapImage) => {
  const dom = await loadDOM(html);
  const { document } = dom.window;
  if (!FAST_INACCURATE_BUILDS) {
    linkifyPhones(document, config);
  }
  wrapTables(document, config);
  processReadMore(document);
  await processImages(document, config, processAndWrapImage);
  return dom.serialize();
};

/**
 * Apply string-based transforms (URL/email linkification, external link attrs)
 * Skips linkification when FAST_INACCURATE_BUILDS is enabled.
 * @param {string} content
 * @param {object} config
 * @returns {string}
 */
const applyStringTransforms = (content, config) => {
  if (FAST_INACCURATE_BUILDS) {
    return addExternalLinkAttrs(content, config);
  }
  return addExternalLinkAttrs(
    linkifyHtmlLib(content, {
      ignoreTags: [...SKIP_TAGS],
      target: config.externalLinksTargetBlank ? "_blank" : null,
      rel: config.externalLinksTargetBlank ? "noopener noreferrer" : null,
      format: { url: formatUrlDisplay },
    }),
    config,
  );
};

/**
 * Check if path is an HTML file
 * @param {unknown} outputPath
 * @returns {outputPath is string}
 */
const isHtmlPath = (outputPath) =>
  typeof outputPath === "string" && outputPath.endsWith(".html");

/**
 * Create the unified HTML transform
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {(content: string, outputPath: string) => Promise<string>}
 */
const createHtmlTransform =
  (processAndWrapImage) => async (content, outputPath) => {
    if (!isHtmlPath(outputPath) || !content) return content;

    const config = await getConfig();
    const result = applyStringTransforms(content, config);

    if (!needsDomParsing(result, config.phoneNumberLength)) return result;
    return applyDomTransforms(result, config, processAndWrapImage);
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
};

export { configureHtmlTransform, createHtmlTransform };
