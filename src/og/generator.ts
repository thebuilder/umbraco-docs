import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import type { OgCardInput, UmbracoDocsOgConfig } from "./types.js";
import { validateOgConfig } from "./types.js";

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

function wrap(value: string, max = 42): string[] {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > max) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, 3);
}

function resolvePublicAssetPath(publicDir: string, asset: string): string {
  const root = path.resolve(publicDir);
  const output = path.resolve(root, `.${asset}`);
  if (!output.startsWith(`${root}${path.sep}`)) throw new TypeError(`Asset escapes public directory: ${asset}`);
  return output;
}

export function resolvePublicImagePath(publicDir: string, image: string, prefix = "/social"): string {
  if (!image.startsWith(`${prefix}/`) || !image.endsWith(".png") || image.includes("\\") || image.split("/").includes("..")) {
    throw new TypeError(`Unsafe OG image path ${image}; expected a .png below ${prefix}/`);
  }
  const root = path.resolve(publicDir);
  const output = path.resolve(root, `.${image}`);
  if (!output.startsWith(`${root}${path.sep}`)) throw new TypeError(`OG image escapes public directory: ${image}`);
  return output;
}

async function contentFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return contentFiles(absolute);
    return /\.mdx?$/.test(entry.name) ? [absolute] : [];
  }));
  return nested.flat().sort();
}

export async function collectOgCards(config: UmbracoDocsOgConfig): Promise<OgCardInput[]> {
  const validated = validateOgConfig(config);
  return collectValidatedOgCards(validated);
}

async function collectValidatedOgCards(validated: UmbracoDocsOgConfig): Promise<OgCardInput[]> {
  const prefix = validated.prefix ?? "/social";
  const cards: OgCardInput[] = [{
    title: validated.root.title,
    description: validated.root.description,
    image: validated.root.image ?? `${prefix}/index.png`,
  }];
  for (const file of await contentFiles(validated.contentDir)) {
    const { data } = matter(await readFile(file, "utf8"));
    const image = data.seo?.image;
    if (image === undefined) continue;
    if (typeof image !== "string") throw new TypeError(`${file}: seo.image must be a string`);
    if (typeof data.title !== "string" || !data.title.trim()) throw new TypeError(`${file}: title must be a non-empty string when seo.image is set`);
    if (typeof data.description !== "string" || !data.description.trim()) throw new TypeError(`${file}: description must be a non-empty string when seo.image is set`);
    cards.push({ title: data.title, description: data.description, image });
  }

  const byImage = new Map<string, OgCardInput>();
  for (const card of cards) {
    resolvePublicImagePath(validated.publicDir, card.image, prefix);
    if (byImage.has(card.image)) throw new TypeError(`Duplicate OG image path: ${card.image}`);
    byImage.set(card.image, card);
  }
  return [...byImage.values()].sort((a, b) => a.image.localeCompare(b.image));
}

async function renderCard(card: OgCardInput, config: UmbracoDocsOgConfig): Promise<Buffer> {
  const titleLines = wrap(card.title, 24).slice(0, 2);
  const descriptionLines = wrap(card.description, 52).slice(0, 3);
  const titleSize = card.title.length > 23 ? 72 : 82;
  const titleY = Math.max(
    config.logo ? 315 : 220,
    520 - (descriptionLines.length - 1) * 46 - 80 - (titleLines.length - 1) * 78,
  );
  const title = titleLines.map((line, index) => `<text x="82" y="${titleY + index * 78}" class="title">${escapeXml(line)}</text>`).join("");
  const descriptionY = titleY + (titleLines.length - 1) * 78 + 80;
  const description = descriptionLines.map((line, index) => `<text x="82" y="${descriptionY + index * 46}" class="description">${escapeXml(line)}</text>`).join("");
  const accent = escapeXml(config.accent ?? "#60a5fa");
  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111a35"/><stop offset="0.56" stop-color="#090e1d"/><stop offset="1" stop-color="#05060c"/></linearGradient><radialGradient id="glow" cx="0.2" cy="-0.08" r="0.9"><stop offset="0" stop-color="${accent}" stop-opacity="0.45"/><stop offset="0.46" stop-color="#6366f1" stop-opacity="0.12"/><stop offset="1" stop-color="#6366f1" stop-opacity="0"/></radialGradient><linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#60a5fa"/><stop offset="0.5" stop-color="#9b83ec"/><stop offset="1" stop-color="#ed63ad"/></linearGradient></defs><style>.brand{font:600 26px system-ui,sans-serif;fill:#aab2c5}.title{font:800 ${titleSize}px system-ui,sans-serif;letter-spacing:-2px;fill:#f8fafc}.description{font:400 38px system-ui,sans-serif;fill:#aab2c5}</style><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#background)"/><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/><rect width="${WIDTH}" height="6" fill="url(#accent)"/>${config.logo ? "" : `<text x="82" y="112" class="brand">${escapeXml(config.brand ?? "TheBuilder · Umbraco")}</text>`}${title}${description}</svg>`;
  const composites = config.logo ? [{
    input: await sharp(await readFile(resolvePublicAssetPath(config.publicDir, config.logo))).resize(168, 168, { fit: "contain" }).png().toBuffer(),
    left: 72,
    top: 68,
  }] : [];
  return sharp(Buffer.from(svg)).composite(composites).png({ compressionLevel: 9, adaptiveFiltering: false, palette: false }).toBuffer();
}

export async function generateOgImages(config: UmbracoDocsOgConfig, options: { check?: boolean } = {}): Promise<OgCardInput[]> {
  const validated = validateOgConfig(config);
  const cards = await collectValidatedOgCards(validated);
  const outputs = await Promise.all(cards.map(async (card) => ({
    card,
    output: resolvePublicImagePath(validated.publicDir, card.image, validated.prefix),
    expected: await renderCard(card, validated),
  })));

  if (options.check) {
    await Promise.all(outputs.map(async ({ card, output, expected }) => {
      let actual: Buffer | undefined;
      try { actual = await readFile(output); } catch { /* Report as stale below. */ }
      if (!actual?.equals(expected)) throw new Error(`OG image is missing or stale: ${card.image}`);
    }));
  } else {
    await Promise.all(outputs.map(async ({ output, expected }) => {
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, expected);
    }));
  }
  return cards;
}
