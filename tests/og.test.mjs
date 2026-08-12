import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectOgCards, generateOgImages, resolvePublicImagePath } from "../dist/og/index.js";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "umbraco-docs-og-"));
  const contentDir = path.join(root, "content");
  const publicDir = path.join(root, "public");
  await mkdir(contentDir);
  await writeFile(path.join(contentDir, "quickstart.mdx"), `---\ntitle: Quickstart\ndescription: Install and configure the package.\nseo:\n  image: /og/quickstart.png\n---\n`);
  return { contentDir, publicDir, prefix: "/og", root: { title: "Example", description: "Example package docs." } };
}

test("collectOgCards uses Blume-native frontmatter and config for root", async () => {
  const cards = await collectOgCards(await fixture());
  assert.deepEqual(cards.map((card) => card.image), ["/og/index.png", "/og/quickstart.png"]);
});

test("OG generation is deterministic and check mode detects drift", async () => {
  const config = await fixture();
  await generateOgImages(config);
  const output = path.join(config.publicDir, "og", "quickstart.png");
  const first = await readFile(output);
  await generateOgImages(config);
  assert.deepEqual(await readFile(output), first);
  await generateOgImages(config, { check: true });
  await writeFile(output, "stale");
  await assert.rejects(generateOgImages(config, { check: true }), /missing or stale/);
});

test("OG generation composes the configured product logo", async () => {
  const config = await fixture();
  await mkdir(config.publicDir, { recursive: true });
  await writeFile(path.join(config.publicDir, "logo.svg"), `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#f472b6"/></svg>`);

  await generateOgImages({ ...config, logo: "/logo.svg", site: "example.com" });
  const withLogo = await readFile(path.join(config.publicDir, "og", "index.png"));
  await generateOgImages({ ...config, site: "example.com" });
  const withoutLogo = await readFile(path.join(config.publicDir, "og", "index.png"));

  assert.notDeepEqual(withLogo, withoutLogo);
});

test("public output paths cannot escape the configured prefix", () => {
  assert.throws(() => resolvePublicImagePath("/tmp/public", "/other/card.png", "/og"), /Unsafe/);
  assert.throws(() => resolvePublicImagePath("/tmp/public", "/og/../card.png", "/og"), /Unsafe/);
});

test("OG discovery rejects incomplete opted-in frontmatter", async () => {
  const config = await fixture();
  await writeFile(path.join(config.contentDir, "invalid.mdx"), `---\ntitle: Missing description\nseo:\n  image: /og/invalid.png\n---\n`);
  await assert.rejects(collectOgCards(config), /invalid\.mdx: description must be a non-empty string/);
});

test("OG discovery rejects duplicate output paths before rendering", async () => {
  const config = await fixture();
  await writeFile(path.join(config.contentDir, "duplicate.md"), `---\ntitle: Duplicate\ndescription: Duplicate output.\nseo:\n  image: /og/quickstart.png\n---\n`);
  await assert.rejects(collectOgCards(config), /Duplicate OG image path: \/og\/quickstart\.png/);
});

test("OG config validation rejects unsafe prefixes", async () => {
  const config = await fixture();
  await assert.rejects(collectOgCards({ ...config, prefix: "/og/../outside" }), /prefix must be a safe absolute public path/);
  await assert.rejects(collectOgCards({ ...config, logo: "/../logo.svg" }), /logo must be a safe absolute public path/);
});
