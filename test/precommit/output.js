/**
 * Live progress parser for vitest's dot reporter.
 *
 * `vitest run --reporter=dot` streams each finished test as a middle-dot
 * (`\u00b7`). To stay robust against chunk boundaries and against dots that
 * appear inside file paths, version strings or failure blocks
 * (`test/x.test.js`, `v3.2.7`, `../../../../tmp/...`), we only count dot
 * characters from chunks that contain *nothing but* dots and whitespace.
 *
 * When `total` is provided (from the previous run's cached count), progress
 * shows `(N/total passed)` so you know how far along the suite is.
 */
export const createDotsProgress = (total) => {
  const state = { passed: 0 };
  const isPureDots = (chunk) =>
    chunk.length > 0 && /^[.\u00b7\s]*$/.test(chunk);

  return (chunk) => {
    if (isPureDots(chunk)) {
      for (const char of chunk) {
        if (char === "." || char === "\u00b7") state.passed++;
      }
    }
    if (state.passed === 0) return undefined;
    return total
      ? `(${state.passed}/${total} passed)`
      : `(${state.passed} passed)`;
  };
};

/** Extract total test count from vitest's summary line, e.g.
 * `Tests  4200 passed (4200)`. Returns `undefined` when no summary line is
 * found (e.g. the suite crashed before printing one). */
export const extractTestTotal = (output) => {
  const match = output.match(/Tests\s+.*\((\d+)\)/);
  if (!match) return undefined;
  const n = Number.parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const xmlEntities = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

/** Read one XML attribute from a testcase tag. */
const readAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match
    ? match[1].replace(
        /&([a-z]+);/g,
        (entity, key) => xmlEntities[key] ?? entity,
      )
    : undefined;
};

/**
 * Extract test cases slower than thresholdMs from vitest's JUnit reporter output.
 * JUnit times are seconds, so the returned duration is rounded milliseconds.
 *
 * @param {string} junitXml
 * @param {number} [thresholdMs=500]
 * @returns {{ name: string, file?: string, line?: number, durationMs: number }[]}
 */
export const extractSlowTests = (junitXml, thresholdMs = 500) => {
  const testCases = junitXml.matchAll(/<testcase\b[^>]*\/?>/g);

  const slowTests = Array.from(testCases).flatMap((match) => {
    const tag = match[0];
    const seconds = Number.parseFloat(readAttribute(tag, "time") ?? "");
    if (!Number.isFinite(seconds)) return [];

    const durationMs = Math.round(seconds * 1000);
    if (durationMs <= thresholdMs) return [];

    const name = readAttribute(tag, "name") ?? "(unnamed test)";
    const classname = readAttribute(tag, "classname");
    const file = readAttribute(tag, "file");
    const lineText = readAttribute(tag, "line");
    const line = lineText ? Number.parseInt(lineText, 10) : undefined;

    return [
      {
        name: classname ? `${classname} > ${name}` : name,
        file,
        line: Number.isFinite(line) ? line : undefined,
        durationMs,
      },
    ];
  });

  return slowTests.sort((a, b) => b.durationMs - a.durationMs);
};
