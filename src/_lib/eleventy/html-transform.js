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
import { FAST_INACCURATE_BUILDS } from "#build/build-mode.js";
import configModule from "#data/config.js";
import linksMap from "#data/links.json" with { type: "json" };
import { memoize } from "#toolkit/fp/memoize.js";
import { encryptEmails, hasMailtoLinks } from "#transforms/encrypt-emails.js";
import { addExternalLinkAttrs } from "#transforms/external-links.js";
import { processImages } from "#transforms/images.js";
import {
  formatUrlDisplay,
  hasConfigLinks,
  hasPhonePattern,
  linkifyConfigLinks,
  linkifyPhones,
  SKIP_TAGS,
} from "#transforms/linkify.js";
import {
  extractRawTextElements,
  restoreRawTextElements,
} from "#transforms/raw-text-guard.js";
import { hasReadMoreMarker, processReadMore } from "#transforms/read-more.js";
import { wrapTables } from "#transforms/responsive-tables.js";
import { loadDOM, withDOMSlot } from "#utils/lazy-dom.js";

const getConfig = memoize(configModule);

/**
 * Check if content requires DOM parsing (has tables, images, phone patterns, read-more markers, or config links)
 * @param {string} content
 * @param {number} phoneLen
 * @returns {boolean}
 */
const needsDomParsing = (content, phoneLen) =>
  hasPhonePattern(content, phoneLen) ||
  content.includes("<table") ||
  content.includes('src="/images/') ||
  hasReadMoreMarker(content) ||
  hasConfigLinks(content, linksMap) ||
  hasMailtoLinks(content);

/**
 * Apply DOM-based transforms (phone links, table wrappers, image processing, read-more)
 * Skips phone linkification when FAST_INACCURATE_BUILDS is enabled.
 * @param {string} html
 * @param {object} config
 * @param {import("#lib/types").ProcessImageFn} processAndWrapImage
 * @returns {Promise<string>}
 */
const applyDomTransforms = (html, config, processAndWrapImage) =>
  withDOMSlot(async () => {
    const dom = await loadDOM(html);
    const { document } = dom.window;
    if (!FAST_INACCURATE_BUILDS) {
      linkifyPhones(document, config);
      linkifyConfigLinks(document, linksMap);
    }
    wrapTables(document, config);
    processReadMore(document);
    await processImages(document, config, processAndWrapImage);
    encryptEmails(document);
    return dom.serialize();
  });

/**
 * Linkify URLs/emails with raw-text elements guarded: linkify-html's
 * ignoreTags only prevents linkification, but its tokenizer still
 * entity-escapes script/style text nodes when re-serialising, corrupting
 * inline JS and CSS. Extract those elements first and restore them after.
 * @param {string} content
 * @param {object} config
 * @returns {string}
 */
const linkifyHtml = (content, config) => {
  const { content: guarded, blocks } = extractRawTextElements(content);
  const linkified = linkifyHtmlLib(guarded, {
    ignoreTags: [...SKIP_TAGS],
    target: config.externalLinksTargetBlank ? "_blank" : null,
    rel: config.externalLinksTargetBlank ? "noopener noreferrer" : null,
    format: { url: formatUrlDisplay },
  });
  return restoreRawTextElements(linkified, blocks);
};

/**
 * Apply string-based transforms (URL/email linkification, external link attrs)
 * Skips linkification when FAST_INACCURATE_BUILDS is enabled.
 * @param {string} content
 * @param {object} config
 * @returns {string}
 */
const applyStringTransforms = (content, config) => {
  const processed =
    FAST_INACCURATE_BUILDS || !config.linkify_urls
      ? content
      : linkifyHtml(content, config);
  return addExternalLinkAttrs(processed, config);
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
