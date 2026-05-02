import { LINK_BUTTON_STYLE_FIELDS, str } from "#utils/block-schema/shared.js";

export const type = "menu-pdf-download";

export const collections = ["menus"];

export const fields = {
  text: {
    ...str("Button Text"),
    default: '"Download PDF"',
    description: "Button label.",
  },
  ...LINK_BUTTON_STYLE_FIELDS,
};

export const docs = {
  summary:
    "Download-as-PDF button for the current menu page. Reuses the `link-button` markup; the URL is auto-derived from the page's `pdfFilename`.",
  template: "src/_includes/design-system/menu-pdf-download.html",
  scss: "src/css/design-system/_link-button.scss",
  htmlRoot: '<div class="link-button">',
};
