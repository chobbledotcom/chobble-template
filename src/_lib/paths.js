import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// src/ directory (parent of _lib/)
const SRC_DIR = join(__dirname, "..");

// Project root directory (parent of src/)
const ROOT_DIR = join(SRC_DIR, "..");

// Test directory
const TEST_DIR = join(ROOT_DIR, "test");

// Key directories under src/
const IMAGES_DIR = join(SRC_DIR, "images");
const PAGES_DIR = join(SRC_DIR, "pages");
const DATA_DIR = join(SRC_DIR, "_data");

export { SRC_DIR, ROOT_DIR, TEST_DIR, IMAGES_DIR, PAGES_DIR, DATA_DIR };
