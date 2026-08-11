#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import path from "node:path";
import { generateOgImages } from "./generator.js";
import type { UmbracoDocsOgConfig } from "./types.js";

const args = process.argv.slice(2);
const check = args.includes("--check");
const configArgument = args.find((argument) => !argument.startsWith("--")) ?? "umbraco-docs.config.mjs";
const configPath = path.resolve(configArgument);
const imported = await import(pathToFileURL(configPath).href) as { default?: UmbracoDocsOgConfig };
if (!imported.default) throw new TypeError(`${configPath} must default-export an OG config`);
const cards = await generateOgImages(imported.default, { check });
console.log(`${check ? "Checked" : "Generated"} ${cards.length} Open Graph image${cards.length === 1 ? "" : "s"}.`);
