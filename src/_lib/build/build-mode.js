/**
 * Build mode flags for fast development builds.
 *
 * FAST_INACCURATE_BUILDS=1 enables multiple optimizations:
 * - Placeholder images (skips image processing and LQIP)
 * - Simplified filter_attributes (uses mock values)
 * - Skip linkification (URLs/emails/phones not auto-linked)
 *
 * PLACEHOLDER_IMAGES=1 only enables placeholder images without other optimizations.
 */

const FAST_INACCURATE_BUILDS = process.env.FAST_INACCURATE_BUILDS === "1";

const PLACEHOLDER_MODE =
  process.env.PLACEHOLDER_IMAGES === "1" || FAST_INACCURATE_BUILDS;

export { FAST_INACCURATE_BUILDS, PLACEHOLDER_MODE };
