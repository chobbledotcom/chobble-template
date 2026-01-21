/**
 * HTML Tokenizer types
 *
 * Types for the simple-html-tokenizer library and our wrapper utilities.
 * Based on @nfrasser/simple-html-tokenizer token shapes.
 */

/**
 * Attribute tuple: [name, value, isQuoted]
 * - name: attribute name (e.g., "href", "class")
 * - value: attribute value (e.g., "test.html", "btn primary")
 * - isQuoted: whether the value was quoted in the original HTML
 */
export type HtmlAttribute = [name: string, value: string, isQuoted: boolean];

/**
 * Character content token (plain text between tags)
 */
export type CharsToken = {
  type: 'Chars';
  chars: string;
};

/**
 * HTML comment token
 */
export type CommentToken = {
  type: 'Comment';
  chars: string;
};

/**
 * Opening tag token
 */
export type StartTagToken = {
  type: 'StartTag';
  tagName: string;
  attributes: HtmlAttribute[];
  selfClosing: boolean;
};

/**
 * Closing tag token
 */
export type EndTagToken = {
  type: 'EndTag';
  tagName: string;
};

/**
 * DOCTYPE declaration token
 */
export type DoctypeToken = {
  type: 'Doctype';
  name: string;
};

/**
 * Union of all possible HTML token types
 */
export type HtmlToken =
  | CharsToken
  | CommentToken
  | StartTagToken
  | EndTagToken
  | DoctypeToken;

/**
 * Token type discriminator values
 */
export type HtmlTokenType = HtmlToken['type'];

/**
 * Function that transforms a token, returning a modified (or same) token
 */
export type TokenTransformFn = (token: HtmlToken) => HtmlToken;
