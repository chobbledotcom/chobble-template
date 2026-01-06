# Accessibility Audit - Chobble Template

This document presents an accessibility analysis of the rendered site, simulating how a screen reader would perceive each page. Content has been analyzed by filtering out `aria-hidden` elements and converting the semantic structure to markdown-like representation.

---

## Table of Contents

1. [Global Issues](#global-issues)
2. [Homepage Analysis](#homepage-analysis)
3. [Product Page Analysis](#product-page-analysis)
4. [Menu Page Analysis](#menu-page-analysis)
5. [Contact Page Analysis](#contact-page-analysis)
6. [Recommendations Summary](#recommendations-summary)

---

## Global Issues

These issues appear across all pages:

### 1. Navigation Toggle Missing Accessible Label

**Location:** `src/_includes/navigation.html:4-14`

**Issue:** The mobile navigation toggle uses a checkbox + label pattern without accessible text:

```html
<input type="checkbox" id="nav-toggle" class="toggle">
<label for="nav-toggle" class="toggle-label">
  <span></span>
</label>
```

**How a screen reader perceives this:**
> "checkbox, unchecked"

The user has no idea what this checkbox controls. The empty `<span>` provides no text for screen readers.

**Recommendation:** Add visually-hidden text or `aria-label`:

```html
<label for="nav-toggle" class="toggle-label">
  <span class="visually-hidden">Toggle navigation menu</span>
  <span aria-hidden="true"></span>
</label>
```

### 2. Banner/Header Images Have Empty Alt Text

**Location:** All pages with banner images

**Issue:** Header banner images use `alt=""`:

```html
<img alt="" loading="eager" ... >
```

**Analysis:** This is actually **correct** if the images are purely decorative and the page title (h1) provides the meaningful content. However, if the banner contains meaningful visual information, this should be reconsidered.

**Status:** Acceptable for decorative images, but verify each banner is truly decorative.

### 3. Social Media Links - Good Practice Noted

**Location:** Footer on all pages

The social links correctly use `aria-label` attributes:

```html
<a href="..." aria-label="Github">
  <svg>...</svg>
</a>
```

**How a screen reader perceives this:**
> "link, Github"

**Status:** Good - no action needed.

### 4. Theme Switcher Button - Good Practice Noted

```html
<button id="theme-switcher-button" type="button" aria-label="Switch theme">
  ...
</button>
```

**Status:** Good - properly labeled.

---

## Homepage Analysis

### Semantic Structure (as perceived by screen reader)

```markdown
# Example Website

[Navigation: Home (current), Instructions, News, Products > (Search, Doodahs,
Open Source, Thingies, Widgets, Wotzits), Events, Menus > (...), Properties,
Reviews, Contact > (Team), Locations > (...), Guide > (...)]

## This site is using the Chobble Template

**It was made by Stef at Chobble.com.** If you'd like a website just like it...

You can check out the source code for this template on Github.

- It's AGPLv3 licensed
- With a theme editor you can test live!
- Edited via the easy and free PagesCMS editor
[... more list items ...]

### E-Commerce

You can use this template to create a simple e-commerce website...

### Restaurants

If you run a restaurant or cafe you can display your menus...

### Filtering & Search

The template pre-generates filter and search results pages...

## Getting started

The example comes pre-loaded with Markdown files in each collection...

---

### Our Menus

- ### Weekend Brunch
  Delicious plant-based brunch every weekend.
  [image: Weekend Brunch]

- ### Dinner Menu
  Fresh vegan dinner options served daily.
  [image: Dinner Menu]

- ### Lunch Menu
  Quick and tasty vegan lunch options.
  [image: Lunch Menu]

---

### Latest Posts

- ### Second Blog Post Fails To Excite
  Hopes dashed as world's troubles continue despite blog
  [image: Second Blog Post Fails To Excite]

[... continues with categories, products, events, properties, reviews ...]

---

### Opening Hours (sidebar)

- **Monday - Friday:** 9am - 5pm
- **Saturday:** 10am - 2pm
- **Sunday:** Closed

---

### Regular Events (sidebar)

- **Chobble Global Summit** - Annually - Last weekend of July...
[...]

---

### Contact (sidebar)

- Phone: 0161 123 4567
- Email: hello@example.com
- Facebook: @MyPage

---

[Footer with social links and credits]
```

### Homepage Issues Identified

1. **Heading Hierarchy Issue:** Page uses `<h1>Example Website</h1>` in header, then `<h2>` as first content heading. This is correct, but some sections use `<h3>` (e.g., "Our Menus", "Latest Posts") at the same logical level.

2. **Image Links with Redundant Text:** Each menu/product card has both a text link and an image link to the same destination:
   ```html
   <h3><a href="/menus/brunch/#content">Weekend Brunch</a></h3>
   <p>Delicious plant-based brunch...</p>
   <a class="image-link" href="/menus/brunch/#content">
     <img alt="Weekend Brunch" ...>
   </a>
   ```

   **How a screen reader perceives this:**
   > "heading level 3, link, Weekend Brunch"
   > "Delicious plant-based brunch every weekend."
   > "link, Weekend Brunch [image]"

   The destination is announced twice. Consider using a single clickable card wrapper or using `aria-hidden="true"` on the redundant image link.

3. **Reviewer Avatar Images:** Empty alt text is correct for decorative avatars:
   ```html
   <img src="data:image/svg+xml..." alt="" class="reviewer-avatar">
   ```
   **Status:** Correct.

---

## Product Page Analysis

### Page: UltraWidget Pro

### Semantic Structure (as perceived by screen reader)

```markdown
# UltraWidget Pro

[Navigation...]

## UltraWidget Pro
### Lightweight, powerful widget for professionals

[Gallery - 7 images, mostly with empty alt except:]
- [image 5: "Side view showing slim profile"]
- [image 6: "Close-up view of control panel"]
- [image 7: "Product demonstration showing main features"]

## About

**Categories:** Premium Widgets, Widgets

The UltraWidget Pro is designed for professionals who demand performance
without sacrificing portability...

[... product description ...]

- Ultra-thin design (0.6")
- Glow-in-the-dark control panel
- Biometric scanner
- Universal connectivity ports
- Surround sound resonators

| Display | 14" Holographic |
| Processor | Quantum Core X7 |
| Memory | 16GB Crystal Storage |
| Storage | 1TB Bubble Drive |
| Graphics | Integrated Rainbow Projector |
| Power Cell | Up to 12 hours |
| Has dongle | No |

[Sidebar with opening hours, events, contact...]
```

### Product Page Issues Identified

1. **Gallery Images Missing Alt Text:** The first 4 gallery images have `alt=""` while the last 3 have descriptive alt text. For product pages, **all product images should have meaningful alt text** describing what's shown.

   **Current:**
   ```html
   <img alt="" loading="lazy" ...>  <!-- Images 1-4 -->
   <img alt="Side view showing slim profile" ...>  <!-- Image 5 -->
   ```

   **Recommendation:** Ensure all product images have descriptive alt text in the content files.

2. **Gallery Full-Size Images Correctly Hidden:** The duplicate full-size images are properly marked `aria-hidden="true"`:
   ```html
   <div aria-hidden="true" class="gallery-full-size-images">
   ```
   **Status:** Correct.

3. **Duplicate Heading:** The page has two `<h1>` elements:
   ```html
   <header><h1>UltraWidget Pro</h1></header>
   ...
   <article><section><h1>UltraWidget Pro</h1><h2>Lightweight...</h2></section>
   ```

   **How a screen reader perceives this:** User may be confused by two level-1 headings. The second should be a heading within the article section, not a duplicate h1.

   **Recommendation:** The article heading should be `<h2>` or use `aria-label` on the section.

4. **Definition List for Specs - Good Practice:** The specs are correctly structured as a `<dl>`:
   ```html
   <dl>
     <div><dt>Display</dt><dd>14" Holographic</dd></div>
     ...
   </dl>
   ```
   **Status:** Good semantic structure.

5. **SVG Checkmark in Specs:** There's an SVG before "Has dongle" but no aria-label:
   ```html
   <div><svg ...></svg><dt>Has dongle</dt><dd>No</dd></div>
   ```
   If this checkmark is meaningful, it should have `aria-label` or be `aria-hidden` if decorative.

6. **Gallery Navigation Buttons - Good Practice:** The popup navigation buttons have proper aria-labels:
   ```html
   <button type="button" class="popup-nav" data-nav="prev" aria-label="Previous image">
   <button type="button" class="popup-nav" data-nav="next" aria-label="Next image">
   ```
   **Status:** Good.

---

## Menu Page Analysis

### Page: Weekend Brunch

### Semantic Structure (as perceived by screen reader)

```markdown
# Weekend Brunch

[Navigation...]

# Weekend Brunch

Join us every Saturday and Sunday from 9am to 3pm for our famous weekend
brunch. We've reimagined classic brunch favourites with a plant-based twist...

---

**(VE)** - Vegan, **(GF)** - Gluten Free

## Starters

Light bites to begin your meal.

- **Smashed Avocado Toast** (VE) — £8.50
- **Beetroot Hummus Plate** (VE) (GF) — £9.00
- **Tomato Bruschetta** (VE) — £8.00
- **Loaded Nachos** (VE) (GF) — £10.00
- **Fluffy Pancakes** (VE) — £9.50
- **Fresh Spring Rolls** (VE) (GF) — £7.50
- **Sweet Potato Fries** (VE) (GF) — £6.50

## Desserts

Sweet vegan treats to finish.

[... menu items ...]

## Beverages

Fresh juices, smoothies and hot drinks.

[... menu items ...]

## Brunch Specials

Weekend brunch exclusive dishes.

[... menu items ...]

[link: Download PDF - with PDF icon]

[Sidebar...]
```

### Menu Page Issues Identified

1. **Duplicate H1 Heading:** Same issue as product pages - two `<h1>` elements (header and article).

2. **Menu Item Structure - Good Practice:** Menu items use semantic markup:
   ```html
   <li>
     <span class="name">
       <strong>Smashed Avocado Toast</strong>
       <span>(VE)</span>
     </span>
     <span class="price">£8.50</span>
     <p class="description"></p>
   </li>
   ```
   **Status:** Reads well, though empty description paragraphs could be removed if not used.

3. **Dietary Indicators Read Well:** "(VE)" and "(GF)" are inside the name span, so screen readers announce them naturally:
   > "Beetroot Hummus Plate (VE) (GF), £9.00"

   **Status:** Good.

4. **PDF Download Link - Good Practice:** The PDF link includes visible text:
   ```html
   <a href="...pdf" download>
     <svg ...></svg>
     <span>Download PDF</span>
   </a>
   ```
   **Status:** Good - the span text provides accessible name.

---

## Contact Page Analysis

### Semantic Structure (as perceived by screen reader)

```markdown
# Contact Example

[Navigation...]

## Opening Hours

- **Monday - Friday:** 9am - 5pm
- **Saturday:** 10am - 2pm
- **Sunday:** Closed

## Get in Touch

The contact form is set up in contact-form.json...

**If you're looking for my real contact details check out my site at
chobble.com/contact**

[noscript: JavaScript is required to submit this form.]

---

### Contact Form Not Configured

You need to add a `contact_form_target` URL or `formspark_id` to
`src/_data/config.json`

[iframe: Embedded map for The Chobble Template]

[Sidebar with opening hours, events, contact info...]
```

### Contact Page Issues Identified

1. **Map iframe - Good Practice:** The map has a descriptive title:
   ```html
   <iframe
     title="Embedded map for The Chobble Template"
     ...
   >
   ```
   **Status:** Good.

2. **Noscript Message - Good Practice:** Provides fallback text for users without JavaScript:
   ```html
   <noscript><p>JavaScript is required to submit this form.</p></noscript>
   ```
   **Status:** Good.

3. **Code Blocks in Error Message:** The technical error message uses `<code>` elements appropriately, though this message would ideally not appear on production sites.

---

## Recommendations Summary

### Critical Issues (Should Fix)

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Navigation toggle has no accessible label | `navigation.html:4-14` | Users can't identify the purpose of the toggle | Add `aria-label` or visually-hidden text |
| Multiple H1 headings per page | Header + article sections | Confusing document structure | Use H2 for article headings |
| Gallery images missing alt text | Product pages | Users miss product visual details | Add descriptive alt text to all product images |

### Medium Issues (Should Consider)

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Duplicate links (text + image) | Item cards on listings | Announces same destination twice | Consider `aria-hidden` on image link or use card wrapper |
| SVG in specs table without label | Product pages | Decorative icon may confuse | Add `aria-hidden="true"` to decorative SVGs |
| Empty description paragraphs in menus | Menu pages | Empty elements are announced | Conditionally render only if content exists |

### Good Practices Already Implemented

- Social media links have `aria-label` attributes
- Theme switcher button has accessible label
- Gallery full-size images are `aria-hidden`
- Gallery navigation buttons have aria-labels
- Map iframe has descriptive title
- Noscript fallback for forms
- PDF download links have visible text
- Definition lists for product specs
- Proper use of semantic HTML (nav, main, article, header, footer)
- `lang="en"` attribute on html element

### Suggested CSS Class for Visually Hidden Text

Add this utility class to hide text visually while keeping it accessible:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Screen Reader Experience Summary

Overall, the site has a **good foundation** for accessibility:

1. **Navigation is logical** - Links are properly nested and labeled
2. **Headings provide structure** - Though some duplicate H1s exist
3. **Images** - Decorative images correctly use empty alt, but product images need improvement
4. **Interactive elements** - Most buttons and links have accessible names
5. **Semantic HTML** - Proper use of landmarks (nav, main, article, footer)

The main areas for improvement are:
1. The navigation toggle accessibility
2. Consistent heading hierarchy
3. Product image alt text
4. Reducing duplicate link announcements on item cards
