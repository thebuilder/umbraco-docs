import { script } from "blume/analytics";

import { PAGEFLOCK_SCRIPT_SRC } from "./pageflock.js";

export { PAGEFLOCK_SCRIPT_SRC };

/**
 * Pageflock analytics for a package docs site, as a Blume analytics adapter. Each docs site has its
 * own Pageflock site in the thebuilder workspace; pass its ID (the domain with dots as dashes,
 * such as `blur-thebuilder-dk`). Add it to `analytics` in `blume.config.ts`:
 *
 * ```ts
 * import { pageflock } from "@thebuilder/umbraco-docs/analytics";
 *
 * export default defineConfig({ analytics: [vercel(), pageflock("blur-thebuilder-dk")] });
 * ```
 */
export const pageflock = (site: string) =>
  script({
    src: PAGEFLOCK_SCRIPT_SRC,
    strategy: "defer",
    attributes: { "data-site": site },
  });
