// Renders public/og/backdrop.png, the background of the Open Graph card, with the hero's own
// shaders: the settled particle mark beside the card's text, on the page's dark background.
// Rendering needs a GPU, which build machines don't have, so this runs by hand and the result is
// committed; the card build only lays the text over it. Run it after changing the hero's look:
//
//   pnpm --filter @thebuilder/umbraco-hub og:backdrop

import { fileURLToPath } from "node:url";
import { prepareShader } from "@vgpu/wgsl/prepare";
import { resolveShader } from "@vgpu/wgsl/runtime";
import sharp from "sharp";
import { frame, target } from "vgpu";
import { init } from "vgpu/node";

import { createHeroScene } from "../src/hero/scene.ts";

const WIDTH = 1200;
const HEIGHT = 630;
// Rendered at twice the size and scaled down, so the particles stay crisp.
const SCALE = 2;
// The page background in dark mode (--hub-background), with a faint violet glow behind the mark.
const BACKGROUND = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH * SCALE}" height="${HEIGHT * SCALE}">
  <radialGradient id="glow" cx="0.78" cy="0.5" r="0.55">
    <stop offset="0" stop-color="#7c6cf0" stop-opacity="0.2"/>
    <stop offset="1" stop-color="#7c6cf0" stop-opacity="0"/>
  </radialGradient>
  <rect width="100%" height="100%" fill="#09090b"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
</svg>`;
const OUTPUT = fileURLToPath(new URL("../public/og/backdrop.png", import.meta.url));

async function shader(name: string) {
  const entry = fileURLToPath(new URL(`../src/hero/${name}.wgsl`, import.meta.url));
  return prepareShader(await resolveShader({ entry }), entry);
}

const gpu = await init({ requiredLimits: { maxStorageBuffersInVertexStage: 1 } });
const output = target(gpu, { size: [WIDTH * SCALE, HEIGHT * SCALE], label: "og-backdrop" });
const scene = createHeroScene(gpu, output, {
  simulate: await shader("simulate"),
  particles: await shader("particles"),
  bright: await shader("bright"),
  blur: await shader("blur"),
  composite: await shader("composite"),
}, {
  // The mark stands on the right, clear of the title and description on the left.
  height: 0.78,
  offset: [1.12, 0],
});
scene.resize(SCALE);
// A fixed moment: the mark settled, turned slightly toward the text, with the light pulse on it.
scene.move({ time: 14, dt: 0, intro: 1, tilt: [-0.12, 0.03] });
// The card's text block, bottom left; the dust steps back behind it.
scene.look({ dark: 1, fadeBottom: false, text: { min: [0.05, 0.5], max: [0.66, 0.9] } });
await scene.compile();
frame(gpu, (currentFrame) => scene.render(currentFrame));

// The canvas output is premultiplied, so lay it over the background directly.
const pixels = await output.color.read({ mipLevel: 0, region: "all" });
const background = await sharp(Buffer.from(BACKGROUND)).removeAlpha().raw().toBuffer();
const opaque = Buffer.alloc(background.length);
for (let i = 0, o = 0; i < pixels.length; i += 4, o += 3) {
  const cover = 1 - pixels[i + 3]! / 255;
  for (let c = 0; c < 3; c++) opaque[o + c] = Math.min(255, Math.round(pixels[i + c]! + background[o + c]! * cover));
}
gpu.dispose();

await sharp(opaque, { raw: { width: WIDTH * SCALE, height: HEIGHT * SCALE, channels: 3 } })
  .resize(WIDTH, HEIGHT, { kernel: "lanczos3" })
  .png({ compressionLevel: 9 })
  .toFile(OUTPUT);
console.log(`Wrote ${OUTPUT}`);
