import {
  createMockEleventyConfig,
  createTestRunner,
  withTempDir,
  withTempFile,
  withMockedCwd,
  createTempSnippetsDir,
  cleanupTempDir,
  expectStrictEqual,
  expectDeepEqual,
  expectFunctionType,
  expectTrue,
  expectFalse,
  fs
} from './test-utils.js';

import {
  createMarkdownRenderer,
  fileExists,
  fileMissing,
  readFileContent,
  extractBodyFromMarkdown,
  renderSnippet,
  configureFileUtils,
} from '../src/_lib/file-utils.js';

const testCases = [
  {
    name: 'createMarkdownRenderer-default',
    description: 'Creates markdown renderer with default options',
    test: () => {
      const renderer = createMarkdownRenderer();
      expectFunctionType(renderer, 'render', "Should have render function");
      
      const result = renderer.render('# Hello\n\nWorld');
      expectTrue(result.includes('<h1>'), "Should render markdown to HTML");
      expectTrue(result.includes('Hello'), "Should include content");
    }
  },
  {
    name: 'createMarkdownRenderer-custom',
    description: 'Creates markdown renderer with custom options',
    test: () => {
      const renderer = createMarkdownRenderer({ html: false });
      expectFunctionType(renderer, 'render', "Should have render function");
      
      const result = renderer.render('<div>HTML</div>');
      expectFalse(result.includes('<div>'), "Should not allow HTML when html: false");
    }
  },
  {
    name: 'fileExists-true',
    description: 'Returns true for existing files',
    test: () => {
      withTempFile('fileExists', 'test.txt', 'test content', (tempDir) => {
        const result = fileExists('test.txt', tempDir);
        expectTrue(result, "Should return true for existing file");
      });
    }
  },
  {
    name: 'fileExists-false',
    description: 'Returns false for non-existing files',
    test: () => {
      withTempDir('fileExists-false', (tempDir) => {
        const result = fileExists('nonexistent.txt', tempDir);
        expectFalse(result, "Should return false for non-existing file");
      });
    }
  },
  {
    name: 'fileExists-default-cwd',
    description: 'Uses process.cwd() as default base directory',
    test: () => {
      const result = fileExists('package.json');
      expectTrue(result, "Should find package.json in project root");
    }
  },
  {
    name: 'fileMissing-inverse',
    description: 'Returns inverse of fileExists',
    test: () => {
      withTempFile('fileMissing', 'test.txt', 'test content', (tempDir) => {
        expectFalse(fileMissing('test.txt', tempDir), "Should return false for existing file");
        expectTrue(fileMissing('nonexistent.txt', tempDir), "Should return true for non-existing file");
      });
    }
  },
  {
    name: 'readFileContent-exists',
    description: 'Reads content from existing file',
    test: () => {
      const content = 'Hello, World!';
      withTempFile('readFile', 'test.txt', content, (tempDir) => {
        const result = readFileContent('test.txt', tempDir);
        expectStrictEqual(result, content, "Should return file content");
      });
    }
  },
  {
    name: 'readFileContent-missing',
    description: 'Returns empty string for missing file',
    test: () => {
      withTempDir('readFile-missing', (tempDir) => {
        const result = readFileContent('nonexistent.txt', tempDir);
        expectStrictEqual(result, "", "Should return empty string for missing file");
      });
    }
  },
  {
    name: 'extractBodyFromMarkdown-with-frontmatter',
    description: 'Extracts body content excluding frontmatter',
    test: () => {
      const content = `---
title: Test Title
layout: page
---
# Heading
Content after frontmatter`;
      
      const result = extractBodyFromMarkdown(content);
      const expected = '# Heading\nContent after frontmatter';
      
      expectStrictEqual(result, expected, "Should extract body content without frontmatter");
    }
  },
  {
    name: 'extractBodyFromMarkdown-without-frontmatter',
    description: 'Returns original content when no frontmatter',
    test: () => {
      const content = '# Heading Only\nThis is content without any frontmatter';
      
      const result = extractBodyFromMarkdown(content);
      
      expectStrictEqual(result, content, "Should return original content when no frontmatter");
    }
  },
  {
    name: 'extractBodyFromMarkdown-only-frontmatter',
    description: 'Returns empty string for only frontmatter',
    test: () => {
      const content = `---
title: Only Frontmatter
layout: page
---`;
      
      const result = extractBodyFromMarkdown(content);
      
      expectStrictEqual(result, '', "Should return empty string for only frontmatter");
    }
  },
  {
    name: 'extractBodyFromMarkdown-malformed',
    description: 'Returns original content for malformed frontmatter',
    test: () => {
      const content = `---
title: Malformed
layout: page
# Heading
Content with malformed frontmatter`;
      
      const result = extractBodyFromMarkdown(content);
      
      expectStrictEqual(result, content, "Should return original content for malformed frontmatter");
    }
  },
  {
    name: 'renderSnippet-exists',
    description: 'Renders existing snippet file',
    test: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir('renderSnippet');
      const content = `---
title: Test
---
# Hello

World`;
      
      try {
        // fs already imported from test-utils
        fs.writeFileSync(snippetsDir + '/test.md', content);
        
        const result = await renderSnippet('test', 'default', tempDir);
        expectTrue(result.includes('<h1>'), "Should render markdown to HTML");
        expectTrue(result.includes('Hello'), "Should include content");
        expectFalse(result.includes('title: Test'), "Should not include frontmatter");
      } finally {
        cleanupTempDir(tempDir);
      }
    }
  },
  {
    name: 'renderSnippet-missing',
    description: 'Returns default string for missing snippet',
    test: async () => {
      withTempDir('renderSnippet-missing', async (tempDir) => {
        const result = await renderSnippet('nonexistent', 'Default content', tempDir);
        expectStrictEqual(result, 'Default content', "Should return default string for missing snippet");
      });
    }
  },
  {
    name: 'renderSnippet-custom-renderer',
    description: 'Uses custom markdown renderer',
    test: async () => {
      const { tempDir, snippetsDir } = createTempSnippetsDir('renderSnippet-custom');
      const content = '# Hello\n\nWorld';
      
      try {
        // fs already imported from test-utils
        fs.writeFileSync(snippetsDir + '/test.md', content);
        
        const customRenderer = createMarkdownRenderer({ html: false });
        const result = await renderSnippet('test', 'default', tempDir, customRenderer);
        expectTrue(result.includes('<h1>'), "Should render with custom renderer");
      } finally {
        cleanupTempDir(tempDir);
      }
    }
  },
  {
    name: 'configureFileUtils-basic',
    description: 'Configures file utility filters and shortcodes',
    test: () => {
      const mockConfig = createMockEleventyConfig();
      
      configureFileUtils(mockConfig);
      
      expectFunctionType(mockConfig.filters, 'file_exists', "Should add file_exists filter");
      expectFunctionType(mockConfig.filters, 'file_missing', "Should add file_missing filter");
      expectFunctionType(mockConfig.asyncShortcodes, 'render_snippet', "Should add render_snippet async shortcode");
      expectFunctionType(mockConfig.shortcodes, 'read_file', "Should add read_file shortcode");
    }
  },
  {
    name: 'configureFileUtils-filters-work',
    description: 'Configured filters work correctly',
    test: () => {
      const mockConfig = createMockEleventyConfig();
      configureFileUtils(mockConfig);
      
      const existsResult = mockConfig.filters.file_exists('package.json');
      const missingResult = mockConfig.filters.file_missing('nonexistent-file.txt');
      
      expectTrue(existsResult, "file_exists should work");
      expectTrue(missingResult, "file_missing should work");
    }
  },
  {
    name: 'configureFileUtils-shortcodes-work',
    description: 'Configured shortcodes work correctly',
    test: async () => {
      const content = 'Test content';
      
      withTempFile('shortcodes', 'test.txt', content, async (tempDir) => {
        const mockConfig = createMockEleventyConfig();
        configureFileUtils(mockConfig);
        
        await withMockedCwd(tempDir, async () => {
          const readResult = mockConfig.shortcodes.read_file('test.txt');
          expectStrictEqual(readResult, content, "read_file shortcode should work");
          
          const snippetResult = await mockConfig.asyncShortcodes.render_snippet('nonexistent', 'default');
          expectStrictEqual(snippetResult, 'default', "render_snippet shortcode should work");
        });
      });
    }
  },
  {
    name: 'functional-programming-style',
    description: 'Functions should be pure and not modify inputs',
    test: () => {
      const content = 'original content';
      const name = 'test-name';
      const defaultStr = 'default';
      
      extractBodyFromMarkdown(content);
      fileExists(name);
      fileMissing(name);
      
      expectStrictEqual(content, 'original content', "Functions should not modify input strings");
      expectStrictEqual(name, 'test-name', "Functions should not modify input parameters");
      expectStrictEqual(defaultStr, 'default', "Functions should not modify input parameters");
    }
  }
];

export default createTestRunner('file-utils', testCases);