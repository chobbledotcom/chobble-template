import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// src/ directory (parent of _lib/)
const SRC_DIR = join(__dirname, "..");

// Key directories under src/
const IMAGES_DIR = join(SRC_DIR, "images");
const PAGES_DIR = join(SRC_DIR, "pages");
const DATA_DIR = join(SRC_DIR, "_data");

/**
 * Test infrastructure files that legitimately need to use ".." for path navigation.
 * These files calculate the project root for all other tests to import.
 */
function getTestInfrastructureFiles() {
  return [
    "test/test-utils.js",
    "test/test-site-factory.js",
    "test/run-all-tests.js",
    "test/run-coverage.js",
  ];
}

export { SRC_DIR, IMAGES_DIR, PAGES_DIR, DATA_DIR, getTestInfrastructureFiles };
