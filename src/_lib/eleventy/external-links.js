import configModule from "#data/config.js";
import { transformDOM } from "#utils/lazy-dom.js";

const isExternalUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://");
};

const formatUrlForDisplay = (url) => {
  if (!url || typeof url !== "string") return "";
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
};

const configureExternalLinks = async (eleventyConfig, testConfig = null) => {
  const config = testConfig ?? (await configModule());

  const getExternalLinkAttrs = (url) =>
    config?.externalLinksTargetBlank && isExternalUrl(url)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";

  eleventyConfig.addFilter("externalLinkAttrs", getExternalLinkAttrs);

  eleventyConfig.addFilter("linkify", (url) => {
    if (!url || typeof url !== "string") return "";
    const displayText = formatUrlForDisplay(url);
    const attrs = getExternalLinkAttrs(url);
    return `<a href="${url}"${attrs}>${displayText}</a>`;
  });

  eleventyConfig.addTransform("externalLinks", async (content, outputPath) => {
    if (
      typeof outputPath !== "string" ||
      !outputPath.endsWith(".html") ||
      !content?.includes("<a") ||
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
  });
};

export { configureExternalLinks, formatUrlForDisplay };
