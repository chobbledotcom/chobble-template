import fs from "node:fs";
import path from "node:path";

/**
 * Removes the shared test/.test-sites root once the whole run is over.
 *
 * This runs in vitest's main process after every worker has finished, so it
 * cannot race in-flight fixture builds. A per-file afterAll cannot make that
 * guarantee under parallel workers: other files' sites live in the same root
 * and may still be mid-build when one file finishes.
 */
export const teardown = () => {
  const testSitesDir = path.join(import.meta.dirname, ".test-sites");
  fs.rmSync(testSitesDir, { recursive: true, force: true });
};
