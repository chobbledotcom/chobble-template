import fs from "fs";
import path from "path";
import { getDirname } from "#eleventy/file-utils.js";
import { memoize } from "#utils/memoize.js";

const __dirname = getDirname(import.meta.url);

const getScssFiles = memoize(() => {
  const menuItemsPath = path.join(__dirname, "../menu-items");
  const configPath = path.join(__dirname, "../_data/config.json");

  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }

  const includes = {
    menu:
      fs.existsSync(menuItemsPath) &&
      fs.readdirSync(menuItemsPath).filter((f) => f.endsWith(".md")).length > 0,
    "theme-switcher": !!config.enable_theme_switcher,
  };

  return Object.keys(includes).filter((key) => includes[key]);
});

const configureScssFiles = (eleventyConfig) => {
  eleventyConfig.addGlobalData("scssFiles", getScssFiles());
};

export { getScssFiles, configureScssFiles };
