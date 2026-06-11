import { readFileSync } from "node:fs";
import { join, SRC_DIR } from "#lib/paths.js";

const THEME_SCSS_PATH = join(SRC_DIR, "css", "theme.scss");

export default () => readFileSync(THEME_SCSS_PATH, "utf-8");
