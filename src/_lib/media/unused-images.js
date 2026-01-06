import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  filter,
  map,
  notMemberOf,
  pipe,
  pluralize,
} from "#utils/array-utils.js";
import { log } from "#utils/console.js";

const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const IMAGE_REF_PATTERN =
  /\/?images\/[^\s)]+|[^\s/]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
const FRONTMATTER_IMAGE_FIELDS = ["header_image", "image", "thumbnail"];

const extractFilename = (imagePath) =>
  typeof imagePath === "string" ? imagePath.split("/").pop() : null;

export function configureUnusedImages(eleventyConfig) {
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const imagesDir = path.join(dir.input, "images");

    if (!fs.existsSync(imagesDir)) {
      log("No images directory found.");
      return;
    }

    const imageFiles = fs
      .readdirSync(imagesDir)
      .filter((file) => IMAGE_PATTERN.test(file));

    if (imageFiles.length === 0) {
      log("No images found in /src/images/");
      return;
    }

    const markdownFiles = [...new Bun.Glob("**/*.md").scanSync(dir.input)];

    const isValidImageName = (name) => imageFiles.includes(name);

    const usedImagesList = markdownFiles.flatMap((file) => {
      const { data, content } = matter.read(path.join(dir.input, file));
      return [
        // Extract images from frontmatter using pipe
        ...pipe(
          map((field) => field),
          filter(Boolean),
          map(extractFilename),
          filter(isValidImageName),
        )(FRONTMATTER_IMAGE_FIELDS.map((field) => data[field])),
        // Extract images from content using pipe
        ...pipe(
          map(extractFilename),
          filter(isValidImageName),
        )(content.match(IMAGE_REF_PATTERN) || []),
      ];
    });

    const unusedImages = imageFiles.filter(notMemberOf(usedImagesList));

    // Report unused images
    if (unusedImages.length > 0) {
      log("\n📸 Unused Images Report:");
      log("========================");
      for (const image of unusedImages) {
        log(`❌ ${image}`);
      }
      const formatUnused = pluralize("unused image");
      log(`\nFound ${formatUnused(unusedImages.length)} in /src/images/`);
    } else {
      log("\n✅ All images in /src/images/ are being used!");
    }
  });
}
