import configModule from "#data/config.js";
import { transformDOM } from "#utils/lazy-dom.js";

const isExternalUrl = (url) => {
  if (!url || typeof url !== "string") {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
};

const getExternalLinkAttributes = (url, config) =>
  config?.externalLinksTargetBlank && isExternalUrl(url)
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";

const transformExternalLinks = async (content, config) => {
  if (
    !content ||
    !content.includes("<a") ||
    !config?.externalLinksTargetBlank ||
    (!content.includes("http://") && !content.includes("https://"))
  ) {
    return content;
  }

  return transformDOM(content, (document) => {
    for (const link of document.querySelectorAll("a[href]")) {
      if (isExternalUrl(link.getAttribute("href"))) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    }
  });
};

const createExternalLinksTransform = (config) => {
  return async (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    return await transformExternalLinks(content, config);
  };
};

const configureExternalLinks = async (eleventyConfig, testConfig = null) => {
  const config = testConfig ?? (await configModule());

  eleventyConfig.addFilter("externalLinkAttrs", (url) => {
    return getExternalLinkAttributes(url, config);
  });

  eleventyConfig.addTransform(
    "externalLinks",
    createExternalLinksTransform(config),
  );
};

export { configureExternalLinks };
