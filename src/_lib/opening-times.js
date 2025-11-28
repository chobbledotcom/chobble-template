const renderOpeningTimes = (openingTimes) => {
	if (!openingTimes || openingTimes.length === 0) {
		return "";
	}

	let html = '<ul class="opening-times">\n';
	for (const item of openingTimes) {
		html += `  <li><strong>${item.day}:</strong> ${item.hours}</li>\n`;
	}
	html += "</ul>";

	return html;
};

const getOpeningTimesHtml = async () => {
	const siteData = await import("../_data/site.json", {
		with: { type: "json" },
	});
	const openingTimes = siteData.default.opening_times || [];
	return renderOpeningTimes(openingTimes);
};

const configureOpeningTimes = (eleventyConfig) => {
	eleventyConfig.addShortcode("opening_times", getOpeningTimesHtml);

	eleventyConfig.addFilter("format_opening_times", renderOpeningTimes);
};

export { configureOpeningTimes, getOpeningTimesHtml };
