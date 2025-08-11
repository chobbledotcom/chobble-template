const configureOpeningTimes = (eleventyConfig) => {
	eleventyConfig.addShortcode("opening_times", function() {
		const siteData = require("../_data/site.json");
		const openingTimes = siteData.opening_times || [];
		
		if (openingTimes.length === 0) {
			return '';
		}
		
		let html = '<ul class="opening-times">\n';
		for (const item of openingTimes) {
			html += `  <li><strong>${item.day}:</strong> ${item.hours}</li>\n`;
		}
		html += '</ul>';
		
		return html;
	});
	
	eleventyConfig.addFilter("format_opening_times", (openingTimes) => {
		if (!openingTimes || openingTimes.length === 0) {
			return '';
		}
		
		let html = '<ul class="opening-times">\n';
		for (const item of openingTimes) {
			html += `  <li><strong>${item.day}:</strong> ${item.hours}</li>\n`;
		}
		html += '</ul>';
		
		return html;
	});
};

module.exports = {
	configureOpeningTimes,
};