export const UMBRACO_PACKAGE_STATUSES = ["preview", "stable", "maintenance", "deprecated"] as const;

export type UmbracoPackageStatus = (typeof UMBRACO_PACKAGE_STATUSES)[number];

export interface UmbracoPackageLinks {
  docs: string;
  nuget: string;
  marketplace: string;
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

const absoluteUrl = /^https:\/\/[^\s]+$/;
const stableId = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

export function validateUmbracoPackage(value: UmbracoPackage): UmbracoPackage {
  const errors: string[] = [];
  if (!stableId.test(value.id)) errors.push("id must be a stable lowercase dotted or dashed identifier");
  if (!value.name.trim()) errors.push("name is required");
  if (!value.summary.trim()) errors.push("summary is required");
  if (!value.logo.startsWith("/")) errors.push("logo must be a public-root path beginning with /");
  if (!value.compatibility.umbraco.trim()) errors.push("compatibility.umbraco is required");
  for (const [name, url] of Object.entries(value.links)) {
    if (!absoluteUrl.test(url)) errors.push(`links.${name} must be an absolute https URL`);
  }
  if (!UMBRACO_PACKAGE_STATUSES.includes(value.status)) errors.push("status is invalid");
  if (value.categories?.some((category) => !category.trim())) errors.push("categories cannot contain empty values");
  if (errors.length) throw new TypeError(`Invalid Umbraco package ${value.id || "<unknown>"}: ${errors.join("; ")}`);
  return Object.freeze(value);
}

export function defineUmbracoPackage<const T extends UmbracoPackage>(value: T): T {
  return validateUmbracoPackage(value) as T;
}
