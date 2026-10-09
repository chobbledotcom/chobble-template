/* jscpd:ignore-start -- block schema declaration data */
import {
  bool,
  INTRO_CONTENT_FIELD,
  md,
  objectList,
  revealToggleField,
  str,
} from "#utils/block-schema/shared.js";

export const type = "features";

export const fields = {
  items: {
    ...objectList("Features", {
      icon: str("Icon (Iconify ID or HTML entity)"),
      icon_label: str("Icon Accessible Label"),
      name: str("Name", { required: true }),
      description: md("Description"),
      style: str("Custom Style"),
    }),
    required: true,
    description:
      'Feature objects. Each: `{icon, icon_label, name, description, style}`. Icon can be an Iconify ID (`"prefix:name"`), image path (`"/images/foo.svg"`), or raw HTML/emoji.',
  },
  intro_content: INTRO_CONTENT_FIELD,
  reveal: revealToggleField("each feature"),
  center: {
    ...bool("Centered"),
    default: false,
    description: "If true, centers feature text.",
  },
};

export const docs = {
  summary:
    "Grid of feature cards with optional icons, names, and descriptions.",
  scss: "src/css/design-system/_feature.scss",
  htmlRoot:
    '<ul class="features" role="list"> containing <li><article class="feature"> items',
};

export const example = {
  type: "features",
  intro_content: "## A grid of features",
  items: [
    {
      icon: "hugeicons:cube",
      name: "Composable",
      description: "Pages are YAML lists of typed blocks.",
    },
    {
      icon: "hugeicons:shield-01",
      name: "Validated",
      description: "Unknown types or keys fail the build loudly.",
    },
    {
      icon: "hugeicons:rocket",
      name: "Static",
      description: "Everything renders to plain HTML at build time.",
    },
  ],
};
/* jscpd:ignore-end */
