import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getScssFiles = () => {
	const menuItemsPath = path.join(__dirname, "../menu-items");
	const configPath = path.join(__dirname, "../_data/config.json");

	let config = {};
	if (fs.existsSync(configPath)) {
		config = JSON.parse(fs.readFileSync(configPath, "utf8"));
	}

	const includes = {
		menu:
			fs.existsSync(menuItemsPath) &&
			fs.readdirSync(menuItemsPath).filter((f) => f.endsWith(".md")).length > 0,
	};

	return Object.keys(includes).filter((key) => includes[key]);
};

const configureScssFiles = (eleventyConfig) => {
	eleventyConfig.addGlobalData("scssFiles", getScssFiles());
};

export { getScssFiles, configureScssFiles };
