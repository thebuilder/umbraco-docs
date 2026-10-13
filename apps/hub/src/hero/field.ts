// The particles that draw the mark. Positions come from the shapes in public/mark.svg (a U stroke
// and a rounded square, in a 256 unit viewBox), sampled once on the CPU with a seeded generator so
// every load looks the same.

/** Floats per `Particle` in simulate.wgsl. */
export const PARTICLE_FLOATS = 16;
/** Floats per `Sprite` in simulate.wgsl and particles.wgsl. */
export const SPRITE_FLOATS = 8;

export const KIND_STROKE = 0;
export const KIND_SOLID = 1;
export const KIND_DUST = 2;

// The U: x = 60 and x = 196 from y = 44 down to y = 136, joined by a half circle of radius 68
// around (128, 136). The stroke is 36 wide with round caps.
const LEFT = 60;
const RIGHT = 196;
const TOP = 44;
const BEND = 136;
const CENTER_X = 128;
const RADIUS = 68;
const HALF_WIDTH = 18;
const BAR = BEND - TOP;
const ARC = Math.PI * RADIUS;
export const STROKE_LENGTH = 2 * BAR + ARC;
// The square: 52 wide at (102, 110), corner radius 12.
const SQUARE = { x: 102, y: 110, size: 52, radius: 12 };
// The mark's bounds, for the gradient and for centering.
const BOUNDS = { x: LEFT - HALF_WIDTH, y: TOP - HALF_WIDTH, width: RIGHT - LEFT + 2 * HALF_WIDTH, height: BEND + RADIUS + HALF_WIDTH - (TOP - HALF_WIDTH) };
export const MARK_CENTER = [BOUNDS.x + BOUNDS.width / 2, BOUNDS.y + BOUNDS.height / 2] as const;
export const MARK_HEIGHT = BOUNDS.height;

// The gradient in mark.svg, diagonal across the bounds.
const STOPS = [
  [0, "#60a5fa"],
  [0.52, "#9b83ec"],
  [1, "#ed63ad"],
] as const;

export interface ParticleField {
  readonly count: number;
  readonly particles: Float32Array<ArrayBuffer>;
}

/** Mulberry32: a tiny seeded generator, stable across reloads and platforms. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

type Placement =
  | { kind: typeof KIND_STROKE; progress: number; across: number }
  | { kind: typeof KIND_SOLID };

/** Where a point of the viewBox falls on the mark, if it does. */
function place(x: number, y: number): Placement | undefined {
  if (y >= TOP && y <= BEND) {
    if (Math.abs(x - LEFT) <= HALF_WIDTH) return { kind: KIND_STROKE, progress: (y - TOP) / STROKE_LENGTH, across: LEFT - x };
    if (Math.abs(x - RIGHT) <= HALF_WIDTH) return { kind: KIND_STROKE, progress: (BAR + ARC + BEND - y) / STROKE_LENGTH, across: x - RIGHT };
  }
  if (y > BEND) {
    const distance = Math.hypot(x - CENTER_X, y - BEND);
    if (Math.abs(distance - RADIUS) <= HALF_WIDTH) {
      const angle = Math.atan2(y - BEND, CENTER_X - x);
      return { kind: KIND_STROKE, progress: (BAR + angle * RADIUS) / STROKE_LENGTH, across: distance - RADIUS };
    }
  }
  // The round caps hold still while the stroke flows, so the ends never thin out.
  if (y < TOP && (Math.hypot(x - LEFT, y - TOP) <= HALF_WIDTH || Math.hypot(x - RIGHT, y - TOP) <= HALF_WIDTH)) {
    return { kind: KIND_SOLID };
  }
  const qx = Math.max(Math.abs(x - (SQUARE.x + SQUARE.size / 2)) - SQUARE.size / 2 + SQUARE.radius, 0);
  const qy = Math.max(Math.abs(y - (SQUARE.y + SQUARE.size / 2)) - SQUARE.size / 2 + SQUARE.radius, 0);
  if (Math.hypot(qx, qy) <= SQUARE.radius) return { kind: KIND_SOLID };
  return undefined;
}

function hexToLinear(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

const STOP_COLORS = STOPS.map(([offset, hex]) => [offset, hexToLinear(hex)] as const);

function gradient(t: number): [number, number, number] {
  const at = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < STOP_COLORS.length; i++) {
    const [offset, color] = STOP_COLORS[i]!;
    const [previousOffset, previous] = STOP_COLORS[i - 1]!;
    if (at <= offset) {
      const blend = (at - previousOffset) / (offset - previousOffset);
      return [0, 1, 2].map((c) => previous[c]! + (color[c]! - previous[c]!) * blend) as [number, number, number];
    }
  }
  return STOP_COLORS[STOP_COLORS.length - 1]![1];
}

export function generateField({ markParticles = 16000, dustParticles = 2600 } = {}): ParticleField {
  const rand = random(0x55d0c5);
  const count = markParticles + dustParticles;
  const particles = new Float32Array(count * PARTICLE_FLOATS);

  const write = (i: number, values: {
    home: [number, number]; z: number; kind: number;
    progress: number; across: number; size: number; brightness: number;
    color: [number, number, number]; sparkle: number;
  }) => {
    const o = i * PARTICLE_FLOATS;
    particles.set([values.home[0], values.home[1], values.z, values.kind], o);
    particles.set([values.progress, values.across, rand(), values.size], o + 4);
    particles.set([...values.color, values.brightness], o + 8);
    // Scattered start, in -1..1 of the canvas, and a phase for the idle drift.
    particles.set([rand() * 2 - 1, rand() * 2 - 1, rand() * Math.PI * 2, values.sparkle], o + 12);
  };

  for (let i = 0; i < markParticles;) {
    const x = BOUNDS.x + rand() * BOUNDS.width;
    const y = BOUNDS.y + rand() * BOUNDS.height;
    const placement = place(x, y);
    if (!placement) continue;
    // The stroke is denser toward its center line, like ink pooling in a brush stroke.
    const across = placement.kind === KIND_STROKE ? Math.abs(placement.across) / HALF_WIDTH : 0;
    if (rand() < across * across * 0.45) continue;

    const sparkle = rand() < 0.02 ? 1 : 0;
    const shade = ((x - BOUNDS.x) / BOUNDS.width + (y - BOUNDS.y) / BOUNDS.height) / 2;
    write(i++, {
      home: [x, y],
      z: (rand() - 0.5) * 10,
      kind: placement.kind,
      progress: placement.kind === KIND_STROKE ? placement.progress : 0,
      across: placement.kind === KIND_STROKE ? placement.across : 0,
      size: sparkle ? 2.4 + rand() * 1.8 : 0.6 + rand() ** 2.2 * 1.6,
      brightness: sparkle ? 1.8 + rand() * 1.2 : (placement.kind === KIND_SOLID ? 0.8 : 0.55) + rand() * 0.6,
      color: gradient(shade + (rand() - 0.5) * 0.12),
      sparkle,
    });
  }

  // Dust fills the rest of the hero at different depths, so the mark sits in a space.
  for (let i = markParticles; i < count; i++) {
    const depth = rand();
    write(i, {
      home: [0, 0],
      z: depth,
      kind: KIND_DUST,
      progress: 0,
      across: 0,
      size: 0.6 + depth * 1.8 + (rand() < 0.04 ? 1.8 : 0),
      brightness: 0.18 + rand() * 0.5 * depth,
      color: gradient(rand()),
      sparkle: 0,
    });
  }

  return { count, particles };
}
