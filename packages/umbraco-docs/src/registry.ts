import { validateUmbracoPackage, type UmbracoPackage } from "./package.js";
import { isRecord } from "./validation.js";

export const DEFAULT_REGISTRY_URL = "https://umbraco.thebuilder.dk/packages.json";

export interface LoadUmbracoPackagesOptions {
  /** Registry to read. Defaults to the package hub. */
  url?: string;
  /** Returned when the registry can't be read. Defaults to an empty list. */
  fallback?: readonly UmbracoPackage[];
  /** Gives up on the request after this many milliseconds. Defaults to 10 seconds. */
  timeoutMs?: number;
}

/**
 * Reads the package list the hub publishes, for "related packages" sections.
 * A docs build should never fail because the hub is down, so any problem is
 * logged and the fallback is returned instead. Entries that fail validation
 * are skipped one by one.
 */
export async function loadUmbracoPackages(options: LoadUmbracoPackagesOptions = {}): Promise<UmbracoPackage[]> {
  const { url = DEFAULT_REGISTRY_URL, fallback = [], timeoutMs = 10_000 } = options;
  const warn = (reason: string) => console.warn(`[umbraco-docs] Could not load packages from ${url}: ${reason}`);

  let payload: unknown;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      warn(`HTTP ${response.status}`);
      return [...fallback];
    }
    payload = await response.json();
  } catch (error) {
    warn(error instanceof Error ? error.message : String(error));
    return [...fallback];
  }

  if (!isRecord(payload) || payload.version !== 1 || !Array.isArray(payload.packages)) {
    warn("expected a version 1 registry with a packages array");
    return [...fallback];
  }

  const packages: UmbracoPackage[] = [];
  for (const entry of payload.packages) {
    try {
      packages.push(validateUmbracoPackage(entry));
    } catch (error) {
      const id = isRecord(entry) && typeof entry.id === "string" ? entry.id : "unknown";
      console.warn(`[umbraco-docs] Skipping package ${id} from ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return packages;
}
