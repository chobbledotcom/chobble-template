/**
 * YAML compaction utility
 *
 * Compacts multi-line YAML objects to single lines when they fit within 80 characters.
 * For example, converts:
 *   - name: foo
 *     type: string
 *     label: Foo
 * To:
 *   - { name: foo, type: string, label: Foo }
 */

import { accumulate } from "#utils/array-utils.js";

/**
 * @typedef {Object} KeyValuePair
 * @property {string} key - The key name
 * @property {string} value - The value
 */

/**
 * @typedef {Object} CollectedObject
 * @property {string[]} objectLines - Lines belonging to the object
 * @property {number} nextIndex - Index of the next line after the object
 */

/**
 * Extract indentation level from a line
 * @param {string} line - Line to check
 * @returns {number} Number of spaces at start of line
 */
const getIndent = (line) => {
  const match = line.match(/^( *)/);
  return match ? match[1].length : 0;
};

/**
 * Check if a line should be skipped when converting to inline format
 * @param {string} trimmed - Trimmed line content
 * @returns {boolean} Whether the line should be skipped
 */
const shouldSkipLine = (trimmed) => {
  if (!trimmed || trimmed.startsWith("#")) return true;
  if (trimmed === "-") return true;
  if (trimmed.endsWith(":") && !trimmed.includes(": ")) return true;
  return false;
};

/**
 * Extract a key-value pair from a YAML line
 * @param {string} line - YAML line to parse
 * @returns {KeyValuePair | null} Key-value pair or null if not parseable
 */
const extractKeyValue = (line) => {
  const trimmed = line.trim();
  const colonIndex = trimmed.indexOf(":");
  if (colonIndex === -1) return null;

  const key = trimmed.substring(0, colonIndex).trim();
  const cleanKey = key.replace(/^-\s*/, "");
  const value = trimmed.substring(colonIndex + 1).trim();

  // Only return simple values (no nested structures)
  if (!value || value.startsWith("[") || value.startsWith("{")) {
    return null;
  }

  return { key: cleanKey, value };
};

/**
 * Convert a YAML object (as lines) to inline format
 * e.g., { name: foo, type: string, label: Foo }
 * @param {string[]} lines - YAML lines representing the object
 * @returns {string | null} Inline format string or null if conversion not possible
 */
const objectToInline = (lines) => {
  const pairs = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (shouldSkipLine(trimmed)) continue;

    const pair = extractKeyValue(line);
    if (pair) {
      pairs.push(`${pair.key}: ${pair.value}`);
    }
  }

  return pairs.length > 0 ? `{ ${pairs.join(", ")} }` : null;
};

/**
 * Check if object lines contain nested structures
 * @param {string[]} lines - YAML lines to check
 * @returns {boolean} Whether the lines contain nested structures
 */
const hasNestedStructures = (lines) => {
  for (const line of lines) {
    const trimmed = line.trim();
    // Check for lines that end with : and have no value (indicating nested block)
    if (trimmed.endsWith(":") && !trimmed.includes(": ")) {
      return true;
    }
  }
  return false;
};

/**
 * Collect lines that belong to a YAML list item object
 * @param {string[]} lines - All YAML lines
 * @param {number} startIndex - Index of the list item start
 * @param {number} listIndent - Indentation level of the list
 * @returns {CollectedObject} Object lines and next index
 */
const collectObjectLines = (lines, startIndex, listIndent) => {
  const objectLines = [lines[startIndex]];
  let j = startIndex + 1;

  while (j < lines.length) {
    const nextLine = lines[j];
    const nextIndent = getIndent(nextLine);
    const nextTrimmed = nextLine.trim();

    // Stop if we've dedented back to list level or less
    if (nextIndent <= listIndent && nextTrimmed) {
      break;
    }

    objectLines.push(nextLine);
    j++;
  }

  return { objectLines, nextIndex: j };
};

/**
 * Try to create a compacted inline version of object lines
 * @param {string[]} objectLines - Lines of the YAML object
 * @param {number} listIndent - Indentation level of the list
 * @returns {string | null} Compacted line or null if compaction not possible
 */
const tryCompactLine = (objectLines, listIndent) => {
  if (objectLines.length < 2) {
    return null; // Single line, no benefit to compacting
  }

  // Don't compact objects with nested structures (e.g., options: { ... })
  if (hasNestedStructures(objectLines)) {
    return null;
  }

  const inlineVersion = objectToInline(objectLines);
  if (!inlineVersion) {
    return null; // Couldn't create inline version
  }

  const fullInlineLine = `${" ".repeat(listIndent)}- ${inlineVersion}`;

  // Only use inline version if it stays under 80 chars
  if (fullInlineLine.length <= 80) {
    return fullInlineLine;
  }

  return null; // Line too long
};

/**
 * Check if a line is a list item start (- key: value pattern)
 */
const isListItemStart = (trimmed) =>
  trimmed.startsWith("- ") && trimmed.includes(":");

/**
 * Process a single line or list item, returning the output line(s) and next index
 */
const processLine = (lines, i) => {
  const line = lines[i];
  const indent = getIndent(line);
  const trimmed = line.trim();

  if (!isListItemStart(trimmed)) {
    return { output: [line], nextIndex: i + 1 };
  }

  const { objectLines, nextIndex } = collectObjectLines(lines, i, indent);
  const compactedLine = tryCompactLine(objectLines, indent);

  return compactedLine
    ? { output: [compactedLine], nextIndex }
    : { output: [line], nextIndex: i + 1 };
};

/**
 * Compact YAML by converting multi-line objects to inline format when appropriate
 * @param {string} yamlString - YAML string to compact
 * @returns {string} Compacted YAML string
 */
export const compactYaml = (yamlString) => {
  const lines = yamlString.split("\n");

  const processFrom = (index, acc) => {
    if (index >= lines.length) return acc;
    const { output, nextIndex } = processLine(lines, index);
    return processFrom(nextIndex, accumulate(acc, ...output));
  };

  return processFrom(0, []).join("\n");
};
