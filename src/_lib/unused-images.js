import fastglob from "fast-glob";
import fs from "fs";
import path from "path";

export function configureUnusedImages(eleventyConfig) {
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const imagesDir = path.join(dir.input, "images");

    if (!fs.existsSync(imagesDir)) {
      console.log("No images directory found.");
      return;
    }

    const imageFiles = fs
      .readdirSync(imagesDir)
      .filter((file) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file));

    if (imageFiles.length === 0) {
      console.log("No images found in /src/images/");
      return;
    }

    const usedImages = new Set();

    // Scan all markdown files for image references
    const markdownFiles = fastglob.sync("**/*.md", { cwd: dir.input });

    for (const file of markdownFiles) {
      const filePath = path.join(dir.input, file);
      const content = fs.readFileSync(filePath, "utf8");

      // Find all image references in the content
      const imageRefs =
        content.match(
          /\/?images\/[^\s)]+|[^\s/]+\.(jpg|jpeg|png|gif|webp|svg)/gi,
        ) || [];

      imageRefs.forEach((ref) => {
        const filename = ref.split("/").pop();
        if (imageFiles.includes(filename)) {
          usedImages.add(filename);
        }
      });
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
