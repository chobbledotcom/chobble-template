# Accessibility Audit - Chobble Template

This document tracks remaining accessibility issues identified in the rendered site.

---

## Remaining Issues

### 1. Multiple H1 Headings Per Page

**Location:** Header + article sections on most page layouts

**Issue:** Pages have two `<h1>` elements - one in the header and one in the article:

```html
<header><h1>UltraWidget Pro</h1></header>
...
<article><section><h1>UltraWidget Pro</h1><h2>Lightweight...</h2></section>
```

**Impact:** Screen reader users may be confused by two level-1 headings announcing the same content.

**Recommendation:** Change the article heading to `<h2>` to create proper heading hierarchy.

---

### 2. Gallery Images Missing Alt Text (Content Issue)

**Location:** Product gallery images in content files

**Issue:** Some product images have empty `alt=""` while others have descriptive alt text. For example, on UltraWidget Pro:

- Images 1-4: `alt=""`
- Image 5: `alt="Side view showing slim profile"`
- Image 6: `alt="Close-up view of control panel"`
- Image 7: `alt="Product demonstration showing main features"`

**Impact:** Screen reader users miss visual product details.

**Recommendation:** Content editors should add descriptive alt text to all product images in their markdown files. The `gallery` array in frontmatter accepts objects with `alt` properties:

```yaml
gallery:
  - src: /images/product-front.jpg
    alt: Front view of the product showing the main display
  - src: /images/product-side.jpg
    alt: Side profile highlighting the slim design
```

---

## Fixed Issues

The following issues from the original audit have been resolved:

| Issue | Fix Applied |
|-------|-------------|
| Navigation toggle missing accessible label | Added visually-hidden text: "Toggle navigation menu" |
| Duplicate links on item cards | Added `aria-hidden="true"` and `tabindex="-1"` to image links |
| Empty description paragraphs in menus | Fixed computed data cascade to preserve frontmatter descriptions |
| Decorative SVGs in specs without aria-hidden | Wrapped spec icons in `<span aria-hidden="true">` |

---

## Good Practices Implemented

- Navigation toggle has accessible label (`.visually-hidden` text)
- Social media links have `aria-label` attributes
- Theme switcher button has accessible label
- Duplicate image links are hidden from assistive tech
- Gallery full-size images are `aria-hidden`
- Gallery navigation buttons have aria-labels
- Decorative spec icons are `aria-hidden`
- Map iframe has descriptive title
- Noscript fallback for forms
- PDF download links have visible text
- Definition lists for product specs
- Proper use of semantic HTML (nav, main, article, header, footer)
- `lang="en"` attribute on html element
- `.visually-hidden` CSS utility class available
