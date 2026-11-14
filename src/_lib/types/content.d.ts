/**
 * Content types
 *
 * Re-exports from PagesCMS-generated types with shorter names,
 * plus additional product/cart types.
 */

// Re-export PagesCMS types with shorter names
export type { PagesCMSFaq as Faq } from './pages-cms-generated.d.ts';
export type { PagesCMSOption as Option } from './pages-cms-generated.d.ts';
export type { PagesCMSFilterAttribute as FilterAttribute } from './pages-cms-generated.d.ts';
export type { PagesCMSOpeningTime as OpeningTime } from './pages-cms-generated.d.ts';
/**
 * Extended Eleventy navigation type.
 * Adds url, parent, and title properties used by the Eleventy navigation plugin
 * but not present in the PagesCMS-generated base type.
 */
export type EleventyNav = import('./pages-cms-generated.d.ts').PagesCMSEleventyNavigation & {
  url?: string;
  parent?: string;
  title?: string;
};
export type { PagesCMSSocial as Social } from './pages-cms-generated.d.ts';
export type { PagesCMSOrganization as Organization } from './pages-cms-generated.d.ts';
export type { PagesCMSImage as Image } from './pages-cms-generated.d.ts';
export type { PagesCMSBlock as Block } from './pages-cms-generated.d.ts';

// Also export with PagesCMS prefix for explicit use
export type { PagesCMSEleventyNavigation } from './pages-cms-generated.d.ts';
export type { PagesCMSImage } from './pages-cms-generated.d.ts';
export type { PagesCMSOption } from './pages-cms-generated.d.ts';
export type { PagesCMSFaq } from './pages-cms-generated.d.ts';
export type { PagesCMSFilterAttribute } from './pages-cms-generated.d.ts';
export type { PagesCMSOpeningTime } from './pages-cms-generated.d.ts';
