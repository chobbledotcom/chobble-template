import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { ROOT_DIR } from "#lib/paths.js";

const PAGE_LAYOUTS_DIR = join(ROOT_DIR, "src/_data/page-layouts");

const loadPageLayouts = () => {
  if (!existsSync(PAGE_LAYOUTS_DIR)) {
    return {};
  }

  const files = readdirSync(PAGE_LAYOUTS_DIR).filter((f) =>
    f.endsWith(".json"),
  );

  return Object.fromEntries(
    files.map((file) => {
      const slug = basename(file, ".json");
      const filePath = join(PAGE_LAYOUTS_DIR, file);
      const content = readFileSync(filePath, "utf-8");
      return [slug, JSON.parse(content)];
    }),
  );
};

export default loadPageLayouts();
