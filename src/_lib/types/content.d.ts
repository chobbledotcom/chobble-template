/**
 * Content types
 *
 * Re-exports from PagesCMS-generated types with shorter names,
 * plus additional product/cart types.
 */

// Re-export PagesCMS types with shorter names
export type { PagesCMSSpec as Spec } from './pages-cms-generated.d.ts';
export type { PagesCMSFaq as Faq } from './pages-cms-generated.d.ts';
export type { PagesCMSTab as Tab } from './pages-cms-generated.d.ts';
export type { PagesCMSOption as Option } from './pages-cms-generated.d.ts';
export type { PagesCMSFilterAttribute as FilterAttribute } from './pages-cms-generated.d.ts';
export type { PagesCMSOpeningTime as OpeningTime } from './pages-cms-generated.d.ts';
export type { PagesCMSEleventyNavigation as EleventyNav } from './pages-cms-generated.d.ts';
export type { PagesCMSSocial as Social } from './pages-cms-generated.d.ts';
export type { PagesCMSOrganization as Organization } from './pages-cms-generated.d.ts';
export type { PagesCMSImage as Image } from './pages-cms-generated.d.ts';
export type { PagesCMSBlock as Block } from './pages-cms-generated.d.ts';

// Also export with PagesCMS prefix for explicit use
export type { PagesCMSEleventyNavigation } from './pages-cms-generated.d.ts';
export type { PagesCMSImage } from './pages-cms-generated.d.ts';
export type { PagesCMSOption } from './pages-cms-generated.d.ts';
export type { PagesCMSSpec } from './pages-cms-generated.d.ts';
export type { PagesCMSFaq } from './pages-cms-generated.d.ts';
export type { PagesCMSTab } from './pages-cms-generated.d.ts';
export type { PagesCMSFilterAttribute } from './pages-cms-generated.d.ts';
export type { PagesCMSOpeningTime } from './pages-cms-generated.d.ts';

/**
 * Product option (extended with sku field)
 */
export type ProductOption = {
  name: string;
  unit_price: string | number;
  days?: number;
  max_quantity?: number;
  sku?: string;
};

/**
 * Product specification
 */
export type ProductSpec = {
  name: string;
  value: string;
};

/**
 * Product data from frontmatter
 */
export type ProductData = {
  options?: ProductOption[];
  title: string;
};

/**
 * Parameters for generating cart attributes
 */
export type CartAttributesParams = {
  title: string;
  subtitle?: string;
  options: ProductOption[];
  specs?: ProductSpec[];
  mode: string;
};
