export const type = "event-gallery";
export const template = "design-system/blocks/item-gallery.html";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders the event page's gallery (current image + thumbnails + slider).",
  notes:
    "Event-only block. No parameters. Renders nothing when the event's `gallery` is empty.",
};
