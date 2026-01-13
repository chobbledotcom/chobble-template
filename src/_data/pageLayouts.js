import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const PAGE_LAYOUTS_DIR = join(ROOT_DIR, "src/_data/page-layouts");

const loadPageLayouts = () =>
  Object.fromEntries(
    readdirSync(PAGE_LAYOUTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((file) => [
        basename(file, ".json"),
        JSON.parse(readFileSync(join(PAGE_LAYOUTS_DIR, file), "utf-8")),
      ]),
  );

export default loadPageLayouts();
