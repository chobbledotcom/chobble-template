import { execSync } from 'child_process';
import {
  fs,
  path,
  createTempDir,
  cleanupTempDir,
  createTestRunner,
  expectTrue,
} from './test-utils.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// List of optional folders to test
const OPTIONAL_FOLDERS = [
  'src/pages',
  'src/categories',
  'src/menus',
  'src/menu-categories',
  'src/menu-items',
  'src/products',
  'src/events',
  'src/news',
  'src/reviews',
  'src/snippets',
  'src/team',
];

// Create a minimal Eleventy project in temp directory
const createMinimalProject = (tempDir, createIndexPage = true) => {
  // Copy essential files
  const essentialFiles = [
    '.eleventy.js',
    'package.json',
    'package-lock.json',
  ];
  
  for (const file of essentialFiles) {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(tempDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  // Copy essential directories
  const essentialDirs = [
    'src/_lib',
    'src/_data',
    'src/_includes',
    'src/_layouts',
    'src/assets',
    'src/images',
    'src/css',
    'src/utils',
  ];
  
  for (const dir of essentialDirs) {
    const srcPath = path.join(rootDir, dir);
    const destPath = path.join(tempDir, dir);
    if (fs.existsSync(srcPath)) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  }
  
  // Create a minimal index page if requested
  if (createIndexPage) {
    const indexMdPath = path.join(tempDir, 'src/index.md');
    fs.writeFileSync(indexMdPath, `---
layout: base.html
title: Home
---

# Test Home Page

This is a minimal home page for testing.
`);
  }
  
  // Ensure node_modules exist (symlink to avoid reinstalling)
  const srcNodeModules = path.join(rootDir, 'node_modules');
  const destNodeModules = path.join(tempDir, 'node_modules');
  if (fs.existsSync(srcNodeModules) && !fs.existsSync(destNodeModules)) {
    fs.symlinkSync(srcNodeModules, destNodeModules, 'dir');
  }
};

// Test that Eleventy builds successfully
const testBuild = (tempDir, description) => {
  try {
    // Use the eleventy binary directly from node_modules
    const eleventyPath = path.join(rootDir, 'node_modules', '.bin', 'eleventy');
    const result = execSync(eleventyPath, {
      cwd: tempDir,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30000, // 30 second timeout
    });
    
    // Check if _site directory was created
    const siteDir = path.join(tempDir, '_site');
    expectTrue(fs.existsSync(siteDir), `_site directory should exist after build`);
    
    // Check if index.html was generated
    const indexHtml = path.join(siteDir, 'index.html');
    expectTrue(fs.existsSync(indexHtml), `index.html should exist in _site`);
    
    return true;
  } catch (error) {
    console.error(`Build failed for ${description}:`);
    console.error(error.message);
    if (error.stdout) console.error('STDOUT:', error.stdout);
    if (error.stderr) console.error('STDERR:', error.stderr);
    throw error;
  }
};

const testCases = [
  {
    name: 'build-with-all-folders',
    description: 'Build with all folders present', 
    test: () => {
      const tempDir = createTempDir('build-all-folders');
      let success = false;
      try {
        // Create minimal project without index (since pages/home.md will provide it)
        createMinimalProject(tempDir, false);
        
        // Copy all optional folders
        for (const folder of OPTIONAL_FOLDERS) {
          const srcPath = path.join(rootDir, folder);
          const destPath = path.join(tempDir, folder);
          if (fs.existsSync(srcPath)) {
            fs.cpSync(srcPath, destPath, { recursive: true });
          }
        }
        
        // Test build
        testBuild(tempDir, 'all folders present');
        success = true;
      } finally {
        // Only cleanup if successful (for debugging failed tests)
        if (success || !process.env.DEBUG_TESTS) {
          cleanupTempDir(tempDir);
        } else {
          console.log(`Debug: Test failed, preserving temp dir: ${tempDir}`);
        }
      }
    }
  },
];

// Generate test cases for each optional folder being missing
for (const folder of OPTIONAL_FOLDERS) {
  const folderName = folder.split('/').pop();
  testCases.push({
    name: `build-without-${folderName}`,
    description: `Build without ${folder} folder`,
    test: () => {
      const tempDir = createTempDir(`build-no-${folderName}`);
      try {
        // Create minimal project (with index if pages folder is missing)
        const createIndex = folder === 'src/pages';
        createMinimalProject(tempDir, createIndex);
        
        // Copy all optional folders EXCEPT the one we're testing
        for (const optFolder of OPTIONAL_FOLDERS) {
          if (optFolder !== folder) {
            const srcPath = path.join(rootDir, optFolder);
            const destPath = path.join(tempDir, optFolder);
            if (fs.existsSync(srcPath)) {
              fs.cpSync(srcPath, destPath, { recursive: true });
            }
          }
        }
        
        // Ensure the folder doesn't exist
        const missingFolder = path.join(tempDir, folder);
        expectTrue(!fs.existsSync(missingFolder), `${folder} should not exist`);
        
        // Test build
        testBuild(tempDir, `missing ${folder}`);
      } finally {
        cleanupTempDir(tempDir);
      }
    }
  });
}

// Test with multiple folders missing
testCases.push({
  name: 'build-without-multiple-folders',
  description: 'Build without pages, categories, and menus folders',
  test: () => {
    const tempDir = createTempDir('build-minimal');
    try {
      // Create minimal project
      createMinimalProject(tempDir);
      
      // Only copy some optional folders
      const foldersToInclude = [
        'src/events',
        'src/news',
        'src/team',
      ];
      
      for (const folder of foldersToInclude) {
        const srcPath = path.join(rootDir, folder);
        const destPath = path.join(tempDir, folder);
        if (fs.existsSync(srcPath)) {
          fs.cpSync(srcPath, destPath, { recursive: true });
        }
      }
      
      // Test build
      testBuild(tempDir, 'minimal folders');
    } finally {
      cleanupTempDir(tempDir);
    }
  }
});

// Test with absolutely minimal setup (no optional folders at all)
testCases.push({
  name: 'build-with-no-optional-folders',
  description: 'Build with no optional folders at all',
  test: () => {
    const tempDir = createTempDir('build-bare-minimum');
    try {
      // Create minimal project with only essential folders
      createMinimalProject(tempDir);
      
      // Verify no optional folders exist
      for (const folder of OPTIONAL_FOLDERS) {
        const folderPath = path.join(tempDir, folder);
        expectTrue(!fs.existsSync(folderPath), `${folder} should not exist`);
      }
      
      // Test build
      testBuild(tempDir, 'no optional folders');
    } finally {
      cleanupTempDir(tempDir);
    }
  }
});

createTestRunner('build-missing-folders', testCases);