#!/usr/bin/env node

/**
 * Alias Method Linter
 *
 * Detects methods that:
 * 1. Are single-line wrappers/aliases that just call another function
 * 2. Are only referenced once in the codebase
 *
 * These are candidates for inlining to reduce code clutter.
 */

import { readdir, readFile, stat } from "fs/promises";
import { dirname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../../..");

// Parse CLI arguments
const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const includeTests = args.includes("--include-tests");
const help = args.includes("--help") || args.includes("-h");

if (help) {
  console.log(`
Alias Method Linter - Detect single-line wrapper methods called only once

Usage: node alias-linter.js [options]

Options:
  --verbose, -v      Show all alias functions, not just single-use ones
  --include-tests    Include test files when counting references
  --help, -h         Show this help message

The linter scans for functions that:
  1. Are single-line wrappers that just delegate to another function
  2. Are only referenced once (or never) in the codebase

These are candidates for inlining to reduce code clutter.
`);
  process.exit(0);
}

// Directories to scan for function definitions
const SCAN_DIRS = ["src/_lib", "src/_data"];

// Additional directories to scan for references (not definitions)
const REF_SCAN_DIRS = includeTests ? ["test"] : [];

// Directories to skip entirely
const SKIP_DIRS = ["node_modules", "_site", ".git"];

// File extensions to scan
const EXTENSIONS = [".js", ".mjs"];

/**
 * Recursively get all JavaScript files in a directory
 */
async function getJsFiles(dir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (
        entry.isFile() &&
        EXTENSIONS.some((ext) => entry.name.endsWith(ext))
      ) {
        files.push(fullPath);
      }
    }
  }

  try {
    await walk(dir);
  } catch (err) {
    // Directory doesn't exist, skip
  }

  return files;
}

/**
 * Parse a file and extract function definitions
 * Returns array of { name, line, body, isAlias, aliasTarget, file }
 */
function extractFunctions(content, filePath) {
  const functions = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Match: const name = (...) => or const name = function(...)
    const arrowMatch = line.match(
      /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)|[\w,\s{}[\]]+)\s*=>\s*(.*)$/,
    );
    const funcExprMatch = line.match(
      /^(?:export\s+)?const\s+(\w+)\s*=\s*function\s*\([^)]*\)\s*\{(.*)$/,
    );
    const funcDeclMatch = line.match(
      /^(?:export\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{(.*)$/,
    );
    const memoizedMatch = line.match(
      /^(?:export\s+)?const\s+(\w+)\s*=\s*memoize\s*\(/,
    );

    let name = null;
    let body = null;

    if (memoizedMatch) {
      // Skip memoized functions - they're usually complex
      name = memoizedMatch[1];
      body = "MEMOIZED";
    } else if (arrowMatch) {
      name = arrowMatch[1];
      const remainder = arrowMatch[2];

      if (remainder.startsWith("{")) {
        // Block body arrow function - extract full body
        body = extractBlockBody(lines, i, line.indexOf("{"));
      } else {
        // Expression body - remainder is the body
        body = remainder.replace(/;$/, "").trim();
      }
    } else if (funcExprMatch || funcDeclMatch) {
      const match = funcExprMatch || funcDeclMatch;
      name = match[1];
      // Extract the block body
      body = extractBlockBody(lines, i, line.indexOf("{"));
    }

    if (name && body) {
      const aliasInfo = detectAlias(body, name);
      functions.push({
        name,
        line: lineNum,
        body: body.substring(0, 100),
        isAlias: aliasInfo.isAlias,
        aliasTarget: aliasInfo.target,
        file: filePath,
      });
    }
  }

  return functions;
}

/**
 * Extract the body of a block (between { and }) starting at a given line/position
 * Returns the body content or "COMPLEX" if not a simple single-statement body
 */
function extractBlockBody(lines, startLineIdx, bracePos) {
  let braceCount = 1;
  let bodyLines = [];
  const startLine = lines[startLineIdx];

  // Start after the opening brace
  let firstPart = startLine.substring(bracePos + 1);

  // Check if closing brace is on same line
  for (let k = 0; k < firstPart.length; k++) {
    if (firstPart[k] === "{") braceCount++;
    if (firstPart[k] === "}") {
      braceCount--;
      if (braceCount === 0) {
        // Single line body
        return firstPart.substring(0, k).trim();
      }
    }
  }

  bodyLines.push(firstPart);

  // Continue to subsequent lines
  for (let j = startLineIdx + 1; j < lines.length && braceCount > 0; j++) {
    const currentLine = lines[j];
    for (let k = 0; k < currentLine.length; k++) {
      if (currentLine[k] === "{") braceCount++;
      if (currentLine[k] === "}") {
        braceCount--;
        if (braceCount === 0) {
          bodyLines.push(currentLine.substring(0, k));
          break;
        }
      }
    }
    if (braceCount > 0) {
      bodyLines.push(currentLine);
    }
  }

  // Join and clean up the body
  const fullBody = bodyLines.join(" ").trim();

  // Check if it's a simple single return statement
  const returnMatch = fullBody.match(/^\s*return\s+(.+?)\s*;?\s*$/);
  if (returnMatch) {
    return returnMatch[1];
  }

  // Check for other simple single statements
  const singleStatement = fullBody.replace(/\s+/g, " ").trim();
  if (!singleStatement.includes(";") || singleStatement.endsWith(";")) {
    // Could be a simple expression
    const cleanedStatement = singleStatement.replace(/;$/, "").trim();
    // If it doesn't have control flow, it might be simple
    if (
      !cleanedStatement.match(/\b(if|for|while|switch|try|const|let|var)\b/)
    ) {
      return cleanedStatement;
    }
  }

  return "COMPLEX";
}

/**
 * Detect if a function body is just an alias to another function
 */
function detectAlias(body, funcName) {
  if (!body || body === "COMPLEX" || body === "MEMOIZED") {
    return { isAlias: false, target: null };
  }

  // Clean up the body
  let cleaned = body
    .replace(/;$/, "")
    .replace(/^\{?\s*return\s+/, "")
    .replace(/\s*\}?$/, "")
    .trim();

  // Patterns that indicate a simple alias:
  // 1. Just calling another function: otherFunc(args)
  // 2. Calling a method: obj.method(args)
  // 3. Returning a function call: return otherFunc(args)

  // Match: functionName(anything) or obj.method(anything)
  const simpleCallMatch = cleaned.match(
    /^([\w.]+)\s*\([^)]*\)\s*(?:\|\|\s*\[\])?$/,
  );
  if (simpleCallMatch) {
    const target = simpleCallMatch[1];
    // Make sure it's not calling itself (recursion)
    if (target !== funcName && !target.endsWith(`.${funcName}`)) {
      return { isAlias: true, target };
    }
  }

  // Match: obj.method() without args - very simple delegation
  const propertyCallMatch = cleaned.match(/^([\w.]+)\s*\(\s*\)$/);
  if (propertyCallMatch) {
    return { isAlias: true, target: propertyCallMatch[1] };
  }

  return { isAlias: false, target: null };
}

/**
 * Count references to a function name across all files
 */
function countReferences(funcName, allContents, definingFile) {
  let count = 0;

  for (const { file, content } of allContents) {
    // Create a regex that matches the function name as a word boundary
    // This avoids matching partial names
    const regex = new RegExp(`\\b${funcName}\\b`, "g");
    const matches = content.match(regex) || [];

    // Subtract 1 if this is the defining file (for the definition itself)
    if (file === definingFile) {
      count += Math.max(0, matches.length - 1);
    } else {
      count += matches.length;
    }
  }

  return count;
}

/**
 * Main linter function
 */
async function runLinter() {
  console.log("🔍 Alias Method Linter\n");
  console.log("Scanning for single-line alias methods called only once...\n");

  // Collect source files (where function definitions are)
  const sourceFiles = [];
  for (const dir of SCAN_DIRS) {
    const fullDir = join(rootDir, dir);
    const files = await getJsFiles(fullDir);
    sourceFiles.push(...files);
  }

  // Collect reference files (additional files to search for usage)
  const refFiles = [];
  for (const dir of REF_SCAN_DIRS) {
    const fullDir = join(rootDir, dir);
    const files = await getJsFiles(fullDir);
    refFiles.push(...files);
  }

  const allFiles = [...sourceFiles, ...refFiles];
  console.log(`Found ${sourceFiles.length} source files to scan`);
  if (refFiles.length > 0) {
    console.log(`Found ${refFiles.length} additional files for reference counting`);
  }
  console.log();

  // Read all file contents
  const allContents = [];
  for (const file of allFiles) {
    const content = await readFile(file, "utf-8");
    allContents.push({ file, content });
  }

  // Extract functions only from source files
  const sourceContents = allContents.filter(({ file }) =>
    sourceFiles.includes(file),
  );
  const allFunctions = [];
  for (const { file, content } of sourceContents) {
    const functions = extractFunctions(content, file);
    allFunctions.push(...functions);
  }

  console.log(`Found ${allFunctions.length} function definitions\n`);

  // Filter to alias functions
  const aliasFunctions = allFunctions.filter((f) => f.isAlias);
  console.log(
    `Found ${aliasFunctions.length} potential alias functions to analyze\n`,
  );

  // Check reference counts for each alias
  const issues = [];
  const aliasesWithMultipleRefs = [];

  for (const func of aliasFunctions) {
    const refCount = countReferences(func.name, allContents, func.file);
    if (refCount <= 1) {
      issues.push({
        ...func,
        references: refCount,
      });
    } else {
      aliasesWithMultipleRefs.push({
        ...func,
        references: refCount,
      });
    }
  }

  // Verbose mode: show all aliases
  if (verbose && aliasesWithMultipleRefs.length > 0) {
    console.log("─".repeat(70));
    console.log("📋 All alias functions (verbose mode):\n");

    for (const alias of [...issues, ...aliasesWithMultipleRefs].sort(
      (a, b) => a.references - b.references,
    )) {
      const relPath = relative(rootDir, alias.file);
      const status = alias.references <= 1 ? "⚠️ " : "✓ ";
      console.log(
        `  ${status}${alias.name} -> ${alias.aliasTarget} (${alias.references} refs) [${relPath}:${alias.line}]`,
      );
    }
    console.log();
  }

  // Report findings
  if (issues.length === 0) {
    console.log("✅ No single-use alias methods found!\n");
    return 0;
  }

  console.log("─".repeat(70));
  console.log(
    `⚠️  Found ${issues.length} alias method(s) that may be candidates for inlining:\n`,
  );

  for (const issue of issues) {
    const relPath = relative(rootDir, issue.file);
    console.log(`  ${relPath}:${issue.line}`);
    console.log(`    Function: ${issue.name}`);
    console.log(`    Aliases:  ${issue.aliasTarget}`);
    console.log(`    References: ${issue.references} (excluding definition)`);
    console.log(`    Consider: Inline this call or remove if unused\n`);
  }

  console.log("─".repeat(70));
  console.log(
    "\nThese functions are simple wrappers that delegate to another function",
  );
  console.log("and are only called once (or never). Consider:");
  console.log("  1. Inlining the call at the single usage site");
  console.log("  2. Removing the function if it's unused");
  console.log("  3. Adding more usages if the abstraction is intentional\n");

  return issues.length;
}

// Run the linter
runLinter()
  .then((issueCount) => {
    if (issueCount > 0) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Error running linter:", err);
    process.exit(1);
  });

export { extractFunctions, detectAlias, countReferences };
