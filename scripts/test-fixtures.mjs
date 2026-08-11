import { spawnSync } from "node:child_process";

for (const fixture of ["blume-1.2.1", "blume-1.4.2"]) {
  const install = spawnSync("corepack", ["pnpm", "--dir", `fixtures/${fixture}`, "install", "--ignore-workspace", "--force"], { stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status ?? 1);
  const result = spawnSync("corepack", ["pnpm", "--dir", `fixtures/${fixture}`, "build"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
