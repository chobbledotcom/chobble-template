module.exports = (function () {
	const path = require("path");
	const fs = require("fs");
	const themePath = path.join(process.cwd(), "src/css/theme.scss");
	if (!fs.existsSync(themePath)) return [];
	return fs
		.readFileSync(themePath, "utf8")
		.match(/\/\* body_classes: (.+) \*\//)?.[1]
		?.split(",")
		?.map((s) => s.trim());
})();
