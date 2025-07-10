const fs = require("fs");
const path = require("path");

const getScssFiles = () => {
	const menuItemsPath = path.join(__dirname, "../menu-items");
	const siteDataPath = path.join(__dirname, "../_data/site.json");
	
	let siteData = {};
	if (fs.existsSync(siteDataPath)) {
		siteData = JSON.parse(fs.readFileSync(siteDataPath, "utf8"));
	}

	const includes = {
		menu:
			fs.existsSync(menuItemsPath) &&
			fs.readdirSync(menuItemsPath).filter((f) => f.endsWith(".md")).length > 0,
		maps: siteData.map_embed_src && siteData.map_embed_src !== "",
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
