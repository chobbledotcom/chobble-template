import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/* jscpd:ignore-start -- declaration data: derived directory paths */
const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..");
const ROOT_DIR = join(SRC_DIR, "..");
const IMAGES_DIR = join(SRC_DIR, "images");
const PAGES_DIR = join(SRC_DIR, "pages");

/* jscpd:ignore-end */

// Re-export join since `join(SRC_DIR, ...)` is a common pattern
export { IMAGES_DIR, join, PAGES_DIR, ROOT_DIR, SRC_DIR };
