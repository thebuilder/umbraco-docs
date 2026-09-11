import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("corepack", ["pnpm", ...args], { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(" ")} exited with ${code ?? "no status"}`)));
  });
}

const directories = ["fixtures/blume-1.4.3", "fixtures/blume-1.6.4"];

for (const directory of directories) {
  await run(["--dir", directory, "install", "--ignore-workspace", "--frozen-lockfile"]);
  await run(["--dir", directory, "build"]);

  const html = await readFile(`${directory}/.blume-verify/dist/index.html`, "utf8");
  assert.match(html, /property="og:image"/);
  assert.match(html, /data-udocs-root/);
  assert.match(html, /data-udocs-copy="dotnet add package TheBuilder\.Fixture"/);
  assert.match(html, /Related package/);
  assert.match(html, /astro:page-load/);
}
