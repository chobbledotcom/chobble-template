const fs = require("fs");
const path = require("path");

const getScssFiles = () => {
	const menuItemsPath = path.join(__dirname, "../menu-items");

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

module.exports = {
	getScssFiles,
	configureScssFiles,
};
