// Describes the hub on the landing page, in its meta description and in llms.txt.
export const tagline =
  "Small, focused packages for Umbraco, from backoffice extensions to headless frontend tools. Each one solves a single problem and ships its own docs.";

// The U in public/mark.svg: bars at x 60 and 196 from y 44 down to y 136, joined by a half circle.
const U = { left: 60, right: 196, top: 44, bend: 136, width: 36 };
const RADIUS = (U.right - U.left) / 2;

/** The U streams from one tip to the other along its center line. */
export const markFlow = {
  path: `M${U.left} ${U.top}V${U.bend}A${RADIUS} ${RADIUS} 0 0 0 ${U.right} ${U.bend}V${U.top}`,
  width: U.width,
  viewBox: 256,
};

/** The same center line as points one unit apart, for scripts without the browser's SVG geometry. */
export function markFlowPoints(): [number, number][] {
  const points: [number, number][] = [];
  for (let y = U.top; y < U.bend; y++) points.push([U.left, y]);
  const steps = Math.ceil(Math.PI * RADIUS);
  for (let step = 0; step <= steps; step++) {
    const angle = (step / steps) * Math.PI;
    points.push([U.left + RADIUS - RADIUS * Math.cos(angle), U.bend + RADIUS * Math.sin(angle)]);
  }
  for (let y = U.bend - 1; y >= U.top; y--) points.push([U.right, y]);
  return points;
}
