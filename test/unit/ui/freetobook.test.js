import { afterEach, describe, expect, test } from "bun:test";
import { initFreetobook } from "#public/ui/freetobook.js";

const SECTION_HTML = `
<section id="freetobook" class="freetobook">
  <details class="container-wide">
    <summary class="btn btn--primary">Check Availability / Book Online</summary>
    <div class="iframe-container"></div>
  </details>
</section>`;

afterEach(() => {
  document.body.innerHTML = "";
});

const setup = (extraHtml = "") => {
  document.body.innerHTML = SECTION_HTML + extraHtml;
  initFreetobook();
};

const details = () => document.querySelector("#freetobook details");
const summary = () => document.querySelector("#freetobook summary");

describe("initFreetobook", () => {
  test("does nothing when #freetobook section is absent", () => {
    document.body.innerHTML = "";
    expect(() => initFreetobook()).not.toThrow();
  });

  test("details starts closed", () => {
    setup();
    expect(details().open).toBe(false);
  });

  test("summary starts with primary button style", () => {
    setup();
    expect(summary().classList.contains("btn--primary")).toBe(true);
    expect(summary().classList.contains("btn--secondary")).toBe(false);
    expect(summary().classList.contains("btn--sm")).toBe(false);
  });

  test("summary switches to secondary small style when details opens", () => {
    setup();
    details().open = true;
    details().dispatchEvent(new Event("toggle"));
    expect(summary().classList.contains("btn--secondary")).toBe(true);
    expect(summary().classList.contains("btn--sm")).toBe(true);
    expect(summary().classList.contains("btn--primary")).toBe(false);
    expect(summary().textContent).toBe("Hide Booking Form");
  });

  test("summary reverts to primary style when details closes", () => {
    setup();
    details().open = true;
    details().dispatchEvent(new Event("toggle"));
    details().open = false;
    details().dispatchEvent(new Event("toggle"));
    expect(summary().classList.contains("btn--primary")).toBe(true);
    expect(summary().classList.contains("btn--secondary")).toBe(false);
    expect(summary().textContent).toBe("Check Availability / Book Online");
  });

  test("clicking a #freetobook anchor opens the details", () => {
    setup('<a href="#freetobook">Book</a>');
    document.querySelector('a[href="#freetobook"]').click();
    expect(details().open).toBe(true);
  });

  test("clicking a #freetobook anchor when already open does not close it", () => {
    setup('<a href="#freetobook">Book</a>');
    details().open = true;
    details().dispatchEvent(new Event("toggle"));
    document.querySelector('a[href="#freetobook"]').click();
    expect(details().open).toBe(true);
  });
});
