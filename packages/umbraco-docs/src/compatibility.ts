// Turns ">=17.1 <19" into "Umbraco CMS 17.1 through 18.x", ">=17.5 <18" into
// "Umbraco CMS 17.5 through 17.x", ">=17 <18" into "Umbraco CMS 17" and ">=17.5"
// into "Umbraco CMS 17.5 or later". Any other range is shown as written. This is the line under
// the install command on every docs site. It leaves out .NET: each Umbraco major already requires one.
export function formatUmbracoVersions(range: string): string {
  const value = range.trim();
  const openEnded = /^>=(\d+(?:\.\d+)*)$/.exec(value);
  if (openEnded) return `Umbraco CMS ${openEnded[1]} or later`;
  const bounded = /^>=((\d+)(?:\.\d+)*)\s+<(\d+)$/.exec(value);
  if (!bounded) return `Umbraco CMS ${value}`;
  const [, lower, lowerMajor, upperMajor] = bounded;
  const lastMajor = Number(upperMajor) - 1;
  if (lower === lowerMajor && Number(lowerMajor) === lastMajor) return `Umbraco CMS ${lastMajor}`;
  return `Umbraco CMS ${lower} through ${lastMajor}.x`;
}
