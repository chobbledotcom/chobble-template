const {
  createMockEleventyConfig,
  createTestRunner,
  expectStrictEqual,
  expectDeepEqual,
} = require('./test-utils');

const { createFeedConfiguration, configureFeed } = require('../src/_lib/feed');

const mockSiteData = {
  name: "Test Site",
  url: "https://test.example.com"
};

const testCases = [
  {
    name: 'createFeedConfiguration-basic',
    description: 'Creates feed configuration with basic site data',
    test: () => {
      const config = createFeedConfiguration(mockSiteData);
      
      expectStrictEqual(config.type, "atom", "Should set type to atom");
      expectStrictEqual(config.outputPath, "/feed.xml", "Should set output path");
      expectStrictEqual(config.stylesheet, "/assets/pretty-atom-feed.xsl", "Should set stylesheet path");
      expectDeepEqual(config.templateData, {}, "Should set empty template data");
      expectDeepEqual(config.collection, { name: "news", limit: 20 }, "Should set collection config");
      
      const expectedMetadata = {
        language: "en",
        title: mockSiteData.name,
        subtitle: "",
        base: mockSiteData.url,
        author: {
          name: mockSiteData.name,
        },
      };
      expectDeepEqual(config.metadata, expectedMetadata, "Should set metadata correctly");
    }
  },
  {
    name: 'createFeedConfiguration-different-site',
    description: 'Creates feed configuration with different site data',
    test: () => {
      const differentSite = {
        name: "Different Site Name",
        url: "https://different.example.org"
      };
      
      const config = createFeedConfiguration(differentSite);
      
      expectStrictEqual(config.metadata.title, differentSite.name, "Should use provided site name");
      expectStrictEqual(config.metadata.base, differentSite.url, "Should use provided site url");
      expectStrictEqual(config.metadata.author.name, differentSite.name, "Should use site name as author");
    }
  },
  {
    name: 'createFeedConfiguration-immutable',
    description: 'Function should be pure and not modify input',
    test: () => {
      const originalSiteData = {
        name: "Original Site",
        url: "https://original.example.com"
      };
      const siteDataCopy = { ...originalSiteData };
      
      const config = createFeedConfiguration(siteDataCopy);
      
      expectDeepEqual(siteDataCopy, originalSiteData, "Should not modify input site data");
      expectStrictEqual(config !== siteDataCopy, true, "Should return new object");
    }
  },
  {
    name: 'configureFeed-basic',
    description: 'Configures feed plugin with eleventy config',
    test: () => {
      const mockConfig = createMockEleventyConfig();
      
      const result = configureFeed(mockConfig);
      
      expectStrictEqual(mockConfig.pluginCalls.length, 1, "Should call addPlugin once");
      
      const pluginCall = mockConfig.pluginCalls[0];
      expectStrictEqual(typeof pluginCall.plugin, 'function', "Should pass feed plugin function");
      
      // The function now loads site data internally, so we can't easily test the exact config
      // But we can verify it returns a valid configuration object
      expectStrictEqual(typeof result, 'object', "Should return configuration object");
      expectStrictEqual(typeof result.type, 'string', "Should have type property");
      expectStrictEqual(typeof result.outputPath, 'string', "Should have outputPath property");
    }
  },
  {
    name: 'configureFeed-returns-config',
    description: 'Returns the configuration object for chaining',
    test: () => {
      const mockConfig = createMockEleventyConfig();
      
      const result = configureFeed(mockConfig);
      
      expectStrictEqual(typeof result, 'object', "Should return configuration object");
      expectStrictEqual(result.type, 'atom', "Should return atom feed configuration");
      expectStrictEqual(result.outputPath, '/feed.xml', "Should return correct output path");
    }
  },
  {
    name: 'feed-constants-immutable',
    description: 'Feed configuration constants should be consistent',
    test: () => {
      const config1 = createFeedConfiguration(mockSiteData);
      const config2 = createFeedConfiguration(mockSiteData);
      
      expectStrictEqual(config1.type, config2.type, "Type should be consistent");
      expectStrictEqual(config1.outputPath, config2.outputPath, "Output path should be consistent");
      expectStrictEqual(config1.stylesheet, config2.stylesheet, "Stylesheet should be consistent");
      expectDeepEqual(config1.collection, config2.collection, "Collection config should be consistent");
      expectStrictEqual(config1.metadata.language, config2.metadata.language, "Language should be consistent");
      expectStrictEqual(config1.metadata.subtitle, config2.metadata.subtitle, "Subtitle should be consistent");
    }
  }
];

module.exports = createTestRunner('feed', testCases);