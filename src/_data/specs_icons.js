/**
 * Merges the base spec icons with any user-provided overrides
 *
 * Keys are normalized spec names (lowercase, trimmed)
 * Values are icon filenames in assets/icons/
 */

import userIcons from "#data/specs_icons.json" with { type: "json" };
import baseIcons from "#data/specs-icons-base.json" with { type: "json" };

export default {
  ...baseIcons,
  ...userIcons,
};
