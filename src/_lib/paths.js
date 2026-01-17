import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// src/ directory (parent of _lib/)
const SRC_DIR = join(__dirname, "..");

// Project root directory (parent of src/)
const ROOT_DIR = join(SRC_DIR, "..");

// Key directories under src/
const IMAGES_DIR = join(SRC_DIR, "images");
const PAGES_DIR = join(SRC_DIR, "pages");

export { SRC_DIR, ROOT_DIR, IMAGES_DIR, PAGES_DIR };
