// Regenerates all package brand rasters from scripts/mark.mjs:
// favicon.png, public/logo.png, and the dark-tile icon.png.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { markSvg } from "./mark.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const toPng = (svg) => sharp(Buffer.from(svg)).png().toBuffer();

const transparent = await toPng(markSvg(256));
await mkdir(resolve(root, "public"), { recursive: true });
await writeFile(resolve(root, "favicon.png"), transparent);
await writeFile(resolve(root, "public/logo.png"), transparent);

const tileSize = 512;
const tileRadius = 114;
const tile = `<svg width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#15152e"/><stop offset="1" stop-color="#08080f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.02" r="0.9">
      <stop offset="0" stop-color="#6d5ef7" stop-opacity="0.38"/>
      <stop offset="0.55" stop-color="#3b82f6" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${tileSize}" height="${tileSize}" rx="${tileRadius}" fill="url(#bg)"/>
  <rect width="${tileSize}" height="${tileSize}" rx="${tileRadius}" fill="url(#glow)"/>
</svg>`;

const tileMark = await toPng(markSvg(352));
const icon = await sharp(await toPng(tile))
  .composite([{ input: tileMark, gravity: "center" }])
  .png()
  .toBuffer();
await writeFile(resolve(root, "icon.png"), icon);

console.log("regenerated favicon.png, public/logo.png, and dark-tile icon.png from scripts/mark.mjs");
