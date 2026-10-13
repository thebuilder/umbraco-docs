# TheBuilder Umbraco

Shared documentation tooling and the package hub for TheBuilder's Umbraco packages.

| Path | What it is |
| --- | --- |
| [`packages/umbraco-docs`](packages/umbraco-docs) | `@thebuilder/umbraco-docs` on npm: shared Astro components, package manifest validation, and Open Graph card generation for package docs sites. |
| [`apps/hub`](apps/hub) | The site for [umbraco.thebuilder.dk](https://umbraco.thebuilder.dk), listing every package. |

```sh
pnpm install
pnpm run verify
```

`verify` checks, builds, and tests the shared package, builds it against each Blume version in its fixtures, then builds the hub.

To release the shared package, publish from its folder:

```sh
pnpm --filter @thebuilder/umbraco-docs publish
```

## Package hub

`apps/hub` is the site for [umbraco.thebuilder.dk](https://umbraco.thebuilder.dk). It is a plain Astro site, not a Blume site, built from the same shared components. It lists every package and publishes the same list as `/packages.json`, so package docs sites can show each other without keeping their own copies. It also publishes `/llms.txt` and `/sitemap.xml` from the same list.

Add or update packages in [`apps/hub/src/packages.ts`](apps/hub/src/packages.ts). Each entry goes through `defineUmbracoPackage`. In `/packages.json`, logos are absolute URLs on the hub, `links.nuget` and `links.marketplace` are left out until a package is published there, and `version` only changes when a field is removed or changes meaning.

```sh
pnpm run hub:dev
pnpm run hub:build
```

Both build `@thebuilder/umbraco-docs` first, since the hub uses it through the workspace.
