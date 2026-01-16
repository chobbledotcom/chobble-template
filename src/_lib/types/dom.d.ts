/**
 * DOM utility types
 *
 * Types for DOM manipulation and element creation utilities.
 */

/**
 * Attributes that can be set on an element
 */
export type ElementAttributes = Record<string, string | null | undefined>;

/**
 * Valid children for element creation
 */
export type ElementChildren = string | Element | Element[] | null;

/**
 * Happy-DOM window type (re-exported for convenience)
 */
export type { Window as HappyDOMWindow } from 'happy-dom';

/**
 * DOM wrapper with window and serialization
 */
export type DOM = {
  window: import('happy-dom').Window;
  serialize: () => string;
};
