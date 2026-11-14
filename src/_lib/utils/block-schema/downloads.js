/* jscpd:ignore-start -- block schema declaration data */
import {
  INTRO_CONTENT_FIELD,
  objectList,
  revealToggleField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "downloads";
export const containerWidth = "narrow";

const ITEMS_DESCRIPTION =
  "Download objects. Each: `{file, label}`. `file` is a site-relative URL path; `label` is the visible text.";

const FILE_RESOLUTION_NOTE =
  "The `file` path is resolved against `src/` (e.g. `/files/guide.pdf` reads from `src/files/guide.pdf`). Missing files cause a build error. Ensure the containing directory is configured as a passthrough-copy target so the file is also served to the browser.";

export const fields = {
  intro_content: INTRO_CONTENT_FIELD,
  items: {
    ...objectList("Downloads", {
      file: str("File Path (e.g. /files/guide.pdf)", { required: true }),
      label: str("Label", { required: true }),
    }),
    required: true,
    description: ITEMS_DESCRIPTION,
  },
  reveal: revealToggleField("each download item"),
};

export const docs = {
  summary:
    "List of downloadable files. Each item auto-detects its icon from the file extension and its size from the filesystem at build time.",
  scss: "src/css/design-system/_downloads.scss",
  htmlRoot: '<ul class="downloads" role="list">',
  notes: FILE_RESOLUTION_NOTE,
};

export const example = {
  type: "downloads",
  intro_content: "## Files to download",
  items: [
    { file: "/files/template-overview.txt", label: "Template overview (TXT)" },
  ],
};
/* jscpd:ignore-end */
