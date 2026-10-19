import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("corepack", ["pnpm", ...args], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(" ")} exited with ${code ?? "no status"}`)));
  });
}

const directories = ["fixtures/blume-1.4.3", "fixtures/blume-1.6.4", "fixtures/blume-2.2.3"];

for (const directory of directories) {
  await run(["--dir", directory, "install", "--ignore-workspace", "--frozen-lockfile"]);
  await run(["--dir", directory, "build"]);

  const html = await readFile(`${directory}/.blume-verify/dist/index.html`, "utf8");
  assert.match(html, /property="og:image"/);
  assert.match(html, /data-udocs-root/);
  assert.match(html, /data-udocs-copy="dotnet add package TheBuilder\.Fixture"/);
  assert.match(html, /Related package/);
  assert.match(html, /astro:page-load/);
  // Only this fixture opts into the particle hero; the others prove a site without vgpu still builds.
  if (directory.endsWith("2.2.3")) {
    assert.match(html, /data-udocs-particles/);
    // The shared diagram style reaches the site's stylesheet through its theme.css import.
    const assets = `${directory}/.blume-verify/dist/_astro`;
    const sheets = (await readdir(assets)).filter((file) => file.endsWith(".css"));
    const css = (await Promise.all(sheets.map((file) => readFile(`${assets}/${file}`, "utf8")))).join("");
    assert.match(css, /--udocs-diagram-fill/);
    assert.match(html, /class="udocs-hero__eyebrow"[^>]*>Shared docs fixture</);
  }
  else assert.doesNotMatch(html, /data-udocs-particles/);
  // 1.4.3 keeps the centered hero with its small logo; the others split it, and 1.6.4 draws its
  // logo large beside the text, where 2.2.3's particles form instead.
  if (directory.endsWith("1.4.3")) {
    assert.match(html, /data-layout="centered"/);
    assert.match(html, /class="udocs-hero__logo"/);
    assert.doesNotMatch(html, /data-udocs-hero-art/);
  } else {
    assert.match(html, /data-layout="split"/);
    assert.match(html, /data-udocs-hero-art/);
    assert.doesNotMatch(html, /class="udocs-hero__logo"/);
    if (directory.endsWith("1.6.4")) assert.match(html, /class="udocs-hero__art-logo"/);
  }
}
