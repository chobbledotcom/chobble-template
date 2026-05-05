export const type = "event-contact-section";
export const template = "design-system/blocks/item-contact-section.html";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the inline contact section on an event page, delegating to the shared `item-contact-section.html` partial.",
  notes:
    "Event-only block. No parameters. Honours the page's `formspark_id` override and falls back to `config.form_target`.",
};
