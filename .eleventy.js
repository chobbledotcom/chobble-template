module.exports = async function (eleventyConfig) {
  const { eleventyImageTransformPlugin } = await import("@11ty/eleventy-img");
  const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
  const EleventyNavigation = require("@11ty/eleventy-navigation/eleventy-navigation");

  const path = await import("path");
  const fastglob = await import("fast-glob");
  const fs = await import("fs");

  const fg = fastglob.default;
  const markdownIt = await import("markdown-it");
  const images = fg.sync(["src/images/*.jpg"]);

  eleventyConfig.addWatchTarget("./src/**/*");

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg", "svg"],
    widths: [400, 600, 900, 1200, "auto"],
    svgShortCircuit: true,
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
      },
      pictureAttributes: {},
    },
  });

  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addFilter("toNavigation", function (collection, activeKey) {
    return EleventyNavigation.toHtml.call(eleventyConfig, collection, {
      activeAnchorClass: "active",
      activeKey: activeKey,
    });
  });

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy({
    "src/assets/favicon/*": "/",
  });

  eleventyConfig.addCollection("images", (collection) => {
    return images.map((i) => i.split("/")[2]).reverse();
  });

  const md = new markdownIt.default({
    html: true,
  });

  eleventyConfig.addShortcode("renderSnippet", function (name) {
    const snippetPath = path.join(process.cwd(), "src/snippets", `${name}.md`);
    const content = fs.readFileSync(snippetPath, "utf8");
    return md.render(content);
  });

  eleventyConfig.addFilter(
    "getProductsByCategory",
    function (products, categorySlug) {
      return products.filter((product) => {
        if (!product.data.categories) return false;
        return product.data.categories.includes(categorySlug);
      });
    },
  );

  eleventyConfig.addFilter("getFeaturedCategories", (categories) =>
    categories.filter((c) => c.data.featured),
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data",
    },
    templateFormats: ["liquid", "md", "njk", "html"],
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
  };
};
