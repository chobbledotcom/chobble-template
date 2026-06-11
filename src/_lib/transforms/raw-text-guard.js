/**
 * String-level guard for raw-text elements (<script> and <style>).
 *
 * HTML treats script and style bodies as raw text: browsers never decode
 * character entities inside them. String transforms that tokenize and
 * re-serialise whole pages (like linkify-html) entity-escape every text
 * node, including these, silently corrupting inline JavaScript
 * (`(a) => a` becomes `(a) =&gt; a`) and CSS (`.a > .b` becomes
 * `.a &gt; .b`). Extract the elements before such a transform and restore
 * them afterwards so their bodies pass through byte-for-byte.
 */

/** Matches a complete <script> or <style> element, including its body */
const RAW_TEXT_ELEMENT_PATTERN = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** @type {(index: number) => string} */
const placeholderFor = (index) => `\u0000raw-text-${index}\u0000`;

/**
 * Replace raw-text elements with placeholders, returning the extracted
 * elements alongside the substituted content. NUL bytes cannot appear in
 * valid HTML, so the placeholders cannot collide with page content.
 * @param {string} content
 * @returns {{ content: string, blocks: string[] }}
 */
const extractRawTextElements = (content) => {
  if (content.includes("\u0000")) {
    throw new Error(
      "Content contains NUL bytes; cannot guard raw-text elements",
    );
  }
  const blocks = [...content.matchAll(RAW_TEXT_ELEMENT_PATTERN)].map(
    ([element]) => element,
  );
  const extracted = blocks.reduce(
    (acc, element, index) => acc.replace(element, () => placeholderFor(index)),
    content,
  );
  return { content: extracted, blocks };
};

/**
 * Restore previously extracted raw-text elements. The replacement uses a
 * function so `$` sequences inside script bodies are not treated as
 * substitution patterns.
 * @param {string} content
 * @param {string[]} blocks
 * @returns {string}
 */
const restoreRawTextElements = (content, blocks) =>
  blocks.reduce((acc, element, index) => {
    const placeholder = placeholderFor(index);
    if (!acc.includes(placeholder)) {
      throw new Error(`Raw-text placeholder ${index} missing after transform`);
    }
    return acc.replace(placeholder, () => element);
  }, content);

export { extractRawTextElements, restoreRawTextElements };
