import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEME_SCSS_PATH = join(__dirname, "..", "css", "theme.scss");

export default function () {
  return readFileSync(THEME_SCSS_PATH, "utf-8");
}
