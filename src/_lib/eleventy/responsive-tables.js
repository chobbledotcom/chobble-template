import { transformDOM } from "#utils/lazy-dom.js";

async function transformHtmlForResponsiveTables(content, outputPath) {
  if (
    !outputPath ||
    !outputPath.endsWith(".html") ||
    !content ||
    !content.includes("<table")
  ) {
    return content;
  }

  return transformDOM(content, (document) => {
    for (const table of document.querySelectorAll("table")) {
      if (table.parentElement?.classList?.contains("scrollable-table"))
        continue;

      const wrapper = document.createElement("div");
      wrapper.className = "scrollable-table";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
}

const configureResponsiveTables = (eleventyConfig) => {
  eleventyConfig.addTransform(
    "responsiveTables",
    transformHtmlForResponsiveTables,
  );
};

export { configureResponsiveTables };
