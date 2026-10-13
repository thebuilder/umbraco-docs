import type { APIRoute } from "astro";

// Every static .astro page; endpoints, dynamic routes and _-prefixed files are left out.
const routes = Object.keys(import.meta.glob("./**/*.astro"))
  .filter((file) => !/\[|\/_/.test(file))
  .map((file) => file.slice(1).replace(/(index)?\.astro$/, "").replace(/([^/])$/, "$1/"));

export const GET: APIRoute = ({ site }) => {
  const urls = routes.map((route) => `  <url><loc>${new URL(route, site).href}</loc></url>`);
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
