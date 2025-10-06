const BUILD_TIMESTAMP = Math.floor(Date.now() / 1000);

export function configureCacheBuster(eleventyConfig) {
	eleventyConfig.addFilter("cacheBust", function (url) {
		const isProduction = process.env.ELEVENTY_ENV === "production";

		if (!isProduction) {
			return url;
		}

		return `${url}?cached=${BUILD_TIMESTAMP}`;
	});
}
