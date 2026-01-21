/**
 * Unified HTML transform for Eleventy.
 *
 * Performs transforms in phases for optimal performance:
 * 1. String-based phase: URL/email linkification (linkifyjs), external link attrs (tokenizer)
 * 2. DOM-based phase (only when needed): Phone linkification, tables, images
 *
 * DOM parsing is completely skipped when a page has no tables, phone numbers, or local images.
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
 * Check if content needs phone linkification
 * @param {string} content
 * @param {number} phoneLen
 * @returns {boolean}
 */
const needsPhoneLinkification = (content, phoneLen) => {
  if (phoneLen <= 0) return false;
  const digitCount = content.replace(/[^\d]/g, "").length;
  return digitCount >= phoneLen;
};

/** @param {string} content */
const needsTableWrapping = (content) => content.includes("<table");

/** @param {string} content */
const needsImageProcessing = (content) => content.includes('src="/images/');

/**
 * Check if DOM-based transforms are needed
 * @param {string} content
 * @param {number} phoneLen
 * @returns {boolean}
 */
const needsDomTransforms = (content, phoneLen) =>
  needsPhoneLinkification(content, phoneLen) ||
  needsTableWrapping(content) ||
  needsImageProcessing(content);

/**
 * Build linkify-html options
 * @param {boolean} targetBlank
 * @returns {object}
 */
const buildLinkifyOptions = (targetBlank) => ({
  ignoreTags: [...SKIP_TAGS],
  target: targetBlank ? "_blank" : null,
  rel: targetBlank ? "noopener noreferrer" : null,
  format: { url: formatUrlDisplay },
});

/**
 * Apply string-based transforms (no DOM parsing)
 * @param {string} content
 * @param {object} config
 * @returns {string}
 */
const applyStringTransforms = (content, config) => {
  const targetBlank = config?.externalLinksTargetBlank ?? false;
  const linkified = linkifyHtmlLib(content, buildLinkifyOptions(targetBlank));
  return addExternalLinkAttrs(linkified, config);
};

/**
 * Apply DOM-based transforms
 * @param {string} content
 * @param {object} config
 * @param {Function} processAndWrapImage
 * @returns {Promise<string>}
 */
const applyDomTransforms = async (content, config, processAndWrapImage) => {
  const dom = await loadDOM(content);
  const { document } = dom.window;
  linkifyPhones(document, config);
  wrapTables(document, config);
  await processImages(document, config, processAndWrapImage);
  return dom.serialize();
};

/**
 * Check if transform should be skipped
 * @param {string} content
 * @param {string} outputPath
 * @returns {boolean}
 */
const shouldSkipTransform = (content, outputPath) =>
  typeof outputPath !== "string" || !outputPath.endsWith(".html") || !content;

/**
 * Create the unified HTML transform
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {(content: string, outputPath: string) => Promise<string>}
 */
const createHtmlTransform =
  (processAndWrapImage) => async (content, outputPath) => {
    if (shouldSkipTransform(content, outputPath)) return content;

    const config = await getConfig();
    const phoneLen = config?.phoneNumberLength ?? 11;
    const result = applyStringTransforms(content, config);

    return needsDomTransforms(result, phoneLen)
      ? applyDomTransforms(result, config, processAndWrapImage)
      : result;
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
