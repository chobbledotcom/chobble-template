const configureOpeningTimes = (eleventyConfig) => {
	// Add a shortcode to render opening times as a formatted list
	eleventyConfig.addShortcode("opening_times", function() {
		// Try different ways to access site data
		const siteData = require("../_data/site.json");
		const openingTimes = siteData.opening_times || {};
		
		if (Object.keys(openingTimes).length === 0) {
			return '';
		}
		
		let html = '<ul class="opening-times">\n';
		for (const [day, hours] of Object.entries(openingTimes)) {
			html += `  <li><strong>${day}:</strong> ${hours}</li>\n`;
		}
		html += '</ul>';
		
		return html;
	});
	
	// Add a filter version as well for flexibility
	eleventyConfig.addFilter("format_opening_times", (openingTimes) => {
		if (!openingTimes || Object.keys(openingTimes).length === 0) {
			return '';
		}
		
		let html = '<ul class="opening-times">\n';
		for (const [day, hours] of Object.entries(openingTimes)) {
			html += `  <li><strong>${day}:</strong> ${hours}</li>\n`;
		}
		html += '</ul>';
		
		return html;
	});
};

module.exports = {
	configureOpeningTimes,
};