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

`logo` is optional. A hero can also draw its own background, such as a canvas, through the `background` slot, which renders behind the glow and the content.

Elements that come into view together reveal one after another, 60ms apart. To hold reveals back, for example until a background intro gets going, set `--udocs-reveal-offset` on a container, such as `.udocs-hero__inner { --udocs-reveal-offset: 300ms; }`.

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
