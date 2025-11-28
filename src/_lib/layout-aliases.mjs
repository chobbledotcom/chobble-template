import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function configureLayoutAliases(eleventyConfig) {
	const layoutsDir = join(__dirname, "../_layouts");
	readdirSync(layoutsDir)
		.filter((file) => file.endsWith(".html"))
		.forEach((file) => {
			eleventyConfig.addLayoutAlias(file.replace(".html", ""), file);
		});
}
