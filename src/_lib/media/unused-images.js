import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { notMemberOf } from "#utils/array-utils.js";

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
      console.log("No images directory found.");
      return;
    }

    const imageFiles = fs
      .readdirSync(imagesDir)
      .filter((file) => IMAGE_PATTERN.test(file));

    if (imageFiles.length === 0) {
      console.log("No images found in /src/images/");
      return;
    }

    const markdownFiles = [...new Bun.Glob("**/*.md").scanSync(dir.input)];

    const usedImagesList = markdownFiles.flatMap((file) => {
      const { data, content } = matter.read(path.join(dir.input, file));
      return [
        // Extract images from frontmatter
        ...FRONTMATTER_IMAGE_FIELDS.map((field) => data[field])
          .filter(Boolean)
          .map(extractFilename)
          .filter((name) => imageFiles.includes(name)),
        // Extract images from content
        ...(content.match(IMAGE_REF_PATTERN) || [])
          .map(extractFilename)
          .filter((name) => imageFiles.includes(name)),
      ];
    });

    const unusedImages = imageFiles.filter(notMemberOf(usedImagesList));

    // Report unused images
    if (unusedImages.length > 0) {
      console.log("\n📸 Unused Images Report:");
      console.log("========================");
      for (const image of unusedImages) {
        console.log(`❌ ${image}`);
      }
      console.log(
        `\nFound ${unusedImages.length} unused image(s) in /src/images/`,
      );
    } else {
      console.log("\n✅ All images in /src/images/ are being used!");
    }
  });
}
