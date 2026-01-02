#!/usr/bin/env node
/**
 * Script to add unique SKUs to product options that are missing them.
 * SKUs are 6-character random alphanumeric strings.
 *
 * Usage: node src/_lib/scripts/add-skus.js [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const readProductFile = (filePath) => {
  const { data, content: body } = matter.read(filePath);
  return { data, body, filePath };
};

const PRODUCTS_DIR = "src/products";
const SKU_LENGTH = 6;
const SKU_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a random SKU of specified length
 */
const generateSku = (length = SKU_LENGTH) =>
  Array.from(
    { length },
    () => SKU_CHARS[Math.floor(Math.random() * SKU_CHARS.length)],
  ).join("");

/**
 * Get all product files from a directory
 */
const getProductFiles = (productsDir) =>
  fs
    .readdirSync(productsDir)
    .filter((f) => f.endsWith(".md"))
    .map((file) => path.join(productsDir, file));

/**
 * Extract SKUs from a product's options
 */
const extractSkusFromProduct = (product) =>
  (product.data.options || [])
    .filter((option) => option.sku)
    .map((option) => option.sku);

/**
 * Collect all existing SKUs from all products
 */
const collectExistingSkus = (productsDir) => {
  const products = getProductFiles(productsDir).map(readProductFile);
  const allSkus = products.flatMap(extractSkusFromProduct);
  return new Set(allSkus);
};

/**
 * Generate a unique SKU that doesn't exist in the set
 * Returns { sku, updatedSkus } to avoid mutation
 */
const generateUniqueSku = (existingSkus, maxAttempts = 1000) => {
  const attempt = (attemptsLeft) => {
    if (attemptsLeft <= 0) {
      throw new Error("Could not generate unique SKU after maximum attempts");
    }
    const sku = generateSku();
    return existingSkus.has(sku)
      ? attempt(attemptsLeft - 1)
      : { sku, updatedSkus: new Set([...existingSkus, sku]) };
  };
  return attempt(maxAttempts);
};

/**
 * Add SKUs to options that are missing them (recursive implementation)
 * Returns { options, skusAdded, updatedSkus }
 */
const addSkusToOptions = (options, existingSkus) => {
  const processOptions = (remaining, processed, skusAdded, currentSkus) => {
    if (remaining.length === 0) {
      return { options: processed, skusAdded, updatedSkus: currentSkus };
    }

    const [option, ...rest] = remaining;

    if (option.sku) {
      return processOptions(
        rest,
        [...processed, option],
        skusAdded,
        currentSkus,
      );
    }

    const { sku, updatedSkus } = generateUniqueSku(currentSkus);
    return processOptions(
      rest,
      [...processed, { ...option, sku }],
      skusAdded + 1,
      updatedSkus,
    );
  };

  return processOptions(options, [], 0, existingSkus);
};

/**
 * Process a single product file and add SKUs to options missing them
 * Returns { modified, skusAdded, updatedSkus, filePath, newContent }
 */
const processProductFile = (product, existingSkus) => {
  const { data, body, filePath } = product;

  if (!data.options || !Array.isArray(data.options)) {
    return {
      modified: false,
      skusAdded: 0,
      updatedSkus: existingSkus,
      filePath,
      newContent: null,
    };
  }

  const { options, skusAdded, updatedSkus } = addSkusToOptions(
    data.options,
    existingSkus,
  );

  const modified = skusAdded > 0;
  const newContent = modified
    ? matter.stringify(body, { ...data, options })
    : null;

  return { modified, skusAdded, updatedSkus, filePath, newContent };
};

/**
 * Write modified files to disk
 */
const writeModifiedFiles = (results) => {
  results
    .filter((result) => result.modified && result.newContent)
    .forEach((result) => {
      fs.writeFileSync(result.filePath, result.newContent);
    });
};

/**
 * Process all product files and collect results (recursive implementation)
 */
const processAllProducts = (productsDir, existingSkus) => {
  const products = getProductFiles(productsDir).map(readProductFile);

  const processProducts = (remaining, processed, currentSkus) => {
    if (remaining.length === 0) {
      return { results: processed, currentSkus };
    }

    const [product, ...rest] = remaining;
    const result = processProductFile(product, currentSkus);

    return processProducts(rest, [...processed, result], result.updatedSkus);
  };

  return processProducts(products, [], existingSkus);
};

/**
 * Log processing results
 */
const logResults = (results, dryRun) => {
  const modifiedResults = results.filter((r) => r.modified);

  modifiedResults.forEach((result) => {
    const fileName = path.basename(result.filePath);
    const prefix = dryRun ? "[DRY RUN] Would update" : "Updated";
    console.log(`${prefix} ${fileName}: added ${result.skusAdded} SKU(s)`);
  });

  const totalModified = modifiedResults.length;
  const totalSkusAdded = modifiedResults.reduce(
    (sum, r) => sum + r.skusAdded,
    0,
  );

  const prefix = dryRun ? "[DRY RUN] Would modify" : "Modified";
  console.log(
    `\n${prefix} ${totalModified} file(s), added ${totalSkusAdded} SKU(s)`,
  );

  return { totalModified, totalSkusAdded };
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

  const existingSkus = collectExistingSkus(productsDir);
  console.log(`Found ${existingSkus.size} existing SKUs`);

  const { results } = processAllProducts(productsDir, existingSkus);

  if (!dryRun) {
    writeModifiedFiles(results);
  }

  return logResults(results, dryRun);
};

// CLI handling
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

if (dryRun) {
  console.log("Running in dry-run mode (no files will be modified)\n");
}

addSkusToProducts(dryRun);
