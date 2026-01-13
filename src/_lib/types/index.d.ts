/**
 * Type aliases for PagesCMS-validated data structures
 * Re-exports from pages-cms-generated.d.ts with shorter names for cleaner JSDoc annotations
 */

export type { PagesCMSSpec as Spec } from './pages-cms-generated.d.ts';
export type { PagesCMSFaq as Faq } from './pages-cms-generated.d.ts';
export type { PagesCMSTab as Tab } from './pages-cms-generated.d.ts';
export type { PagesCMSOption as Option } from './pages-cms-generated.d.ts';
export type { PagesCMSFilterAttribute as FilterAttribute } from './pages-cms-generated.d.ts';
export type { PagesCMSOpeningTime as OpeningTime } from './pages-cms-generated.d.ts';
export type { PagesCMSEleventyNavigation as EleventyNav, PagesCMSEleventyNavigation } from './pages-cms-generated.d.ts';
export type { PagesCMSSocial as Social } from './pages-cms-generated.d.ts';
export type { PagesCMSOrganization as Organization } from './pages-cms-generated.d.ts';
export type { PagesCMSImage as Image } from './pages-cms-generated.d.ts';

/**
 * Eleventy collection item with PagesCMS-validated data
 * Represents items returned from collectionApi.getFilteredByTag()
 */
export type EleventyCollectionItem = {
  url: string;
  fileSlug: string;
  data: Record<string, unknown> & {
    title?: string;
    order?: number;
    tags?: string[];
    no_index?: boolean;
    eleventyNavigation?: PagesCMSEleventyNavigation;
    specs?: PagesCMSSpec[];
    faqs?: PagesCMSFaq[];
    tabs?: PagesCMSTab[];
    options?: PagesCMSOption[];
    filter_attributes?: PagesCMSFilterAttribute[];
    opening_times?: PagesCMSOpeningTime[];
  };
};

/**
 * Eleventy CollectionApi - passed to collection callbacks
 * getFilteredByTag always returns an array (empty if no matches)
 */
export type EleventyCollectionApi = {
  getFilteredByTag(tag: string): EleventyCollectionItem[];
};
