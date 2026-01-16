/**
 * Schema.org types
 *
 * Types for generating structured data (JSON-LD).
 */

import type { Faq } from './content.d.ts';

/**
 * Schema.org metadata for a page
 */
export type SchemaOrgMeta = {
  url?: string;
  title?: string;
  description?: string;
  image?: { src: string };
  faq?: Faq[];
  name?: string;
  brand?: string;
  offers?: Record<string, unknown>;
  reviews?: Record<string, unknown>[];
  rating?: Record<string, unknown>;
  datePublished?: string;
  author?: Record<string, unknown>;
  publisher?: Record<string, unknown>;
  organization?: Record<string, unknown>;
};
