const fs = require("fs");
const path = require("path");

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
		maps: config.map_embed_src && config.map_embed_src !== "",
	};

	return Object.keys(includes).filter((key) => includes[key]);
};

const configureScssFiles = (eleventyConfig) => {
	eleventyConfig.addGlobalData("scssFiles", getScssFiles());
};

module.exports = {
	getScssFiles,
	configureScssFiles,
};
