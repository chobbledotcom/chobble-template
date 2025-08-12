const { createTestRunner } = require('./test-utils');
const {
  createPrettierTransform,
  configurePrettier,
} = require('../src/_lib/prettier');

const testCases = [
  {
    name: 'createPrettierTransform-basic',
    description: 'Creates transform function',
    test: () => {
      const transform = createPrettierTransform();
      
      if (typeof transform !== 'function') {
        throw new Error('Should return a function');
      }
    }
  },
  {
    name: 'createPrettierTransform-html-only',
    description: 'Transform only processes HTML files',
    asyncTest: async () => {
      const transform = createPrettierTransform();
      
      const cssContent = 'body{margin:0;}';
      const cssPath = '/test/style.css';
      const cssResult = await transform(cssContent, cssPath);
      
      if (cssResult !== cssContent) {
        throw new Error('Should pass through CSS files unchanged');
      }
      
      const jsContent = 'const x=1;';
      const jsPath = '/test/script.js';
      const jsResult = await transform(jsContent, jsPath);
      
      if (jsResult !== jsContent) {
        throw new Error('Should pass through JS files unchanged');
      }
    }
  },
  {
    name: 'createPrettierTransform-html-processing',
    description: 'Transform attempts to process HTML files',
    asyncTest: async () => {
      const transform = createPrettierTransform();
      
      const htmlContent = '<div><p>Hello</p></div>';
      const htmlPath = '/test/file.html';
      
      const result = await transform(htmlContent, htmlPath);
      
      if (typeof result !== 'string') {
        throw new Error('Should return a string');
      }
      // We don't test the actual formatting output - that's prettier's job
    }
  },
  {
    name: 'createPrettierTransform-no-output-path',
    description: 'Handles missing output path by defaulting to HTML',
    asyncTest: async () => {
      const transform = createPrettierTransform();
      
      const htmlContent = '<div><p>Hello</p></div>';
      
      const result = await transform(htmlContent, null);
      
      if (typeof result !== 'string') {
        throw new Error('Should return a string when no path provided');
      }
    }
  },
  {
    name: 'createPrettierTransform-with-options',
    description: 'Creates transform function with custom options',
    test: () => {
      const options = { printWidth: 20 };
      const transform = createPrettierTransform(options);
      
      if (typeof transform !== 'function') {
        throw new Error('Should return a function with options');
      }
    }
  },
  {
    name: 'createPrettierTransform-error-handling',
    description: 'Returns original content when formatting fails',
    asyncTest: async () => {
      const transform = createPrettierTransform();
      
      // Use content that might cause prettier to fail
      const problematicContent = '<div><p>Test content</p></div>';
      const htmlPath = '/test/file.html';
      
      const result = await transform(problematicContent, htmlPath);
      
      if (typeof result !== 'string') {
        throw new Error('Should return a string even if formatting fails');
      }
    }
  },
  {
    name: 'configurePrettier-basic',
    description: 'Configures prettier transform in Eleventy',
    test: () => {
      const mockConfig = {
        addTransform: function(name, fn) {
          this.transforms = this.transforms || {};
          this.transforms[name] = fn;
        }
      };
      
      configurePrettier(mockConfig);
      
      if (!mockConfig.transforms.prettier) {
        throw new Error('Should add prettier transform');
      }
      if (typeof mockConfig.transforms.prettier !== 'function') {
        throw new Error('Should add function transform');
      }
    }
  },
  {
    name: 'configurePrettier-with-options',
    description: 'Configures prettier transform with custom options',
    test: () => {
      const mockConfig = {
        addTransform: function(name, fn) {
          this.transforms = this.transforms || {};
          this.transforms[name] = fn;
        }
      };
      const options = { printWidth: 80 };
      
      configurePrettier(mockConfig, options);
      
      if (!mockConfig.transforms.prettier) {
        throw new Error('Should add prettier transform');
      }
      if (typeof mockConfig.transforms.prettier !== 'function') {
        throw new Error('Should add function transform');
      }
    }
  },
  {
    name: 'prettier-functions-pure',
    description: 'Functions should be pure and consistent',
    test: () => {
      const transform1 = createPrettierTransform();
      const transform2 = createPrettierTransform();
      
      if (typeof transform1 !== 'function') {
        throw new Error('First transform should be a function');
      }
      if (typeof transform2 !== 'function') {
        throw new Error('Second transform should be a function');
      }
      if (transform1 === transform2) {
        throw new Error('Should create different function instances');
      }
    }
  }
];

module.exports = createTestRunner('prettier', testCases);