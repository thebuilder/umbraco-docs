<p align="center">
  <img src="public/logo.png" width="96" height="96" alt="@thebuilder/umbraco-docs" />
</p>

# @thebuilder/umbraco-docs

Shared, composable presentation and metadata contracts for TheBuilder's Umbraco package documentation. Product facts and product-specific content stay in each consumer repository.

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

Astro consumers can import individual components from `@thebuilder/umbraco-docs/components/*`. Wrap composed landing content in `LandingRoot`; it owns the scoped cascade-layer stylesheet plus clipboard and reduced-motion-safe reveal behavior.

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
