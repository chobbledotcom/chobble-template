import { md, str } from "#utils/block-schema/shared.js";

export const type = "callout";

export const containerWidth = "narrow";

export const schema = ["variant", "icon", "title", "content"];

export const docs = {
  summary:
    "One-column callout/note with icon, title, and short content — for content warnings, advisories, tips, etc.",
  template: "src/_includes/design-system/callout.html",
  scss: "src/css/design-system/_callout.scss",
  htmlRoot: '<aside class="callout">',
  params: {
    variant: {
      type: "string",
      default: '"info"',
      description:
        'Color scheme: `"info"`, `"warning"`, `"success"`, or `"danger"`.',
    },
    icon: {
      type: "string",
      description:
        "Icon content: Iconify ID (`prefix:name`), emoji, or image path.",
    },
    title: {
      type: "string",
      description: "Bold heading text.",
    },
    content: {
      type: "string",
      required: true,
      description:
        'Markdown content rendered via `renderContent: "md"` inside `.prose`.',
    },
  },
};

export const cmsFields = {
  variant: str("Variant (info | warning | success | danger)"),
  icon: str("Icon (Iconify ID, emoji, or path)"),
  title: str("Title"),
  content: md("Content", { required: true }),
};
