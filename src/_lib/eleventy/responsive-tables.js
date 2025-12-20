import { JSDOM } from "jsdom";

const wrapTablesForScroll = (content) => {
  if (!content || !content.includes("<table")) {
    return content;
  }

  const dom = new JSDOM(content);
  const {
    window: { document },
  } = dom;

  const tables = document.querySelectorAll("table");

  tables.forEach((table) => {
    // Skip if already wrapped
    if (table.parentElement?.classList?.contains("scrollable-table")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "scrollable-table";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  return dom.serialize();
};

const createResponsiveTablesTransform = () => {
  return (content, outputPath) => {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    return wrapTablesForScroll(content);
  };
};

const configureResponsiveTables = (eleventyConfig) => {
  eleventyConfig.addTransform(
    "responsiveTables",
    createResponsiveTablesTransform(),
  );
};

export { configureResponsiveTables };
