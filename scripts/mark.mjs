// Deterministic implementation of scripts/brand-prompt.md. Three offset
// document panels represent reusable documentation building blocks while the
// blue / purple / pink palette connects the mark to the package family.
export const MARK_SHAPES = `
  <rect x="15" y="25" width="42" height="56" rx="8" fill="#60a5fa"/>
  <rect x="29" y="16" width="42" height="56" rx="8" fill="#a78bfa"/>
  <rect x="43" y="25" width="42" height="56" rx="8" fill="#f472b6"/>
  <rect x="49" y="37" width="25" height="4" rx="2" fill="#fff" fill-opacity="0.94"/>
  <rect x="49" y="47" width="20" height="4" rx="2" fill="#fff" fill-opacity="0.78"/>
  <rect x="49" y="57" width="23" height="4" rx="2" fill="#fff" fill-opacity="0.78"/>
`;

export const markSvg = (size) =>
  `<svg width="${size}" height="${size}" viewBox="10 10 80 80" xmlns="http://www.w3.org/2000/svg">${MARK_SHAPES}</svg>`;
