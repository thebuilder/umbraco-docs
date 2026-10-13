import { isNonEmptyString, requireRecord, requireString } from "./validation.js";

export const UMBRACO_PACKAGE_STATUSES = ["preview", "stable", "maintenance", "deprecated"] as const;

export type UmbracoPackageStatus = (typeof UMBRACO_PACKAGE_STATUSES)[number];

export interface UmbracoPackageLinks {
  docs: string;
  /** Omit until the package is published to NuGet. */
  nuget?: string;
  /** Omit until the package is listed on the Umbraco Marketplace. */
  marketplace?: string;
  /** For frontend packages published to npm. */
  npm?: string;
  github: string;
}

export interface UmbracoCompatibility {
  umbraco: string;
  dotnet?: string;
}

export interface UmbracoPackage {
  id: string;
  name: string;
  summary: string;
  links: UmbracoPackageLinks;
  logo: string;
  compatibility: UmbracoCompatibility;
  status: UmbracoPackageStatus;
  categories?: readonly string[];
}

const stableId = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const publicRootPath = /^\/(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[^\s\\?#]+$/;

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function requireHttpsUrl(value: unknown, field: string): string {
  if (!isHttpsUrl(value)) throw new TypeError(`${field} must be an absolute https URL`);
  return value;
}

function requireStatus(value: unknown): UmbracoPackageStatus {
  const status = UMBRACO_PACKAGE_STATUSES.find((candidate) => candidate === value);
  if (!status) throw new TypeError("status is invalid");
  return status;
}

export function validateUmbracoPackage(value: unknown): UmbracoPackage {
  const input = requireRecord(value, "package");
  const id = requireString(input.id, "id");
  if (!stableId.test(id)) throw new TypeError("id must be a stable lowercase dotted or dashed identifier");
  const logo = requireString(input.logo, "logo");
  if (!publicRootPath.test(logo)) throw new TypeError("logo must be a safe public-root path beginning with one /");

  const rawLinks = requireRecord(input.links, "links");
  const nuget = rawLinks.nuget === undefined ? undefined : requireHttpsUrl(rawLinks.nuget, "links.nuget");
  const marketplace = rawLinks.marketplace === undefined ? undefined : requireHttpsUrl(rawLinks.marketplace, "links.marketplace");
  const npm = rawLinks.npm === undefined ? undefined : requireHttpsUrl(rawLinks.npm, "links.npm");
  const links = Object.freeze({
    docs: requireHttpsUrl(rawLinks.docs, "links.docs"),
    ...(nuget === undefined ? {} : { nuget }),
    ...(marketplace === undefined ? {} : { marketplace }),
    ...(npm === undefined ? {} : { npm }),
    github: requireHttpsUrl(rawLinks.github, "links.github"),
  });

  const rawCompatibility = requireRecord(input.compatibility, "compatibility");
  const dotnet = rawCompatibility.dotnet === undefined ? undefined : requireString(rawCompatibility.dotnet, "compatibility.dotnet");
  const compatibility = Object.freeze({
    umbraco: requireString(rawCompatibility.umbraco, "compatibility.umbraco"),
    ...(dotnet === undefined ? {} : { dotnet }),
  });

  const status = requireStatus(input.status);

  const rawCategories = input.categories;
  if (rawCategories !== undefined && (!Array.isArray(rawCategories) || rawCategories.some((category) => !isNonEmptyString(category)))) {
    throw new TypeError("categories must contain only non-empty strings");
  }

  return Object.freeze({
    id,
    name: requireString(input.name, "name"),
    summary: requireString(input.summary, "summary"),
    links,
    logo,
    compatibility,
    status,
    ...(rawCategories === undefined ? {} : { categories: Object.freeze(rawCategories.map((category) => requireString(category, "category"))) }),
  });
}

export function defineUmbracoPackage(value: UmbracoPackage): UmbracoPackage {
  return validateUmbracoPackage(value);
}
