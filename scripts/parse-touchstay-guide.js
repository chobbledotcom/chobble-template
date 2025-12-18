#!/usr/bin/env node

/**
 * TouchStay Guide Parser
 *
 * Parses TouchStay JSON export and converts it to guide categories and guide pages
 * following the existing schema (markdown files with YAML front matter).
 *
 * Usage:
 *   node scripts/parse-touchstay-guide.js <input.json> [--output-dir <dir>]
 *
 * Example:
 *   node scripts/parse-touchstay-guide.js touchstay-export.json --output-dir src
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Icon mapping from TouchStay icons to local icons
const ICON_MAP = {
  "icon-Hand": "icons/email.svg",
  "icon-Star": "icons/github.svg",
  "icon-Numbers": "icons/email.svg",
  "icon-Key": "icons/github.svg",
  "icon-House": "icons/email.svg",
  "icon-Pin-1": "icons/github.svg",
  "icon-Wifi": "icons/email.svg",
  "icon-Book-Open": "icons/github.svg",
  "icon-Suitcase": "icons/email.svg",
};

// Default icon if no mapping exists
const DEFAULT_ICON = "icons/email.svg";

/**
 * Convert a string to a URL-friendly slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Convert HTML to Markdown
 * Basic conversion for common HTML elements
 */
function htmlToMarkdown(html) {
  if (!html) return "";

  let md = html;

  // Remove style attributes
  md = md.replace(/\s*style="[^"]*"/gi, "");

  // Remove class attributes
  md = md.replace(/\s*class="[^"]*"/gi, "");

  // Convert headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");

  // Convert paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n");

  // Convert bold/strong
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");

  // Convert italic/em
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");

  // Convert links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Convert images - extract src and alt
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, "![$1]($2)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");

  // Convert unordered lists
  md = md.replace(/<ul[^>]*>/gi, "\n");
  md = md.replace(/<\/ul>/gi, "\n");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gis, "- $1\n");

  // Convert ordered lists (simplified)
  md = md.replace(/<ol[^>]*>/gi, "\n");
  md = md.replace(/<\/ol>/gi, "\n");

  // Convert line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");

  // Convert iframes (YouTube embeds) to links
  md = md.replace(
    /<iframe[^>]*src="([^"]*youtube[^"]*)"[^>]*><\/iframe>/gi,
    "\n[Watch Video]($1)\n",
  );
  md = md.replace(/<iframe[^>]*src="([^"]*)"[^>]*><\/iframe>/gi, "\n[Embedded Content]($1)\n");

  // Remove remaining HTML tags
  md = md.replace(/<div[^>]*>/gi, "");
  md = md.replace(/<\/div>/gi, "\n");
  md = md.replace(/<span[^>]*>/gi, "");
  md = md.replace(/<\/span>/gi, "");

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n"); // Max 2 newlines
  md = md.replace(/^\s+|\s+$/g, ""); // Trim

  // Decode HTML entities
  md = md.replace(/&amp;/g, "&");
  md = md.replace(/&lt;/g, "<");
  md = md.replace(/&gt;/g, ">");
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, " ");

  return md;
}

/**
 * Escape special characters in YAML strings
 */
function escapeYaml(str) {
  if (!str) return "";
  // If the string contains special characters, wrap in quotes
  if (/[:#\[\]{}|>&*!?,\n]/.test(str) || str.includes('"') || str.includes("'")) {
    return `"${str.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return str;
}

/**
 * Generate YAML front matter from an object
 */
function generateFrontMatter(data) {
  let yaml = "---\n";

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      yaml += `${key}:\n`;
      for (const item of value) {
        if (typeof item === "object") {
          yaml += "  - ";
          const entries = Object.entries(item);
          entries.forEach(([k, v], idx) => {
            if (idx === 0) {
              yaml += `${k}: ${escapeYaml(String(v))}\n`;
            } else {
              yaml += `    ${k}: ${escapeYaml(String(v))}\n`;
            }
          });
        } else {
          yaml += `  - ${escapeYaml(String(item))}\n`;
        }
      }
    } else {
      yaml += `${key}: ${escapeYaml(String(value))}\n`;
    }
  }

  yaml += "---\n";
  return yaml;
}

/**
 * Parse the TouchStay JSON and extract categories and pages
 */
function parseTouchStayGuide(jsonData) {
  const categories = [];
  const pages = [];

  const infoContent = jsonData.content?.info_content || [];

  infoContent.forEach((category, categoryIndex) => {
    const categoryTitle = category.title_translations?.en || `Category ${categoryIndex + 1}`;
    const categorySlug = slugify(categoryTitle);
    const categoryIcon = ICON_MAP[category.icon] || DEFAULT_ICON;

    // Create category
    categories.push({
      slug: categorySlug,
      frontMatter: {
        title: categoryTitle,
        subtitle: `${categoryTitle} information and guides`,
        order: categoryIndex + 1,
        icon: categoryIcon,
      },
      content: `# ${categoryTitle}\n\nExplore the guides in this section to learn more.`,
    });

    // Process subcategories and their topics
    const subcategories = category.subcategories || [];
    let pageOrder = 1;

    subcategories.forEach((subcategory) => {
      const subcategoryTitle = subcategory.title_translations?.en || "Untitled Section";
      const topics = subcategory.topics || [];

      topics.forEach((topic) => {
        const translations = topic.translations?.en || {};
        const topicTitle = translations.title || "Untitled Topic";
        const topicDescription = translations.description || "";
        const topicSlug = slugify(topicTitle);

        // Generate subtitle from subcategory if different from topic
        let subtitle = subcategoryTitle;
        if (subcategoryTitle === topicTitle) {
          subtitle = categoryTitle;
        }

        // Convert description HTML to markdown
        const markdownContent = htmlToMarkdown(topicDescription);

        // Build front matter
        const frontMatter = {
          title: topicTitle,
          subtitle: subtitle,
          guide_category: categorySlug,
          order: pageOrder,
        };

        // Add photo if present
        if (topic.photo) {
          frontMatter.featured_image = topic.photo;
        }

        // Only add FAQs if there are any (empty array causes YAML issues)
        // frontMatter.faqs = [];

        pages.push({
          slug: `${categorySlug}-${topicSlug}`,
          frontMatter,
          content: markdownContent || `# ${topicTitle}\n\nContent coming soon.`,
        });

        pageOrder++;
      });
    });
  });

  return { categories, pages };
}

/**
 * Write guide categories and pages to disk
 */
function writeGuideFiles(categories, pages, outputDir) {
  const categoriesDir = join(outputDir, "guide_categories");
  const pagesDir = join(outputDir, "guide_pages");

  // Ensure directories exist
  if (!existsSync(categoriesDir)) {
    mkdirSync(categoriesDir, { recursive: true });
  }
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true });
  }

  // Write categories
  const writtenCategories = [];
  for (const category of categories) {
    const filename = `${category.slug}.md`;
    const filepath = join(categoriesDir, filename);
    const content = generateFrontMatter(category.frontMatter) + "\n" + category.content + "\n";

    writeFileSync(filepath, content, "utf8");
    writtenCategories.push(filepath);
    console.log(`✓ Created category: ${filename}`);
  }

  // Write pages
  const writtenPages = [];
  for (const page of pages) {
    const filename = `${page.slug}.md`;
    const filepath = join(pagesDir, filename);
    const content = generateFrontMatter(page.frontMatter) + "\n" + page.content + "\n";

    writeFileSync(filepath, content, "utf8");
    writtenPages.push(filepath);
    console.log(`✓ Created page: ${filename}`);
  }

  return { writtenCategories, writtenPages };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
TouchStay Guide Parser

Converts TouchStay JSON export to guide categories and guide pages.

Usage:
  node scripts/parse-touchstay-guide.js <input.json> [options]

Options:
  --output-dir <dir>  Output directory (default: src)
  --dry-run           Show what would be created without writing files
  --help, -h          Show this help message

Example:
  node scripts/parse-touchstay-guide.js touchstay-export.json --output-dir src
`);
    process.exit(0);
  }

  const inputFile = args[0];
  let outputDir = "src";
  let dryRun = false;

  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--output-dir" && args[i + 1]) {
      outputDir = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  // Read input file
  console.log(`Reading input file: ${inputFile}`);
  let jsonData;
  try {
    const rawData = readFileSync(inputFile, "utf8");
    jsonData = JSON.parse(rawData);
  } catch (error) {
    console.error(`Error reading input file: ${error.message}`);
    process.exit(1);
  }

  // Parse the data
  console.log("\nParsing TouchStay guide data...");
  const { categories, pages } = parseTouchStayGuide(jsonData);

  console.log(`\nFound ${categories.length} categories and ${pages.length} pages`);

  if (dryRun) {
    console.log("\n--- DRY RUN ---");
    console.log("\nCategories that would be created:");
    categories.forEach((c) => console.log(`  - ${c.slug}.md`));
    console.log("\nPages that would be created:");
    pages.forEach((p) => console.log(`  - ${p.slug}.md`));
    console.log("\nNo files were written (dry run mode)");
  } else {
    console.log(`\nWriting files to: ${outputDir}`);
    const { writtenCategories, writtenPages } = writeGuideFiles(categories, pages, outputDir);

    console.log(`\n✓ Successfully created ${writtenCategories.length} categories`);
    console.log(`✓ Successfully created ${writtenPages.length} pages`);
  }
}

main();
