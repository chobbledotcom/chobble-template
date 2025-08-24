import {
  createMockEleventyConfig,
  createTestRunner,
  expectStrictEqual,
  expectDeepEqual,
  expectFunctionType,
} from './test-utils.js';

import {
  processGallery,
  addGallery,
  createProductsCollection,
  getProductsByCategory,
  getReviewsByProduct,
  configureProducts,
} from '../src/_lib/products.js';

const testCases = [
  {
    name: 'processGallery-null',
    description: 'Returns null/undefined gallery unchanged',
    test: () => {
      expectStrictEqual(processGallery(null), null, "Should return null unchanged");
      expectStrictEqual(processGallery(undefined), undefined, "Should return undefined unchanged");
    }
  },
  {
    name: 'processGallery-object',
    description: 'Processes gallery object correctly',
    test: () => {
      const input = {
        "Custom Alt Text": "image1.jpg",
        "0": "image2.jpg",
        "1": "image3.jpg",
        "Another Alt": "image4.jpg"
      };
      
      const result = processGallery(input);
      
      expectStrictEqual(result.length, 4, "Should return 4 items");
      
      const customAltItem = result.find(item => item.filename === "image1.jpg");
      expectDeepEqual(customAltItem, { alt: "Custom Alt Text", filename: "image1.jpg" }, "Should preserve custom alt text");
      
      const integerKeyItems = result.filter(item => ["image2.jpg", "image3.jpg"].includes(item.filename));
      integerKeyItems.forEach(item => {
        expectStrictEqual(item.alt, "", "Integer string keys should become empty alt text");
      });
      
      const anotherAltItem = result.find(item => item.filename === "image4.jpg");
      expectDeepEqual(anotherAltItem, { alt: "Another Alt", filename: "image4.jpg" }, "Should preserve another custom alt text");
    }
  },
  {
    name: 'processGallery-integer-keys',
    description: 'Converts integer string keys to empty alt text',
    test: () => {
      const input = {
        "0": "first.jpg",
        "10": "second.jpg",
        "123": "third.jpg"
      };
      
      const result = processGallery(input);
      
      result.forEach(item => {
        expectStrictEqual(item.alt, "", "Integer string keys should become empty alt text");
      });
    }
  },
  {
    name: 'addGallery-no-gallery',
    description: 'Handles items without gallery',
    test: () => {
      const item = {
        data: {
          title: "Test Product",
          price: 100
        }
      };
      
      const result = addGallery(item);
      
      expectDeepEqual(result.data.gallery, undefined, "Should preserve undefined gallery");
      expectStrictEqual(result.data.title, item.data.title, "Should preserve other data");
      expectStrictEqual(result, item, "Should return same object");
    }
  },
  {
    name: 'addGallery-with-gallery',
    description: 'Processes gallery in item data',
    test: () => {
      const item = {
        data: {
          title: "Test Product",
          gallery: {
            "Product Image": "product.jpg",
            "0": "gallery1.jpg"
          }
        }
      };
      
      const result = addGallery(item);
      
      expectStrictEqual(result.data.gallery.length, 2, "Should have 2 gallery items");
      
      const productImageItem = result.data.gallery.find(item => item.filename === "product.jpg");
      expectDeepEqual(productImageItem, { alt: "Product Image", filename: "product.jpg" }, "Should preserve product image alt");
      
      const galleryItem = result.data.gallery.find(item => item.filename === "gallery1.jpg");
      expectDeepEqual(galleryItem, { alt: "", filename: "gallery1.jpg" }, "Should convert integer key to empty alt");
      
      expectStrictEqual(result.data.title, item.data.title, "Should preserve other data");
      expectStrictEqual(result, item, "Should return same object (mutated for Eleventy compatibility)");
    }
  },
  {
    name: 'addGallery-gallery-processing',
    description: 'Processes gallery correctly while preserving object reference',
    test: () => {
      const originalItem = {
        data: {
          title: "Test Product",
          gallery: { "0": "image.jpg" }
        }
      };
      const itemCopy = JSON.parse(JSON.stringify(originalItem));
      
      const result = addGallery(itemCopy);
      
      expectStrictEqual(result, itemCopy, "Should return same object reference");
      expectStrictEqual(
        JSON.stringify(itemCopy.data.gallery) !== JSON.stringify(originalItem.data.gallery), 
        true, 
        "Should modify gallery"
      );
      expectDeepEqual(itemCopy.data.gallery, [{ alt: "", filename: "image.jpg" }], "Should process gallery correctly");
    }
  },
  {
    name: 'createProductsCollection-basic',
    description: 'Creates products collection from API',
    test: () => {
      const mockProducts = [
        { data: { title: "Product 1", gallery: { "0": "img1.jpg" } } },
        { data: { title: "Product 2" } },
        { data: { title: "Product 3", gallery: { "Alt": "img3.jpg" } } }
      ];
      
      const mockCollectionApi = {
        getFilteredByTag: (tag) => {
          expectStrictEqual(tag, "product", "Should filter by product tag");
          return mockProducts;
        }
      };
      
      const result = createProductsCollection(mockCollectionApi);
      
      expectStrictEqual(result.length, 3, "Should return all products");
      expectDeepEqual(result[0].data.gallery, [{ alt: "", filename: "img1.jpg" }], "Should process first product gallery");
      expectStrictEqual(result[1].data.gallery, undefined, "Should handle missing gallery");
      expectDeepEqual(result[2].data.gallery, [{ alt: "Alt", filename: "img3.jpg" }], "Should process third product gallery");
    }
  },
  {
    name: 'getProductsByCategory-basic',
    description: 'Filters products by category',
    test: () => {
      const products = [
        { data: { title: "Product 1", categories: ["widgets", "gadgets"] } },
        { data: { title: "Product 2", categories: ["tools"] } },
        { data: { title: "Product 3", categories: ["widgets"] } },
        { data: { title: "Product 4" } }
      ];
      
      const result = getProductsByCategory(products, "widgets");
      
      expectStrictEqual(result.length, 2, "Should return 2 products in widgets category");
      expectStrictEqual(result[0].data.title, "Product 1", "Should include first product");
      expectStrictEqual(result[1].data.title, "Product 3", "Should include third product");
    }
  },
  {
    name: 'getProductsByCategory-no-categories',
    description: 'Handles products without categories',
    test: () => {
      const products = [
        { data: { title: "Product 1" } },
        { data: { title: "Product 2", categories: null } },
        { data: { title: "Product 3", categories: [] } }
      ];
      
      const result = getProductsByCategory(products, "widgets");
      
      expectStrictEqual(result.length, 0, "Should return no products when none have matching categories");
    }
  },
  {
    name: 'getReviewsByProduct-basic',
    description: 'Filters reviews by product',
    test: () => {
      const reviews = [
        { data: { title: "Review 1", products: ["product-a", "product-b"] } },
        { data: { title: "Review 2", products: ["product-c"] } },
        { data: { title: "Review 3", products: ["product-a"] } },
        { data: { title: "Review 4" } }
      ];
      
      const result = getReviewsByProduct(reviews, "product-a");
      
      expectStrictEqual(result.length, 2, "Should return 2 reviews for product-a");
      expectStrictEqual(result[0].data.title, "Review 1", "Should include first review");
      expectStrictEqual(result[1].data.title, "Review 3", "Should include third review");
    }
  },
  {
    name: 'getReviewsByProduct-no-products',
    description: 'Handles reviews without products',
    test: () => {
      const reviews = [
        { data: { title: "Review 1" } },
        { data: { title: "Review 2", products: null } },
        { data: { title: "Review 3", products: [] } }
      ];
      
      const result = getReviewsByProduct(reviews, "product-a");
      
      expectStrictEqual(result.length, 0, "Should return no reviews when none have matching products");
    }
  },
  {
    name: 'configureProducts-basic',
    description: 'Configures products collection and filters',
    test: () => {
      const mockConfig = createMockEleventyConfig();
      
      configureProducts(mockConfig);
      
      expectFunctionType(mockConfig.collections, 'products', "Should add products collection");
      expectFunctionType(mockConfig.filters, 'getProductsByCategory', "Should add getProductsByCategory filter");
      expectFunctionType(mockConfig.filters, 'getReviewsByProduct', "Should add getReviewsByProduct filter");
      
      expectStrictEqual(mockConfig.filters.getProductsByCategory, getProductsByCategory, "Should use correct filter function");
      expectStrictEqual(mockConfig.filters.getReviewsByProduct, getReviewsByProduct, "Should use correct filter function");
    }
  },
  {
    name: 'filter-functions-immutable',
    description: 'Filter functions should be pure and not modify inputs',
    test: () => {
      const originalProducts = [
        { data: { title: "Product 1", categories: ["widgets"] } }
      ];
      const originalReviews = [
        { data: { title: "Review 1", products: ["product-1"] } }
      ];
      
      const productsCopy = JSON.parse(JSON.stringify(originalProducts));
      const reviewsCopy = JSON.parse(JSON.stringify(originalReviews));
      
      getProductsByCategory(productsCopy, "widgets");
      getReviewsByProduct(reviewsCopy, "product-1");
      
      expectDeepEqual(productsCopy, originalProducts, "getProductsByCategory should not modify input");
      expectDeepEqual(reviewsCopy, originalReviews, "getReviewsByProduct should not modify input");
    }
  }
];

export default createTestRunner('products', testCases);