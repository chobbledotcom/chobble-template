/**
 * Merges the base spec icons with any user-provided overrides
 *
 * Keys are normalized spec names (lowercase, trimmed)
 * Values are icon filenames in assets/icons/
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import baseIcons from "./specs-icons-base.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

let userIcons = {};
try {
  const userIconsPath = join(__dirname, "./specs_icons.json");
  userIcons = JSON.parse(readFileSync(userIconsPath, "utf-8"));
} catch {
  // No user overrides
}

export default {
  ...baseIcons,
  ...userIcons,
};
