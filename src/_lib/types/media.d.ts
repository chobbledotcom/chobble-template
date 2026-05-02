/**
 * Media/image processing types
 *
 * Types for the image processing pipeline using eleventy-img.
 */

/**
 * Props for the image shortcode/function
 */
export type ImageProps = {
  logName?: string;
  imageName: string;
  alt: string | null;
  classes?: string | null;
  sizes?: string | null;
  widths?: string | string[] | null;
  returnElement?: boolean;
  aspectRatio?: string | null;
  loading?: string | null;
  noLqip?: boolean;
  skipMaxWidth?: boolean;
  document?: Document | null;
};

/**
 * Props for computing image output (after initial validation)
 */
export type ComputeImageProps = {
  imageName: string;
  alt: string | null;
  classes?: string | null;
  sizes?: string | null;
  widths?: string | string[] | null;
  aspectRatio?: string | null;
  loading?: string | null;
  noLqip?: boolean;
  skipMaxWidth?: boolean;
};

/**
 * Props specifically for the HTML transform pipeline
 * All values come from element attributes (guaranteed by selector)
 */
export type ImageTransformOptions = {
  logName: string;
  imageName: string;
  alt: string | null;
  classes: string | null;
  sizes: string | null;
  widths: string | null;
  aspectRatio: string | null;
  loading: null;
  noLqip: boolean;
  returnElement: true;
  document: Document;
};

/**
 * Function signature for processing images in transforms
 */
export type ProcessImageFn = (options: ImageTransformOptions) => Promise<string | Element>;
