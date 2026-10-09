/** Literal Markdown for generated references, including GFM table cells. */

/** @param {unknown} value */
export const escapeText = (value) =>
  String(value)
    .replace(/[\\`*_[\]~|<&]/g, "\\$&")
    .replace(/^(\s*)([#>+-])/, "$1\\$2")
    .replace(/^(\s*\d+)([.)])(?=\s)/, "$1\\$2")
    .replace(/\r\n|\r|\n/g, "<br>");

/** @param {string} text @param {number} minimum */
const backtickFence = (text, minimum) =>
  "`".repeat(
    [...text.matchAll(/`+/g)].reduce(
      (longest, [run]) => Math.max(longest, run.length),
      minimum - 1,
    ) + 1,
  );

/** @param {unknown} value */
export const inlineCode = (value) => {
  const text = String(value);
  // Empty/multiline spans and table pipes need HTML to preserve their content
  // consistently both inside and outside GFM tables.
  if (text === "" || /[|\r\n]/.test(text))
    return `<code>${escapeText(text)}</code>`;
  const fence = backtickFence(text, 1);
  // Padding protects edge backticks and spaces from code-span normalization.
  const padding = text.trim() && /^`|`$|^ .* $/.test(text) ? " " : "";
  return `${fence}${padding}${text}${padding}${fence}`;
};

/** Cells are already escaped/formatted by the caller.
 * @param {string[]} headers @param {string[][]} rows
 */
export const markdownTable = (headers, rows) =>
  [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

/** @param {string} text @param {string} language */
export const fencedCode = (text, language) => {
  const fence = backtickFence(text, 3);
  return `${fence}${language}\n${text}${text.endsWith("\n") ? "" : "\n"}${fence}`;
};
