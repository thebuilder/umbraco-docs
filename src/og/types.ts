export interface OgCardInput {
  title: string;
  description: string;
  image: string;
}

export interface OgRootCard extends Omit<OgCardInput, "image"> {
  image?: string;
}

export interface UmbracoDocsOgConfig {
  contentDir: string;
  publicDir: string;
  prefix?: "/social" | "/og" | `/${string}`;
  root: OgRootCard;
  brand?: string;
  accent?: string;
}

function isSafePrefix(value: string): value is `/${string}` {
  const segments = value.slice(1).split("/");
  return /^\/[a-z0-9._~-]+(?:\/[a-z0-9._~-]+)*$/i.test(value) && !segments.some((segment) => segment === "." || segment === "..");
}

function requirePrefix(value: unknown): `/${string}` {
  const prefix = requireString(value, "prefix");
  if (!isSafePrefix(prefix)) {
    throw new TypeError("prefix must be a safe absolute public path such as /og or /social");
  }
  return prefix;
}

export function validateOgConfig(value: unknown): UmbracoDocsOgConfig {
  const input = requireRecord(value, "OG config");
  const root = requireRecord(input.root, "root");
  const prefix = input.prefix === undefined ? undefined : requirePrefix(input.prefix);

  return Object.freeze({
    contentDir: requireString(input.contentDir, "contentDir"),
    publicDir: requireString(input.publicDir, "publicDir"),
    ...(prefix === undefined ? {} : { prefix }),
    root: Object.freeze({
      title: requireString(root.title, "root.title"),
      description: requireString(root.description, "root.description"),
      ...(root.image === undefined ? {} : { image: requireString(root.image, "root.image") }),
    }),
    ...(input.brand === undefined ? {} : { brand: requireString(input.brand, "brand") }),
    ...(input.accent === undefined ? {} : { accent: requireString(input.accent, "accent") }),
  });
}

export function defineOgConfig(config: UmbracoDocsOgConfig): UmbracoDocsOgConfig {
  return validateOgConfig(config);
}
import { requireRecord, requireString } from "../validation.js";
