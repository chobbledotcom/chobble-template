/**
 * TypeScript type definitions for Eleventy
 *
 * These can be imported in JS files using JSDoc:
 * @typedef {import('#lib/types/eleventy.js').EleventyConfig} EleventyConfig
 */

export interface CollectionItem {
  /** URL path for this item */
  url: string;
  /** Input file path */
  inputPath: string;
  /** Output file path */
  outputPath: string;
  /** File slug */
  fileSlug: string;
  /** Date associated with the content */
  date: Date;
  /** Front matter data */
  data: {
    /** Page title */
    title?: string;
    /** Tags */
    tags?: string | string[];
    /** Categories */
    categories?: string[];
    /** Featured flag */
    featured?: boolean;
    /** Layout template */
    layout?: string;
    /** Permalink override */
    permalink?: string | false;
    /** Custom front matter data */
    [key: string]: any;
  };
  /** Template content */
  template?: {
    inputContent?: string;
    templateContent?: string;
  };
}

export interface EleventyCollectionApi {
  /**
   * Get all items in the collection
   */
  getAll(): CollectionItem[];

  /**
   * Get all items with a specific tag
   */
  getFilteredByTag(tag: string): CollectionItem[];

  /**
   * Get all items matching a glob pattern
   */
  getFilteredByGlob(glob: string): CollectionItem[];

  /**
   * Get all items matching multiple globs
   */
  getFilteredByGlobs(globs: string[]): CollectionItem[];

  /**
   * Get sorted items by date (newest first)
   */
  getSortedByDate(): CollectionItem[];

  /**
   * Get all tags used in collections
   */
  getAllSorted(): CollectionItem[];
}

export interface EleventyConfig {
  /**
   * Add a collection
   * @param name - Collection name
   * @param callback - Function that returns collection items
   */
  addCollection(
    name: string,
    callback: (collectionApi: EleventyCollectionApi) => any[] | any
  ): void;

  /**
   * Add a filter (template helper function)
   * @param name - Filter name
   * @param callback - Filter function
   */
  addFilter(name: string, callback: (...args: any[]) => any): void;

  /**
   * Add a global data value
   * @param name - Data key
   * @param value - Data value or function returning value
   */
  addGlobalData(name: string, value: any | (() => any)): void;

  /**
   * Add a shortcode (like a function you can call in templates)
   * @param name - Shortcode name
   * @param callback - Shortcode function
   */
  addShortcode(name: string, callback: (...args: any[]) => string): void;

  /**
   * Add a paired shortcode (with opening and closing tags)
   * @param name - Shortcode name
   * @param callback - Shortcode function (receives content as first arg)
   */
  addPairedShortcode(
    name: string,
    callback: (content: string, ...args: any[]) => string
  ): void;

  /**
   * Add a transform (post-process output)
   * @param name - Transform name
   * @param callback - Transform function
   */
  addTransform(
    name: string,
    callback: (content: string, outputPath: string) => string
  ): void;

  /**
   * Add a passthrough file copy
   * @param path - Path or glob pattern to copy
   */
  addPassthroughCopy(path: string | { [key: string]: string }): void;

  /**
   * Add a layout alias
   * @param alias - Alias name
   * @param path - Path to layout file
   */
  addLayoutAlias(alias: string, path: string): void;

  /**
   * Add a watch target (file to watch for changes)
   * @param path - Path or glob pattern
   */
  addWatchTarget(path: string): void;

  /**
   * Set directories
   */
  dir?: {
    input?: string;
    output?: string;
    includes?: string;
    layouts?: string;
    data?: string;
  };

  /**
   * Add a plugin
   */
  addPlugin(plugin: any, options?: any): void;

  /**
   * Amend global data
   */
  amendLibrary(name: string, callback: (library: any) => void): void;

  /**
   * Set template formats
   */
  setTemplateFormats(formats: string | string[]): void;

  /**
   * Set data deep merge
   */
  setDataDeepMerge(deepMerge: boolean): void;

  /**
   * Set front matter parsing options
   */
  setFrontMatterParsingOptions(options: any): void;

  /**
   * Set liquid options
   */
  setLiquidOptions(options: any): void;
}
