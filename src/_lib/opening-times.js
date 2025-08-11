const renderOpeningTimes = (openingTimes) => {
	if (!openingTimes || openingTimes.length === 0) {
		return '';
	}
	
	let html = '<ul class="opening-times">\n';
	for (const item of openingTimes) {
		html += `  <li><strong>${item.day}:</strong> ${item.hours}</li>\n`;
	}
	html += '</ul>';
	
	return html;
};

const getOpeningTimesHtml = () => {
	const siteData = require("../_data/site.json");
	const openingTimes = siteData.opening_times || [];
	return renderOpeningTimes(openingTimes);
};

const configureOpeningTimes = (eleventyConfig) => {
	eleventyConfig.addShortcode("opening_times", getOpeningTimesHtml);
	
	eleventyConfig.addFilter("format_opening_times", renderOpeningTimes);
};

module.exports = {
	configureOpeningTimes,
	getOpeningTimesHtml,
};