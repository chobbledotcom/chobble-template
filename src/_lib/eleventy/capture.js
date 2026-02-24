/**
 * Content capture system for Eleventy templates.
 * Allows child layouts to "push" content into named "slots" in parent layouts.
 *
 * Usage in child layout:
 *   {% push "templates" %}
 *     <template id="my-template">...</template>
 *   {% endpush %}
 *
 * Usage in parent layout:
 *   {% slot "templates" %}
 *
 * Content is accumulated per-page and reset between builds.
 *
 * Note: Module-level state is required for Eleventy shortcode coordination.
 * The slots Map persists across shortcode calls within a single build and is
 * reset via the eleventy.before event hook.
 */

// Module-level state required for Eleventy shortcode coordination.
// Reset per-build via eleventy.before hook.
let slots = null;

const reset = () => {
  slots = new Map();
};

const getPageSlots = (inputPath, { create = false } = {}) => {
  if (!slots) {
    if (!create) return null;
    slots = new Map();
  }
  if (!slots.has(inputPath)) {
    if (!create) return null;
    slots.set(inputPath, new Map());
  }
  return slots.get(inputPath);
};

const push = (inputPath, name, content) => {
  const page = getPageSlots(inputPath, { create: true });
  if (!page.has(name)) page.set(name, "");
  page.set(name, page.get(name) + content);
  return "";
};

const render = (inputPath, name) => {
  const page = getPageSlots(inputPath);
  if (!page) return "";
  const value = page.get(name);
  return value === undefined ? "" : value;
};

/**
 * Configures the capture/slot system for Eleventy.
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
export const configureCapture = (eleventyConfig) => {
  eleventyConfig.on("eleventy.before", reset);

  eleventyConfig.addPairedShortcode("push", function (content, name) {
    return push(this.page.inputPath, name, content);
  });

  eleventyConfig.addShortcode("slot", function (name) {
    return render(this.page.inputPath, name);
  });
};
