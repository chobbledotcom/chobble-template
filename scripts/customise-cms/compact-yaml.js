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

/**
 * Extract indentation level from a line
 */
const getIndent = (line) => {
  const match = line.match(/^( *)/);
  return match ? match[1].length : 0;
};

/**
 * Check if a line should be skipped when converting to inline format
 */
const shouldSkipLine = (trimmed) => {
  if (!trimmed || trimmed.startsWith("#")) return true;
  if (trimmed === "-") return true;
  if (trimmed.endsWith(":") && !trimmed.includes(": ")) return true;
  return false;
};

/**
 * Extract a key-value pair from a YAML line
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
 * Collect lines that belong to a YAML list item object
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

    // Stop at nested complex structures (lines ending with : that start new blocks)
    if (nextTrimmed.endsWith(":") && nextIndent > listIndent) {
      break;
    }

    objectLines.push(nextLine);
    j++;
  }

  return { objectLines, nextIndex: j };
};

/**
 * Try to create a compacted inline version of object lines
 */
const tryCompactLine = (objectLines, listIndent) => {
  if (objectLines.length < 2) {
    return null; // Single line, no benefit to compacting
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
 * Compact YAML by converting multi-line objects to inline format when appropriate
 */
export const compactYaml = (yamlString) => {
  const lines = yamlString.split("\n");
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    // Look for list item start (- key: value pattern)
    if (trimmed.startsWith("- ") && trimmed.includes(":")) {
      const { objectLines, nextIndex } = collectObjectLines(lines, i, indent);
      const compactedLine = tryCompactLine(objectLines, indent);

      if (compactedLine) {
        result.push(compactedLine);
        i = nextIndex;
      } else {
        result.push(line);
        i++;
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join("\n");
};
