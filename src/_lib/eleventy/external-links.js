import configModule from "#data/config.js";
import { loadJSDOM } from "#utils/lazy-jsdom.js";

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
  if (!content || !content.includes("<a")) {
    return content;
  }

  if (!config?.externalLinksTargetBlank) {
    return content;
  }

  // Fast check: skip JSDOM if no external links present
  if (!content.includes("http://") && !content.includes("https://")) {
    return content;
  }

  const JSDOM = await loadJSDOM();
  const dom = new JSDOM(content);
  const {
    window: { document },
  } = dom;

  const links = document.querySelectorAll("a[href]");

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (isExternalUrl(href)) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });

  return dom.serialize();
};

const createExternalLinksTransform = (config) => {
  return async (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    if (outputPath.includes("/feed.")) {
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
