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

test("public output paths cannot escape the configured prefix", () => {
  assert.throws(() => resolvePublicImagePath("/tmp/public", "/other/card.png", "/og"), /Unsafe/);
  assert.throws(() => resolvePublicImagePath("/tmp/public", "/og/../card.png", "/og"), /Unsafe/);
});
