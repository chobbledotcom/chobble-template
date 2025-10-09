import { createTestRunner } from './test-utils.js';
import { buildBaseMeta } from '../src/_lib/schema-helper.mjs';

const testCases = [
  {
    name: 'autoHeaderImage-enabled',
    description: 'Uses first gallery image when autoHeaderImage is true',
    test: () => {
      const data = {
        site: { url: 'https://example.com' },
        page: { url: '/test/' },
        title: 'Test Page',
        config: { autoHeaderImage: true },
        gallery: ['first-image.jpg', 'second-image.jpg']
      };

      const result = buildBaseMeta(data);

      if (result.image?.src !== 'https://example.com/images/first-image.jpg') {
        throw new Error(`Expected image to be first gallery image, got ${result.image?.src}`);
      }
    }
  },
  {
    name: 'autoHeaderImage-disabled',
    description: 'Does not use gallery image when autoHeaderImage is false',
    test: () => {
      const data = {
        site: { url: 'https://example.com' },
        page: { url: '/test/' },
        title: 'Test Page',
        config: { autoHeaderImage: false },
        gallery: ['first-image.jpg', 'second-image.jpg']
      };

      const result = buildBaseMeta(data);

      if (result.image) {
        throw new Error(`Expected no image when autoHeaderImage is false, got ${result.image?.src}`);
      }
    }
  },
  {
    name: 'autoHeaderImage-explicit-header-overrides',
    description: 'Explicit header_image overrides gallery even when autoHeaderImage is false',
    test: () => {
      const data = {
        site: { url: 'https://example.com' },
        page: { url: '/test/' },
        title: 'Test Page',
        config: { autoHeaderImage: false },
        header_image: 'explicit-header.jpg',
        gallery: ['first-image.jpg', 'second-image.jpg']
      };

      const result = buildBaseMeta(data);

      if (result.image?.src !== 'https://example.com/images/explicit-header.jpg') {
        throw new Error(`Expected explicit header image, got ${result.image?.src}`);
      }
    }
  },
  {
    name: 'autoHeaderImage-default-true',
    description: 'Defaults to true when config.autoHeaderImage is undefined',
    test: () => {
      const data = {
        site: { url: 'https://example.com' },
        page: { url: '/test/' },
        title: 'Test Page',
        config: {},
        gallery: ['first-image.jpg', 'second-image.jpg']
      };

      const result = buildBaseMeta(data);

      if (result.image?.src !== 'https://example.com/images/first-image.jpg') {
        throw new Error(`Expected to default to true and use gallery image, got ${result.image?.src}`);
      }
    }
  },
  {
    name: 'autoHeaderImage-gallery-object-enabled',
    description: 'Uses first gallery image from object format when autoHeaderImage is true',
    test: () => {
      const data = {
        site: { url: 'https://example.com' },
        page: { url: '/test/' },
        title: 'Test Page',
        config: { autoHeaderImage: true },
        gallery: {
          'Product Front': 'front-image.jpg',
          'Product Back': 'back-image.jpg'
        }
      };

      const result = buildBaseMeta(data);

      if (result.image?.src !== 'https://example.com/images/front-image.jpg') {
        throw new Error(`Expected first gallery object value, got ${result.image?.src}`);
      }
    }
  },
  {
    name: 'autoHeaderImage-gallery-object-disabled',
    description: 'Does not use gallery object when autoHeaderImage is false',
    test: () => {
      const data = {
        site: { url: 'https://example.com' },
        page: { url: '/test/' },
        title: 'Test Page',
        config: { autoHeaderImage: false },
        gallery: {
          'Alt Text': 'image.jpg'
        }
      };

      const result = buildBaseMeta(data);

      if (result.image) {
        throw new Error(`Expected no image when autoHeaderImage is false, got ${result.image?.src}`);
      }
    }
  }
];

export default createTestRunner('auto-header-image', testCases);
