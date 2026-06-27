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

/**
 * Product option (extended with sku field)
 */
export type ProductOption = {
  name: string;
  unit_price: number;
  days?: number;
  max_quantity?: number;
  sku?: string;
};

/**
 * Product option after normalization for cart attributes / collection processing.
 * Optional input fields are explicit `null` (not `undefined`) so JSON.stringify
 * preserves them and downstream consumers can rely on their presence.
 */
export type NormalizedProductOption = {
  name: string;
  unit_price: number;
  days: number | null;
  max_quantity: number | null;
  sku: string | null;
};

/**
 * Product data from frontmatter
 */
export type ProductData = {
  options?: ProductOption[];
  name: string;
};

/**
 * Parameters for generating cart attributes
 */
export type CartAttributesParams = {
  name: string;
  subtitle?: string;
  options: NormalizedProductOption[];
  mode: string;
  source?: string;
};
