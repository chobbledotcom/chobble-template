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
