# Deno Migration Analysis for Chobble Template

> **Conclusion: Not recommended.** The migration cost is high and the benefits
> don't materially apply to a static site generator.

## Context

This project is an Eleventy v3.0.0 static site generator using Bun 1.3.6 as
the package manager and runtime. The question: would migrating to Deno improve
security, stability, or reliability?

## Bun-Specific API Usage (Would Need Replacement)

| API | Files | What It Does | Deno Equivalent |
|-----|-------|-------------|-----------------|
| `Bun.build()` | 1 (js-bundler.js) | JS bundling for browser | esbuild or Deno.emit (unstable) |
| `Bun.file()` | 5 files | Async file read/exists/size | `Deno.readTextFile()`, `Deno.stat()` |
| `Bun.write()` | 2 files | File writing | `Deno.writeTextFile()` |
| `Bun.Glob()` | 4 files | File pattern matching | `@std/fs/expand-glob` |
| `Bun.spawn()` | 1 file | Process spawning | `new Deno.Command()` |
| `Bun.serve()` | 1 file | HTTP server (test infra) | `Deno.serve()` |
| `bun:test` | ~145 files | Test runner + assertions | `@std/testing/bdd` + `@std/expect` |

## Migration Effort by Area

| Area | Files Affected | Effort | Risk |
|------|---------------|--------|------|
| Test suite (`bun:test` → Deno) | ~145 test files | Very High | Medium |
| JS bundling (`Bun.build()` → esbuild) | 1 file + config | High | Medium |
| File I/O (`Bun.file()` → Deno APIs) | ~5 files | Medium | Low |
| Glob API (`Bun.Glob()` → std/fs) | ~4 files | Low | Low |
| Process spawning | ~2 files | Medium | Medium |
| HTTP server | 1 file | Low | Low |
| Subpath imports → import map | package.json + deno.json | Medium | Medium |
| Coverage threshold enforcement | Config + CI | Medium | Low |
| Sharp/eleventy-img (native addon) | Image pipeline | High | **High** |
| happy-dom preload mechanism | Test setup | Medium | Medium |

**Total: ~160+ files, with the image pipeline as highest risk.**

## Deno Compatibility Status of Key Dependencies

| Dependency | Compatible? | Notes |
|-----------|------------|-------|
| @11ty/eleventy v3 | Mostly | `--serve`/`--watch` have known issues under Deno |
| sharp v0.34 | Locally yes | Native addon; no Deno Deploy support |
| sass v1.86 | Yes | Pure JS, works via npm: specifier |
| liquidjs | Yes | Pure JS |
| markdown-it | Yes | Pure JS |
| playwright | Uncertain | Native binaries, complex setup |
| happy-dom | Likely | Pure JS, needs testing |
| Biome linter | Yes | Standalone Rust binary, runtime-agnostic |

## Why It's Not Worth It

### Security benefits don't apply to build tools

Deno's permission sandbox (`--allow-read`, `--allow-write`, `--allow-net`) is
genuinely better than Bun/Node's "full access by default" model. However, this
project runs at **build time on a trusted machine**. The output is flat
HTML/CSS/JS files served by a CDN. There is no runtime to exploit once deployed.

The threat model for "malicious dependency at build time on CI" is real but
niche, and better addressed by dependency auditing and lockfiles than by
switching runtimes.

### Stability is already sufficient

The build either succeeds or fails. There's no long-running process where
runtime stability matters. Bun's stability for "run a build, exit" is proven.

### Performance would likely decrease

Bun is generally faster than Deno for file I/O, JS bundling, and test execution
— the exact workloads this project uses.

### Development experience would degrade

Eleventy's `--serve` and `--watch` have [known
issues](https://github.com/11ty/eleventy/issues/3376) under Deno. The Eleventy
ecosystem (plugins, image processing) is primarily tested on Node/Bun.

### Maintenance burden increases

You'd be maintaining Deno-specific workarounds for an ecosystem that treats Deno
as a secondary target. When Sharp or eleventy-img breaks under Deno, you're the
edge case in bug reports.

## Where Deno Would Make Sense

The `ecommerce-backend/server.js` (Stripe/PayPal payment processing) is a
**production server handling money and user requests**. Deno's security model is
genuinely valuable there. But the SSG build tool is the wrong place for this
investment.

## Pragmatic Alternative

If Deno compatibility remains appealing, a lower-cost approach:

1. **Abstract Bun-specific APIs** behind thin wrappers (e.g., `readFile()`,
   `glob()`, `bundle()` utilities) so a future migration becomes cheaper
2. **Keep the test suite on Bun** — migrating 145 test files is pure cost with
   no functional benefit
3. **Consider Deno for the ecommerce backend only** — that's where the security
   model actually helps
