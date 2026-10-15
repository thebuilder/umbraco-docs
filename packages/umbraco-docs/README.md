<p align="center">
  <img src="public/logo.png" width="96" height="96" alt="@thebuilder/umbraco-docs" />
</p>

# @thebuilder/umbraco-docs

Shared, composable presentation and metadata contracts for TheBuilder's Umbraco package documentation. Product facts and product-specific content stay in each consumer repository.

Works with Blume 1.4.3 and later, including Blume 2. Blume is an optional peer dependency, since only `PageShell` needs it. The fixtures in `fixtures/` build against Blume 1.4.3, 1.6.4, and 2.2.3.

## Consumer manifest

```ts
import { defineUmbracoPackage } from "@thebuilder/umbraco-docs";

export const packageManifest = defineUmbracoPackage({
  id: "thebuilder.example",
  name: "Example",
  summary: "A focused Umbraco package.",
  links: {
    docs: "https://example.com",
    nuget: "https://www.nuget.org/packages/TheBuilder.Example",
    marketplace: "https://marketplace.umbraco.com/package/thebuilder.example",
    github: "https://github.com/thebuilder/example",
  },
  logo: "/logo.svg",
  compatibility: { umbraco: ">=17 <19" },
  status: "stable",
  categories: ["Developer Tools"],
});
```

`links.nuget` and `links.marketplace` are optional, so a package can be listed before it is published. Frontend packages can set `links.npm` instead.

Astro consumers can import individual components from `@thebuilder/umbraco-docs/components/*`. Wrap composed landing content in `LandingRoot`; it owns the scoped cascade-layer stylesheet plus clipboard and reduced-motion-safe reveal behavior. Sites that don't use Blume must use these per-component imports, because the `./astro` entry also exports `PageShell`, which needs Blume.

```astro
---
import { InstallCommand, LandingHero, LandingRoot } from "@thebuilder/umbraco-docs/astro";
---

<LandingRoot>
  <LandingHero title="Example" description="A focused Umbraco package." logo="/logo.svg">
    <InstallCommand slot="install" command="dotnet add package TheBuilder.Example" />
  </LandingHero>
</LandingRoot>
```

`logo`, `eyebrow` (a short line above the title) and `description` are optional. A hero can also draw its own background, such as a canvas, through the `background` slot, which renders behind the glow and the content.

`layout="split"` puts the text on the left, left-aligned, and the logo large on the right, as on the social cards. Below 56rem the logo sits above the text, smaller, with the text centered under it. Below 36rem, in either layout, the action buttons share the full width of the text in equal parts and the install command spans the same width, so every site's hero lines up the same way on a phone. The default, `centered`, stacks a small logo and the text in the middle. Give a split hero a `logo` or a `HeroParticles` background to fill that column. Content in the default slot, such as a `ScreenshotFrame`, goes below either layout at full width.

Elements that come into view together reveal one after another, 60ms apart. To hold reveals back, for example until a background intro gets going, set `--udocs-reveal-offset` on a container, such as `.udocs-hero__inner { --udocs-reveal-offset: 300ms; }`.

## Shared theme

Every package docs site uses the same Blume theme, so they look like one family: the violet accent from the middle of the family gradient, and Inter Tight headings. Spread `docsTheme` into `theme` in `blume.config.ts`, before any site-specific settings, instead of setting an accent of your own:

```ts
import { docsTheme } from "@thebuilder/umbraco-docs";
import { defineConfig } from "blume";

export default defineConfig({
  theme: { ...docsTheme },
});
```

The accent has a shade per color mode, `#7557e8` in light and `#a78bfa` in dark, and each meets WCAG AA as link text and with its button label, which Blume picks: white in light, dark in dark. It needs Blume 2. `DOCS_ACCENT` exports the two shades for other uses, such as the hub's own CSS.

## Particle hero

`HeroParticles` draws the site's logo in glowing WebGPU particles, as on [umbraco.thebuilder.dk](https://umbraco.thebuilder.dk). The particles swirl in from a scattered sky, settle into the logo in its own colors, and scatter around the pointer. Put it in the hero's `background` slot. Package docs sites use the split layout, so the logo forms beside the text instead of behind it:

```astro
---
import HeroParticles from "@thebuilder/umbraco-docs/components/HeroParticles";
import { LandingHero } from "@thebuilder/umbraco-docs/astro";
---

<LandingHero layout="split" title="Example" description="A focused Umbraco package.">
  <HeroParticles slot="background" logo="/logo.svg" />
</LandingHero>
```

It needs the `vgpu` package, an optional peer dependency, so install it in the site:

```sh
pnpm add vgpu@^0.6.0
```

pnpm then asks about build scripts for `webgpu` and `@vgpu/adapter-node`, vgpu's Node backend. The hero runs in the browser, so leave them off, for example with `allowBuilds: { webgpu: false, "@vgpu/adapter-node": false }` in `pnpm-workspace.yaml`.

The shaders ship prepared, so the site's build needs no extra setup. Import the component directly as shown; the `./astro` entry doesn't export it, so sites that don't use it never need `vgpu`.

How it behaves:

- **Shape.** The logo is drawn into a 256 pixel square and particles are placed on its solid pixels, taking their colors. Soft glow layers, below 60% coverage, are left out. A logo that's small on screen, such as above the text on a phone, draws only some of its particles, so it keeps the same airy density as a large one instead of packing into a solid glow. An SVG logo's `viewBox` decides its shape. A cross-origin logo needs CORS; without it, the fallback below shows instead.
- **Motion.** Still shapes catch a slow band of light that sweeps across them. To make a stroke stream from one end to the other instead, pass `flow` with its center line as SVG path data, its width and the logo's `viewBox`, such as `flow={{ path: "M60 44v92a68 68 0 0 0 136 0V44", width: 36, viewBox: 256 }}`.
- **Readability.** Over the particles, the hero's description, compatibility line and eyebrow are brighter than usual, and the action buttons get a frosted backdrop. In the centered layout, where the logo forms behind the text, the particles also dim behind the text, so it keeps 4.5:1 contrast even against the brightest particles.
- **Layout.** The particles fill the hero down to the first content after the text, such as a `ScreenshotFrame`. In the split layout the logo forms in the column beside the text, or above it on narrow screens; in the centered layout it fills the middle and steps back behind the text, so leave out the hero's own `logo` there. In the split layout a `logo` is replaced by the particles. When the hero sits under a sticky header, such as Blume's, the particles run on up behind it, and the header starts clear and turns to its usual frosted bar as the page scrolls. Browsers without scroll-driven animations, such as Firefox, get the same from a scroll listener. Don't clip vertical overflow on an element around the hero, such as `overflow: clip` on the `LandingRoot` class; use `overflow-x: clip`, or the particles can't reach the header.
- **Themes.** It follows `data-theme` on `<html>`, which Blume sets, and the system theme without one: light on dark, colored ink on light.
- **Fallbacks.** With reduced motion it draws one still frame. Without WebGPU, or if the logo can't be read, the logo itself shows where the particles would form, faded behind the text in the centered layout. It pauses while scrolled out of view.

For a still of the same scene, such as a social card backdrop, `@thebuilder/umbraco-docs/hero` exports `createParticleField` and `createHeroScene`, which also run in Node with `vgpu/node`. The hub renders its card backdrop this way in `apps/hub/scripts/render-og-backdrop.ts`.

## Related packages

`loadUmbracoPackages()` reads the package list published at [umbraco.thebuilder.dk/packages.json](https://umbraco.thebuilder.dk/packages.json) during the build, so every docs site shows the current set of packages without keeping its own copy. Pass the result to `EcosystemSection`, which leaves out the current package.

```astro
---
import { loadUmbracoPackages } from "@thebuilder/umbraco-docs";
import { EcosystemSection } from "@thebuilder/umbraco-docs/astro";

const packages = await loadUmbracoPackages();
---

<EcosystemSection packages={packages} currentPackageId="thebuilder.example" />
```

A build never fails because the hub can't be reached. The loader logs a warning and returns `fallback` (an empty list by default, which hides the section), and it skips any entry that fails validation. Options: `url`, `fallback`, and `timeoutMs` (10 seconds by default).

Package logos can be a public-root path like `/logo.svg` or an absolute https URL, as the hub uses.

## Open Graph images

Create `umbraco-docs.config.mjs` with content/public directories, a `/social` or `/og` prefix, root card copy, and the product logo to render into each card. Pages opt in with Blume-native `title`, `description`, and `seo.image` frontmatter.

```js
export default defineOgConfig({
  contentDir: new URL("./content", import.meta.url).pathname,
  publicDir: new URL("./public", import.meta.url).pathname,
  prefix: "/og",
  logo: "/logo.svg",
  root: { title: "Example", description: "A focused Umbraco package." },
});
```

Then run:

```sh
pnpm exec umbraco-docs-og
pnpm exec umbraco-docs-og --check
```

Generation is deterministic. Check mode fails when an expected image is missing or stale.

To replace the default gradient, set `background` to a public image, such as `background: "/og/backdrop.png"`. It is scaled to cover the 1200×630 card and the text goes on top, so keep its left side calm. The hub renders its backdrop from its hero shaders with `apps/hub/scripts/render-og-backdrop.ts`.
