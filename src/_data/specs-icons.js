/**
 * Merges the base spec icons with any user-provided overrides
 *
 * Keys are normalized spec names (lowercase, trimmed)
 * Values are objects with:
 *   - icon: string (required) - icon filename (e.g. "tick.svg")
 *   - highlight: boolean (optional) - whether to highlight this spec
 *
 * Example:
 * {
 *   "waterproof": { "icon": "tick.svg", "highlight": true },
 *   "has dongle": { "icon": "tick.svg" }
 * }
 */

import userIcons from "#data/specs-icons.json" with { type: "json" };
import baseIcons from "#data/specs-icons-base.json" with { type: "json" };

export default {
  ...baseIcons,
  ...userIcons,
};
