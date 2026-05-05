export const type = "event-contact-section";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the inline contact section on an event page (delegates to `item-contact-section.html`).",
  template: "src/_includes/design-system/item-contact-section-block.html",
  notes:
    "Event-only block. No parameters. Honours the page's `formspark_id` override and falls back to `config.form_target`.",
};
