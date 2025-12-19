import { readdirSync } from "fs";
import { join } from "path";

export function configureLayoutAliases(eleventyConfig) {
  const layoutsDir = join(process.cwd(), "src/_layouts");
  readdirSync(layoutsDir)
    .filter((file) => file.endsWith(".html"))
    .forEach((file) => {
      eleventyConfig.addLayoutAlias(file.replace(".html", ""), file);
    });
}
