/**
 * Merges the base spec icons with any user-provided overrides
 *
 * Keys are normalized spec names (lowercase, trimmed)
 * Values are icon filenames in assets/icons/
 */

import baseIcons from "./specs-icons-base.json" with { type: "json" };
import userIcons from "./specs_icons.json" with { type: "json" };

export default {
  ...baseIcons,
  ...userIcons,
};
