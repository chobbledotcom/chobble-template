/* jscpd:ignore-start */
import {
  md,
  objectList,
  REVEAL_BOOLEAN_PARAM,
  str,
} from "#utils/block-schema/shared.js";
/* jscpd:ignore-end */

export const type = "downloads";
export const schema = ["intro", "items", "reveal"];
export const containerWidth = "narrow";

const ITEMS_DESCRIPTION =
  "Download objects. Each: `{file, label}`. `file` is a site-relative URL path; `label` is the visible text.";

const FILE_RESOLUTION_NOTE =
  "The `file` path is resolved against `src/` (e.g. `/files/guide.pdf` reads from `src/files/guide.pdf`). Missing files cause a build error. Ensure the containing directory is configured as a passthrough-copy target so the file is also served to the browser.";

export const docs = {
  summary:
    "List of downloadable files. Each item auto-detects its icon from the file extension and its size from the filesystem at build time.",
  template: "src/_includes/design-system/downloads.html",
  scss: "src/css/design-system/_downloads.scss",
  htmlRoot: '<ul class="downloads" role="list">',
  notes: FILE_RESOLUTION_NOTE,
  params: {
    intro: {
      type: "string",
      description:
        "Markdown content rendered above the downloads list in `.prose`.",
    },
    items: {
      type: "array",
      required: true,
      description: ITEMS_DESCRIPTION,
    },
    reveal: {
      ...REVEAL_BOOLEAN_PARAM,
      description: "Adds `data-reveal` to each download item.",
    },
  },
};

/* jscpd:ignore-start */
export const cmsFields = {
  intro: md("Intro Content (Markdown)"),
  items: objectList("Downloads", {
    file: str("File Path (e.g. /files/guide.pdf)", { required: true }),
    label: str("Label", { required: true }),
  }),
};
/* jscpd:ignore-end */
