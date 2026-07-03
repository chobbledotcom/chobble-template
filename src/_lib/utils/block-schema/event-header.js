export const type = "event-header";

/* jscpd:ignore-start */
export const containerWidth = "full";

export const collections = ["events"];

export const fields = {};
/* jscpd:ignore-end */

export const docs = {
  summary:
    "Renders an event page's heading: title, optional subtitle, and event details (date, schedule, location, iCal download).",
  notes:
    "Event-only block. No parameters. Reads `title`, `subtitle`, `event_date`, `recurring_date`, `event_location`, and `ical_url` from the page.",
};
