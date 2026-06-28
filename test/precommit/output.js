/**
 * Live progress parser for `bun test --dots`.
 *
 * `bun test --dots` streams each passing test as a single `.` chunk to stderr
 * (the version line goes to stdout). To stay robust against chunk boundaries
 * and against dots that appear inside file paths, version strings or failure
 * blocks (`test/x.test.js`, `v1.3.13`, `../../../../tmp/...`), we only count
 * `.` characters from chunks that contain *nothing but* dots and whitespace.
 *
 * When `total` is provided (from the previous run's cached count), progress
 * shows `(N/total passed)` so you know how far along the suite is.
 */
export const createDotsProgress = (total) => {
  const state = { passed: 0 };
  const isPureDots = (chunk) => chunk.length > 0 && /^[.\s]*$/.test(chunk);

  return (chunk) => {
    if (isPureDots(chunk)) {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === ".") state.passed++;
      }
    }
    if (state.passed === 0) return undefined;
    return total
      ? `(${state.passed}/${total} passed)`
      : `(${state.passed} passed)`;
  };
};

/** Extract total test count from `bun test` summary output like
 * `Ran 4200 tests across 200 files. [45000.00ms]`. Returns `undefined` when
 * no summary line is found (e.g. the suite crashed before printing one). */
export const extractTestTotal = (output) => {
  const match = output.match(/Ran (\d+) tests?/);
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
 * Extract test cases slower than thresholdMs from Bun's JUnit reporter output.
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
