/**
 * Merges the base spec icons with any user-provided overrides
 *
 * Keys are normalized spec names (lowercase, trimmed)
 * Values can be:
 *   - String: icon filename (e.g. "tick.svg")
 *   - Object: { icon: "tick.svg", highlight: true }
 *
 * Output is normalized to object format: { icon: string, highlight: boolean }
 */

import userIcons from "#data/specs-icons.json" with { type: "json" };
import baseIcons from "#data/specs-icons-base.json" with { type: "json" };

/**
 * Normalize a spec icon value to object format
 * @param {string|Object} value - Icon filename or config object
 * @returns {{ icon: string, highlight: boolean }}
 */
const normalizeSpecIcon = (value) => {
  if (typeof value === "string") {
    return { icon: value, highlight: false };
  }
  return {
    icon: value.icon,
    highlight: value.highlight ?? false,
  };
};

/**
 * Normalize all spec icons to object format
 * @param {Object} icons - Spec icons object
 * @returns {Object} Normalized spec icons
 */
const normalizeSpecIcons = (icons) => {
  const normalized = {};
  for (const [key, value] of Object.entries(icons)) {
    normalized[key] = normalizeSpecIcon(value);
  }
  return normalized;
};

const merged = {
  ...baseIcons,
  ...userIcons,
};

export default normalizeSpecIcons(merged);
