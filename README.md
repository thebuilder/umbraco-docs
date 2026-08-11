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

Astro consumers can import individual components from `@thebuilder/umbraco-docs/components/*` and the scoped cascade-layer stylesheet from `@thebuilder/umbraco-docs/styles/landing.css`.

## Open Graph images

Create `umbraco-docs.config.mjs` with content/public directories, a `/social` or `/og` prefix, and root card copy. Pages opt in with Blume-native `title`, `description`, and `seo.image` frontmatter. Then run:

```sh
pnpm exec umbraco-docs-og
pnpm exec umbraco-docs-og --check
```

Generation is deterministic. Check mode fails when an expected image is missing or stale.
