/* jscpd:ignore-start -- block schema declaration data */
import { md, str } from "#utils/block-schema/shared.js";

export const type = "callout";

export const containerWidth = "narrow";

export const fields = {
  variant: {
    ...str("Variant (info | warning | success | danger)"),
    default: "info",
    description:
      'Color scheme: `"info"`, `"warning"`, `"success"`, or `"danger"`.',
  },
  icon: {
    ...str("Icon (Iconify ID, emoji, or path)"),
    description:
      "Icon content: Iconify ID (`prefix:name`), emoji, or image path.",
  },
  name: { ...str("Name"), description: "Bold heading text." },
  content: {
    ...md("Content"),
    required: true,
    description:
      'Markdown content rendered via `renderContent: "md"` inside `.prose`.',
  },
};

export const docs = {
  summary:
    "One-column callout/note with icon, name, and short content — for content warnings, advisories, tips, etc.",
  scss: "src/css/design-system/_callout.scss",
  htmlRoot: '<aside class="callout">',
};

export const example = {
  type: "callout",
  variant: "info",
  icon: "hugeicons:information-circle",
  name: "Good to know",
  content:
    "Callouts hold short advisories, tips, and warnings. Four color variants are available.",
};
/* jscpd:ignore-end */
