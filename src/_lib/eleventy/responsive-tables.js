import { loadDOM } from "#utils/lazy-dom.js";

async function transformHtmlForResponsiveTables(content, outputPath) {
  if (
    !outputPath ||
    !outputPath.endsWith(".html") ||
    !content ||
    !content.includes("<table")
  ) {
    return content;
  }

  const dom = await loadDOM(content);
  const { document } = dom.window;

  const tables = document.querySelectorAll("table");

  for (const table of tables) {
    if (table.parentElement?.classList?.contains("scrollable-table")) continue;

    const wrapper = document.createElement("div");
    wrapper.className = "scrollable-table";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }

  return dom.serialize();
}

const configureResponsiveTables = (eleventyConfig) => {
  eleventyConfig.addTransform(
    "responsiveTables",
    transformHtmlForResponsiveTables,
  );
};

export { configureResponsiveTables };
