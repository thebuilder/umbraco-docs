# Umbraco Docs brand prompt

Create a compact, vector-friendly product mark for `@thebuilder/umbraco-docs`.

- Represent reusable documentation building blocks as three offset document panels.
- Use the shared TheBuilder family palette: blue `#60a5fa`, purple `#a78bfa`, and pink `#f472b6`.
- Keep the geometry simple, balanced, and legible at favicon size.
- Use softly rounded corners consistent with the related Web Analytics and Blur Placeholder package identities.
- The standalone mark must have a transparent background.
- The NuGet and Umbraco Marketplace `icon.png` must center the mark on the established dark tile: a `#15152e` to `#08080f` diagonal gradient with a restrained purple-blue top glow.
- Do not include text, letters, shadows around the mark, or fine detail.

`scripts/mark.mjs` is the deterministic implementation of this prompt. `scripts/generate-brand.mjs` produces every raster asset from that single source.
