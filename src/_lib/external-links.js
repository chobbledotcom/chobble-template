import {JSDOM} from "jsdom";

const isExternalUrl = (url) => {
	if (!url || typeof url !== "string") {
		return false;
	}
	return url.startsWith("http://") || url.startsWith("https://");
};

const getExternalLinkAttributes = (url, config) => {
	if (!isExternalUrl(url)) {
		return "";
	}

	const attrs = [];
	if (config?.externalLinksTargetBlank) {
		attrs.push('target="_blank"');
		attrs.push('rel="noopener noreferrer"');
	}

	return attrs.length > 0 ? " " + attrs.join(" ") : "";
};

const externalLinkFilter = (url, config) => {
	return getExternalLinkAttributes(url, config);
};

const transformExternalLinks = (content, config) => {
	if (!content || !content.includes("<a")) {
		return content;
	}

	if (!config?.externalLinksTargetBlank) {
		return content;
	}

	const {
		window: {document},
	} = new JSDOM(content);

	const links = document.querySelectorAll("a[href]");

	links.forEach((link) => {
		const href = link.getAttribute("href");
		if (isExternalUrl(href)) {
			link.setAttribute("target", "_blank");
			link.setAttribute("rel", "noopener noreferrer");
		}
	});

	return new JSDOM(document.documentElement.outerHTML).serialize();
};

const createExternalLinksTransform = (eleventyConfig) => {
	return (content, outputPath) => {
		if (!outputPath || !outputPath.endsWith(".html")) {
			return content;
		}

		if (outputPath.includes("/feed.")) {
			return content;
		}

		const config = eleventyConfig.globalData?.config;
		return transformExternalLinks(content, config);
	};
};

const configureExternalLinks = (eleventyConfig) => {
	eleventyConfig.addFilter("externalLinkAttrs", (url) => {
		const config = eleventyConfig.globalData?.config;
		return externalLinkFilter(url, config);
	});

	eleventyConfig.addTransform(
		"externalLinks",
		createExternalLinksTransform(eleventyConfig),
	);
};

export {
	isExternalUrl,
	getExternalLinkAttributes,
	externalLinkFilter,
	transformExternalLinks,
	createExternalLinksTransform,
	configureExternalLinks,
};
