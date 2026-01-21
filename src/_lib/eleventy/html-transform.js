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
import { addExternalLinkAttrs } from "#transforms/external-links.js";
import { processImages } from "#transforms/images.js";
import {
  formatUrlDisplay,
  linkifyPhones,
  SKIP_TAGS,
} from "#transforms/linkify.js";
import { wrapTables } from "#transforms/responsive-tables.js";
import { loadDOM } from "#utils/lazy-dom.js";

const getConfig = memoize(configModule);

/** @param {boolean} targetBlank */
const buildLinkifyOptions = (targetBlank) => ({
  ignoreTags: [...SKIP_TAGS],
  target: targetBlank ? "_blank" : null,
  rel: targetBlank ? "noopener noreferrer" : null,
  format: { url: formatUrlDisplay },
});

/** @param {string} content @param {number} phoneLen */
const hasPhonePattern = (content, phoneLen) =>
  phoneLen > 0 &&
  new RegExp(`\\b\\d(?:\\s*\\d){${phoneLen - 1}}\\b`).test(content);

/** @param {string} c @param {number} phoneLen */
const needsDom = (c, phoneLen) =>
  hasPhonePattern(c, phoneLen) ||
  c.includes("<table") ||
  c.includes('src="/images/');

/**
 * Create the unified HTML transform
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage - Image processing function
 * @returns {(content: string, outputPath: string) => Promise<string>}
 */
const createHtmlTransform =
  (processAndWrapImage) => async (content, outputPath) => {
    if (
      typeof outputPath !== "string" ||
      !outputPath.endsWith(".html") ||
      !content
    ) {
      return content;
    }
    const config = await getConfig();
    const targetBlank = config?.externalLinksTargetBlank ?? false;
    const phoneLen = config?.phoneNumberLength ?? 11;

    // Phase 1: String-based transforms (no DOM)
    const linkified = linkifyHtmlLib(content, buildLinkifyOptions(targetBlank));
    const result = addExternalLinkAttrs(linkified, config);

    // Phase 2: DOM-based transforms (only if needed)
    if (!needsDom(result, phoneLen)) return result;
    const dom = await loadDOM(result);
    const { document } = dom.window;
    linkifyPhones(document, config);
    wrapTables(document, config);
    await processImages(document, config, processAndWrapImage);
    return dom.serialize();
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

export {
  buildLinkifyOptions,
  configureHtmlTransform,
  createHtmlTransform,
  hasPhonePattern,
  needsDom,
};
