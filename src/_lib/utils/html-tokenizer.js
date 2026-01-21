/**
 * HTML tokenizer utilities.
 *
 * Provides functions for tokenizing HTML and generating HTML from tokens.
 * Uses @nfrasser/simple-html-tokenizer for parsing.
 *
 * @typedef {import('#lib/types').HtmlAttribute} HtmlAttribute
 * @typedef {import('#lib/types').HtmlToken} HtmlToken
 * @typedef {import('#lib/types').TokenTransformFn} TokenTransformFn
 */
import { tokenize } from "@nfrasser/simple-html-tokenizer";

/**
 * Token type to HTML string converters.
 * @type {Record<string, (token: any) => string>}
 */
const TOKEN_CONVERTERS = {
  Chars: (t) => t.chars,
  Comment: (t) => `<!--${t.chars}-->`,
  StartTag: (t) => {
    const serializeAttr = ([name, value, isQuoted]) =>
      !value ? name : isQuoted ? `${name}="${value}"` : `${name}=${value}`;
    const attrs = t.attributes.map(serializeAttr).join(" ");
    const attrStr = attrs ? ` ${attrs}` : "";
    return t.selfClosing
      ? `<${t.tagName}${attrStr} />`
      : `<${t.tagName}${attrStr}>`;
  },
  EndTag: (t) => `</${t.tagName}>`,
  Doctype: (t) => `<!DOCTYPE ${t.name}>`,
};

/**
 * Tokenize HTML, transform each token, and regenerate HTML.
 * @param {string} html - Input HTML string
 * @param {TokenTransformFn} transformFn - Function to transform each token
 * @returns {string} Transformed HTML string
 */
const transformHtml = (html, transformFn) =>
  tokenize(html)
    .map(transformFn)
    .map((token) => TOKEN_CONVERTERS[token.type]?.(token) ?? "")
    .join("");

export { transformHtml };
