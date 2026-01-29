import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const PAGE_LAYOUTS_DIR = join(ROOT_DIR, "src/_data/page-layouts");

/**
 * Load all page layout JSON files using Bun.file().json() for faster parsing.
 * Files are loaded in parallel for better performance.
 */
export default await (async () => {
  const files = readdirSync(PAGE_LAYOUTS_DIR).filter((f) =>
    f.endsWith(".json"),
  );

  const entries = await Promise.all(
    files.map(async (file) => [
      basename(file, ".json"),
      await Bun.file(join(PAGE_LAYOUTS_DIR, file)).json(),
    ]),
  );

  return Object.fromEntries(entries);
})();
