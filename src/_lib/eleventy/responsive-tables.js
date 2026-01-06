import { loadDOM } from "#utils/lazy-dom.js";

const wrapTablesForScroll = async (content) => {
  if (!content || !content.includes("<table")) {
    return content;
  }

  const DOM = await loadDOM();
  const dom = new DOM(content);
  const {
    window: { document },
  } = dom;

  const tables = document.querySelectorAll("table");

  for (const table of tables) {
    // Skip if already wrapped
    if (table.parentElement?.classList?.contains("scrollable-table")) {
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "scrollable-table";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }

  return dom.serialize();
};

const createResponsiveTablesTransform = () => {
  return async (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    return await wrapTablesForScroll(content);
  };
};

const configureResponsiveTables = (eleventyConfig) => {
  eleventyConfig.addTransform(
    "responsiveTables",
    createResponsiveTablesTransform(),
  );
};

export { configureResponsiveTables };
