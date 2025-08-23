import { readdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function configureLayoutAliases(eleventyConfig) {
	// Get the layouts directory path
	const layoutsDir = join(__dirname, "../_layouts");
	
	try {
		// Read all files in the layouts directory
		const layoutFiles = readdirSync(layoutsDir);
		
		// Filter for HTML files and create aliases
		layoutFiles
			.filter(file => file.endsWith(".html"))
			.forEach(file => {
				// Remove .html extension to get the alias name
				const aliasName = file.replace(".html", "");
				
				// Create the layout path (relative to _includes since that's Eleventy's default)
				// Since we have a custom layouts dir, we use the file name directly
				const layoutPath = file;
				
				// Add the layout alias
				eleventyConfig.addLayoutAlias(aliasName, layoutPath);
			});
	} catch (error) {
		console.error("Error configuring layout aliases:", error);
	}
}