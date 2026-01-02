import fs from "node:fs";
import path from "node:path";
import fastglob from "fast-glob";
import matter from "gray-matter";

const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const IMAGE_REF_PATTERN =
  /\/?images\/[^\s)]+|[^\s/]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
const FRONTMATTER_IMAGE_FIELDS = ["header_image", "image", "thumbnail"];

const extractFilename = (imagePath) =>
  typeof imagePath === "string" ? imagePath.split("/").pop() : null;

const extractImagesFromFrontmatter = (data, imageFiles) =>
  FRONTMATTER_IMAGE_FIELDS.map((field) => data[field])
    .filter(Boolean)
    .map(extractFilename)
    .filter((name) => imageFiles.includes(name));

const extractImagesFromContent = (content, imageFiles) =>
  (content.match(IMAGE_REF_PATTERN) || [])
    .map(extractFilename)
    .filter((name) => imageFiles.includes(name));

const extractImagesFromFile = (filePath, imageFiles) => {
  const { data, content } = matter.read(filePath);
  return [
    ...extractImagesFromFrontmatter(data, imageFiles),
    ...extractImagesFromContent(content, imageFiles),
  ];
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

    const markdownFiles = fastglob.sync("**/*.md", { cwd: dir.input });

    const usedImages = new Set(
      markdownFiles.flatMap((file) =>
        extractImagesFromFile(path.join(dir.input, file), imageFiles),
      ),
    );

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
