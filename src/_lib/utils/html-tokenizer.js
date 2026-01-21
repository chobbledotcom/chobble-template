/**
 * HTML tokenizer utilities.
 *
 * Provides functions for tokenizing HTML and generating HTML from tokens.
 * Uses @nfrasser/simple-html-tokenizer for parsing.
 */
import { tokenize } from "@nfrasser/simple-html-tokenizer";

/** Token type to HTML string converters */
const tokenToHtml = {
  Chars: (/** @type {{chars: string}} */ t) => t.chars,
  Comment: (/** @type {{chars: string}} */ t) => `<!--${t.chars}-->`,
  StartTag: (
    /** @type {{tagName: string, attributes: Array<[string, string, boolean]>, selfClosing: boolean}} */ t,
  ) => {
    const attrToHtml = ([name, value, isQuoted]) =>
      isQuoted ? `${name}="${value}"` : value ? `${name}=${value}` : name;
    const attrs = t.attributes.map(attrToHtml).join(" ");
    const attrStr = attrs ? ` ${attrs}` : "";
    return t.selfClosing
      ? `<${t.tagName}${attrStr} />`
      : `<${t.tagName}${attrStr}>`;
  },
  EndTag: (/** @type {{tagName: string}} */ t) => `</${t.tagName}>`,
  Doctype: (/** @type {{name: string}} */ t) => `<!DOCTYPE ${t.name}>`,
};

/**
 * Generate HTML string from an array of tokens
 * @param {Array<object>} tokens
 * @returns {string}
 */
const tokensToHtml = (tokens) =>
  tokens.map((token) => tokenToHtml[token.type]?.(token) ?? "").join("");

/**
 * Tokenize HTML, transform tokens, and regenerate HTML.
 * @param {string} html
 * @param {(token: object) => object} transformFn - Function to transform each token
 * @returns {string}
 */
const transformHtml = (html, transformFn) =>
  tokensToHtml(tokenize(html).map(transformFn));

export { transformHtml };
