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

const push = (inputPath, name, content) => {
  if (!slots) slots = new Map();
  if (!slots.has(inputPath)) slots.set(inputPath, new Map());
  const page = slots.get(inputPath);
  const existing = page.get(name) ?? "";
  page.set(name, existing + content);
  return "";
};

const render = (inputPath, name) => {
  if (!slots?.has(inputPath)) return "";
  return slots.get(inputPath).get(name) ?? "";
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
