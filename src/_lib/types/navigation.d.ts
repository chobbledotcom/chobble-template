/**
 * Navigation types produced by `@11ty/eleventy-navigation` and consumed
 * by `#collections/navigation.js` for rendering menus.
 */

import type { EleventyCollectionItemData } from './eleventy.d.ts';

/**
 * A navigation entry produced by the `eleventyNavigation` filter,
 * ready to be rendered as an `<li>` by `toNavigation`.
 */
export type NavigationEntry = {
  key: string;
  title: string;
  url?: string;
  pluginType: 'eleventy-navigation';
  data: Partial<EleventyCollectionItemData>;
  children?: NavigationEntry[];
};
