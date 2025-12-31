import { readdirSync } from "node:fs";
import { join } from "node:path";

export function configureLayoutAliases(eleventyConfig) {
  const layoutsDir = join(process.cwd(), "src/_layouts");
  readdirSync(layoutsDir)
    .filter((file) => file.endsWith(".html"))
    .forEach((file) => {
      eleventyConfig.addLayoutAlias(file.replace(".html", ""), file);
    });
}
