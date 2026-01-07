# TypeScript Integration Guide

This repo now supports TypeScript type checking **while keeping all code as `.js` files**. You get IDE autocomplete, type safety, and refactoring support without converting to TypeScript.

## What's Set Up

1. **TypeScript compiler** (`typescript` and `@types/bun` installed)
2. **tsconfig.json** configured for JSDoc type checking
3. **Import aliases** (`#utils/*`, `#lib/*`, etc.) work in both runtime and type checking

## How It Works

TypeScript's `checkJs` mode analyzes JavaScript files and respects JSDoc type annotations. Your code stays as tidy `.js` files, but you get type safety.

---

## Three Approaches (Pick One or Mix)

### Approach 1: JSDoc Annotations (Recommended)

Add types directly in comments above your JavaScript code.

**Example - Basic function:**
```javascript
/**
 * Calculate the total price with tax
 * @param {number} price - Base price
 * @param {number} taxRate - Tax rate (e.g., 0.2 for 20%)
 * @returns {number} Total price including tax
 */
const calculateTotal = (price, taxRate) => {
  return price * (1 + taxRate);
};
```

**Example - Curried functions:**
```javascript
/**
 * Filter array by predicate (curried)
 * @template T
 * @param {(item: T) => boolean} predicate
 * @returns {(arr: T[]) => T[]}
 */
const filter = (predicate) => (arr) => arr.filter(predicate);
```

**Example - Object types:**
```javascript
/**
 * @typedef {Object} Product
 * @property {string} title
 * @property {number} price
 * @property {string[]} [categories] - Optional categories
 */

/**
 * Get products by category
 * @param {Product[]} products
 * @param {string} categorySlug
 * @returns {Product[]}
 */
const getProductsByCategory = (products, categorySlug) =>
  products.filter((product) => product.categories?.includes(categorySlug));
```

**Example - Import types from other files:**
```javascript
/**
 * @typedef {import('./types.js').EleventyConfig} EleventyConfig
 */

/**
 * Configure products collection
 * @param {EleventyConfig} eleventyConfig
 */
export const configureProducts = (eleventyConfig) => {
  // ...
};
```

---

### Approach 2: Type Declaration Files (`.d.ts`)

Create `.d.ts` files alongside your `.js` files. TypeScript will automatically use them.

**Example - `src/_lib/utils/array-utils.d.ts`:**
```typescript
export function pipe<T>(...fns: Array<(x: any) => any>): (x: T) => any;

export function filter<T>(predicate: (item: T) => boolean): (arr: T[]) => T[];

export function map<T, U>(fn: (item: T) => U): (arr: T[]) => U[];

export function unique<T>(arr: T[]): T[];

export interface FilterMapFn {
  <T, U>(predicate: (item: T) => boolean, transform: (item: T) => U): (arr: T[]) => U[];
}
export const filterMap: FilterMapFn;
```

**Pros:**
- Cleaner JS files (no JSDoc clutter)
- More expressive type syntax
- Better for complex types

**Cons:**
- Need to maintain two files
- Types can get out of sync with implementation

---

### Approach 3: Shared Type Definitions

Create central type definition files that multiple modules import.

**Example - `src/_lib/types/collections.d.ts`:**
```typescript
export interface CollectionItem {
  url: string;
  date: Date;
  data: {
    title?: string;
    categories?: string[];
    featured?: boolean;
    [key: string]: any;
  };
}

export interface EleventyCollectionApi {
  getAll(): CollectionItem[];
  getFilteredByTag(tag: string): CollectionItem[];
  getFilteredByGlob(glob: string): CollectionItem[];
}

export interface EleventyConfig {
  addCollection(name: string, fn: (api: EleventyCollectionApi) => any): void;
  addFilter(name: string, fn: Function): void;
  addShortcode(name: string, fn: Function): void;
  // ... more as needed
}
```

**Then use in your JS files:**
```javascript
/**
 * @typedef {import('#lib/types/collections.js').EleventyConfig} EleventyConfig
 * @typedef {import('#lib/types/collections.js').CollectionItem} CollectionItem
 */

/**
 * @param {EleventyConfig} eleventyConfig
 */
export const configureProducts = (eleventyConfig) => {
  // TypeScript now knows the shape of eleventyConfig
};
```

---

## Running Type Checks

### Manual type checking:
```bash
bun tsc --noEmit
```

### Add to package.json scripts:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "bun run lint && bun run typecheck && bun run build --quiet && bun test/run-coverage.js"
  }
}
```

---

## Strictness Levels

The current `tsconfig.json` is **lenient** to get you started. Tighten it progressively:

### Level 1: Current (Lenient)
```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": false,
    "noImplicitAny": false
  }
}
```

### Level 2: Moderate
```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": false,
    "noImplicitAny": true,          // Require types for params
    "strictNullChecks": true         // Catch null/undefined errors
  }
}
```

### Level 3: Strict (Full Safety)
```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true                   // All checks enabled
  }
}
```

---

## IDE Support

### VS Code
Works automatically! Open any `.js` file and you'll get:
- Autocomplete based on JSDoc types
- Inline error squiggles
- Go-to-definition for types
- Refactoring support

### Other IDEs
Most modern editors (WebStorm, Sublime, Vim with CoC) support TypeScript language server and will pick up types automatically.

---

## Compatibility with Biome

TypeScript type checking and Biome linting work **independently**:
- Biome checks code style and catches bugs
- TypeScript checks types

Run both:
```bash
bun run lint      # Biome
bun run typecheck # TypeScript
```

They complement each other!

---

## Migration Strategy

**Start small:**
1. Add JSDoc to new code you write
2. When you touch a file, add types to the functions you modify
3. Gradually increase strictness in `tsconfig.json`

**Don't:**
- Try to type the entire codebase at once
- Block development on type errors initially
- Convert to `.ts` files (defeats the purpose!)

---

## Example: Migrating `array-utils.js`

You already have JSDoc comments! Just enhance them with types:

**Before:**
```javascript
/**
 * Left-to-right function composition
 * @param {...Function} fns - Functions to compose
 * @returns {Function} (value) => transformed value
 */
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
```

**After (with generics):**
```javascript
/**
 * Left-to-right function composition
 * @template T
 * @param {...((x: any) => any)} fns - Functions to compose
 * @returns {(value: T) => any}
 */
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
```

---

## Common Patterns

### Pattern: Eleventy Config Functions
```javascript
/**
 * @typedef {import('#lib/types/eleventy.js').EleventyConfig} EleventyConfig
 */

/**
 * Configure products collection
 * @param {EleventyConfig} eleventyConfig
 */
export const configureProducts = (eleventyConfig) => {
  eleventyConfig.addCollection("products", (collectionApi) => {
    // TypeScript knows collectionApi's methods
    return collectionApi.getFilteredByTag("product");
  });
};
```

### Pattern: Curried Functions
```javascript
/**
 * @template T
 * @param {(item: T) => boolean} predicate
 * @returns {(arr: T[]) => T[]}
 */
const filter = (predicate) => (arr) => arr.filter(predicate);
```

### Pattern: Optional Chaining
```javascript
/**
 * @param {Array<{categories?: string[]}>} products
 * @returns {number}
 */
const countCategorizedProducts = (products) =>
  products.filter((p) => p.categories?.length > 0).length;
```

---

## Resources

- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Type Checking JavaScript Files](https://www.typescriptlang.org/docs/handbook/intro-to-js-ts.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)

---

## Summary

**You now have type checking without changing your workflow:**
1. ✅ Keep code as `.js` files
2. ✅ Add JSDoc comments for type safety
3. ✅ Run `bun tsc --noEmit` to check types
4. ✅ Get IDE autocomplete and refactoring
5. ✅ Compatible with Bun, Biome, and all existing tooling

**Next steps:**
1. Try adding JSDoc to a few functions
2. Run `bun tsc --noEmit` and fix any errors
3. Add `typecheck` to your test script
4. Gradually increase strictness
