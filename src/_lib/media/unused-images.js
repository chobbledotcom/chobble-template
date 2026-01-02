import fs from "node:fs";
import path from "node:path";
import fastglob from "fast-glob";
import matter from "gray-matter";

const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const FRONTMATTER_IMAGE_FIELDS = ["header_image", "image", "thumbnail"];

const extractFilename = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return null;
  return imagePath.split("/").pop();
};

const extractImagesFromFrontmatter = (data, imageFiles) => {
  const found = new Set();

  for (const field of FRONTMATTER_IMAGE_FIELDS) {
    const value = data[field];
    if (value) {
      const filename = extractFilename(value);
      if (filename && imageFiles.includes(filename)) {
        found.add(filename);
      }
    }
  }

  return found;
};

const extractImagesFromContent = (content, imageFiles) => {
  const found = new Set();

  const imageRefs =
    content.match(
      /\/?images\/[^\s)]+|[^\s/]+\.(jpg|jpeg|png|gif|webp|svg)/gi,
    ) || [];

  for (const ref of imageRefs) {
    const filename = extractFilename(ref);
    if (filename && imageFiles.includes(filename)) {
      found.add(filename);
    }
  }

  return found;
};

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

    const usedImages = new Set();

    const markdownFiles = fastglob.sync("**/*.md", { cwd: dir.input });

    for (const file of markdownFiles) {
      const filePath = path.join(dir.input, file);
      const { data, content } = matter.read(filePath);

      for (const img of extractImagesFromFrontmatter(data, imageFiles)) {
        usedImages.add(img);
      }

      for (const img of extractImagesFromContent(content, imageFiles)) {
        usedImages.add(img);
      }
    }

    const unusedImages = imageFiles.filter((file) => !usedImages.has(file));

    if (unusedImages.length > 0) {
      console.log("\n📸 Unused Images Report:");
      console.log("========================");
      unusedImages.forEach((image) => {
        console.log(`❌ ${image}`);
      });
      console.log(
        `\nFound ${unusedImages.length} unused image(s) in /src/images/`,
      );
    } else {
      console.log("\n✅ All images in /src/images/ are being used!");
    }
  });
}
