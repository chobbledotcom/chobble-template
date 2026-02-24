import { readdirSync } from "node:fs";
import { join } from "node:path";
import { SRC_DIR } from "#lib/paths.js";

/** @param {*} eleventyConfig */
export const configureLayoutAliases = (eleventyConfig, baseDir = SRC_DIR) => {
  const layoutsDir = join(baseDir, "_layouts");
  const htmlFiles = readdirSync(layoutsDir).filter((file) =>
    file.endsWith(".html"),
  );
  for (const file of htmlFiles) {
    eleventyConfig.addLayoutAlias(file.replace(".html", ""), file);
  }
};
