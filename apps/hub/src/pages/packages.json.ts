import type { APIRoute } from "astro";

import { packages } from "../packages.ts";

// The public registry. Logos become absolute URLs so any site can render a
// package card without hosting its own copy of the logo.
export const GET: APIRoute = ({ site }) => {
  const registry = {
    version: 1,
    packages: packages.map((item) => ({ ...item, logo: new URL(item.logo, site).href })),
  };
  return new Response(`${JSON.stringify(registry, null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
