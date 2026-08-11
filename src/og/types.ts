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

export function defineOgConfig<const T extends UmbracoDocsOgConfig>(config: T): T {
  return config;
}
