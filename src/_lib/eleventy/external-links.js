import configModule from "#data/config.js";
import { loadDOM } from "#utils/lazy-dom.js";

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

const externalLinkFilter = (url, config) => {
  return getExternalLinkAttributes(url, config);
};

const transformExternalLinks = async (content, config) => {
  if (
    !content ||
    !content.includes("<a") ||
    !config?.externalLinksTargetBlank ||
    (!content.includes("http://") && !content.includes("https://"))
  ) {
    return content;
  }

  const DOM = await loadDOM();
  const dom = new DOM(content);
  const { document } = dom.window;

  for (const link of document.querySelectorAll("a[href]")) {
    if (isExternalUrl(link.getAttribute("href"))) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  }

  return dom.serialize();
};

const createExternalLinksTransform = (config) => {
  return async (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    return await transformExternalLinks(content, config);
  };
};

const configureExternalLinks = async (eleventyConfig) => {
  const config = await configModule();

  eleventyConfig.addFilter("externalLinkAttrs", (url) => {
    return externalLinkFilter(url, config);
  });

  eleventyConfig.addTransform(
    "externalLinks",
    createExternalLinksTransform(config),
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
