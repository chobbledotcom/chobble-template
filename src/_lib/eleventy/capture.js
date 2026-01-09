let slots = null; // Reset per-build, stores captured content by page

const reset = () => {
  slots = new Map();
};

const getPageSlots = (inputPath) => {
  if (!slots) slots = new Map();
  if (!slots.has(inputPath)) slots.set(inputPath, new Map());
  return slots.get(inputPath);
};

const push = (inputPath, name, content) => {
  const page = getPageSlots(inputPath);
  const existing = page.get(name) ?? "";
  page.set(name, existing + content);
  return "";
};

const render = (inputPath, name) => getPageSlots(inputPath).get(name) ?? "";

export function configureCapture(eleventyConfig) {
  eleventyConfig.on("eleventy.before", reset);

  eleventyConfig.addPairedShortcode("push", function (content, name) {
    return push(this.page.inputPath, name, content);
  });

  eleventyConfig.addShortcode("slot", function (name) {
    return render(this.page.inputPath, name);
  });
}
