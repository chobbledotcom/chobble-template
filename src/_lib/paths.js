import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// src/ directory (parent of _lib/)
const SRC_DIR = join(__dirname, "..");

// Key directories under src/
const IMAGES_DIR = join(SRC_DIR, "images");
const PAGES_DIR = join(SRC_DIR, "pages");
const DATA_DIR = join(SRC_DIR, "_data");

export { SRC_DIR, IMAGES_DIR, PAGES_DIR, DATA_DIR };
