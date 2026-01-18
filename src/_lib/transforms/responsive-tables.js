/**
 * DOM transform for wrapping tables in scrollable containers.
 *
 * Wraps all table elements in a div with class "scrollable-table"
 * to allow horizontal scrolling on small screens.
 */

/**
 * Wrap tables in scrollable containers
 * @param {*} document
 * @param {object} _config - Unused, included for consistent transform signature
 */
const wrapTables = (document, _config) => {
  for (const table of document.querySelectorAll("table")) {
    // Skip if already wrapped
    if (table.parentElement?.classList?.contains("scrollable-table")) {
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "scrollable-table";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }
};

export { wrapTables };
