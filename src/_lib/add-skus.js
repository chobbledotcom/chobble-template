#!/usr/bin/env node
/**
 * Script to add unique SKUs to product options that are missing them.
 * SKUs are 6-character random alphanumeric strings.
 *
 * Usage: node src/_lib/add-skus.js [--dry-run]
 */

import fs from "fs";
import matter from "gray-matter";
import path from "path";

const PRODUCTS_DIR = "src/products";
const SKU_LENGTH = 6;
const SKU_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a random SKU of specified length
 */
const generateSku = (length = SKU_LENGTH) => {
  let sku = "";
  for (let i = 0; i < length; i++) {
    sku += SKU_CHARS.charAt(Math.floor(Math.random() * SKU_CHARS.length));
  }
  return sku;
};

/**
 * Collect all existing SKUs from all products
 */
const collectExistingSkus = (productsDir) => {
  const skus = new Set();
  const files = fs.readdirSync(productsDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    const { data } = matter(content);

    if (data.options && Array.isArray(data.options)) {
      for (const option of data.options) {
        if (option.sku) {
          skus.add(option.sku);
        }
      }
    }
  }

  return skus;
};

/**
 * Generate a unique SKU that doesn't exist in the set
 */
const generateUniqueSku = (existingSkus) => {
  let sku;
  let attempts = 0;
  const maxAttempts = 1000;

  do {
    sku = generateSku();
    attempts++;
    if (attempts >= maxAttempts) {
      throw new Error("Could not generate unique SKU after maximum attempts");
    }
  } while (existingSkus.has(sku));

  existingSkus.add(sku);
  return sku;
};

/**
 * Process a single product file and add SKUs to options missing them
 * Returns true if the file was modified
 */
const processProductFile = (filePath, existingSkus, dryRun = false) => {
  const content = fs.readFileSync(filePath, "utf8");
  const { data, content: body } = matter(content);

  if (!data.options || !Array.isArray(data.options)) {
    return { modified: false, skusAdded: 0 };
  }

  let modified = false;
  let skusAdded = 0;

  for (const option of data.options) {
    if (!option.sku) {
      option.sku = generateUniqueSku(existingSkus);
      modified = true;
      skusAdded++;
    }
  }

  if (modified && !dryRun) {
    const newContent = matter.stringify(body, data);
    fs.writeFileSync(filePath, newContent);
  }

  return { modified, skusAdded };
};

/**
 * Main function to process all product files
 */
const addSkusToProducts = (dryRun = false) => {
  const productsDir = path.join(process.cwd(), PRODUCTS_DIR);

  if (!fs.existsSync(productsDir)) {
    console.error(`Products directory not found: ${productsDir}`);
    process.exit(1);
  }

  // Collect existing SKUs first
  const existingSkus = collectExistingSkus(productsDir);
  console.log(`Found ${existingSkus.size} existing SKUs`);

  const files = fs.readdirSync(productsDir).filter((f) => f.endsWith(".md"));
  let totalModified = 0;
  let totalSkusAdded = 0;

  for (const file of files) {
    const filePath = path.join(productsDir, file);
    const { modified, skusAdded } = processProductFile(
      filePath,
      existingSkus,
      dryRun,
    );

    if (modified) {
      totalModified++;
      totalSkusAdded += skusAdded;
      console.log(
        `${dryRun ? "[DRY RUN] Would update" : "Updated"} ${file}: added ${skusAdded} SKU(s)`,
      );
    }
  }

  console.log(
    `\n${dryRun ? "[DRY RUN] Would modify" : "Modified"} ${totalModified} file(s), added ${totalSkusAdded} SKU(s)`,
  );

  return { totalModified, totalSkusAdded };
};

// CLI handling
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

if (dryRun) {
  console.log("Running in dry-run mode (no files will be modified)\n");
}

addSkusToProducts(dryRun);
