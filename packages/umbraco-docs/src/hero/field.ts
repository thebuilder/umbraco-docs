// The particles that draw a logo. They are placed on the logo's solid pixels and take those
// pixels' colors, using a seeded generator so every load looks the same. A logo can also name a
// flow: a stroke whose particles stream from one end to the other instead of holding still.
// Everything here is plain data, so the browser and Node build the same field.

/** Floats per `Particle` in simulate.wgsl. */
export const PARTICLE_FLOATS = 16;
/** Floats per `Sprite` in simulate.wgsl and particles.wgsl. */
export const SPRITE_FLOATS = 8;
/** Floats per `FlowSample` in simulate.wgsl. */
export const FLOW_FLOATS = 8;
/** Samples along a flow, caps included. */
export const FLOW_SAMPLES = 256;

const KIND_STROKE = 0;
const KIND_SOLID = 1;
const KIND_DUST = 2;
// Pixels below this coverage are left out, so soft glow layers behind a logo don't form.
const SOLID_ALPHA = 0.6;
// Particles per unit of logo area at the raster size, so every logo reads as equally dense.
const DENSITY = 0.9;
const DUST = 2600;

/** RGBA pixels of the logo, as from `ImageData` or a raw decode. */
export interface LogoPixels {
  readonly data: Uint8ClampedArray | Uint8Array;
  readonly width: number;
  readonly height: number;
}

/** A stroke of the logo that flows, in the same pixel space as `LogoPixels`. */
export interface FlowStroke {
  /** Points along the stroke's center line, closely spaced, from where the flow starts to where it ends. */
  readonly points: readonly (readonly [number, number])[];
  /** The stroke's width. The flow narrows into round caps past both ends, like `stroke-linecap: round`. */
  readonly width: number;
}

export interface ParticleField {
  readonly count: number;
  readonly particles: Float32Array<ArrayBuffer>;
  /** FLOW_SAMPLES samples when the field has a flow; one unused sample otherwise. */
  readonly flow: Float32Array<ArrayBuffer>;
  readonly flowSamples: number;
  /** The logo's solid bounds, in pixels. */
  readonly center: readonly [number, number];
  readonly size: readonly [number, number];
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

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

interface FlowSample {
  x: number;
  y: number;
  /** Half the stroke's width here; it closes to zero at the tips of the caps. */
  half: number;
}

/** Resamples the stroke evenly by length, with its round caps added at both ends. */
function sampleFlow(stroke: FlowStroke): FlowSample[] {
  const half = stroke.width / 2;
  const points = stroke.points;
  if (points.length < 2) throw new TypeError("A flow needs at least two points");
  const first = points[0]!;
  const second = points[1]!;
  const last = points[points.length - 1]!;
  const beforeLast = points[points.length - 2]!;
  const direction = (from: readonly [number, number], to: readonly [number, number]) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
    return [(to[0] - from[0]) / length, (to[1] - from[1]) / length] as const;
  };
  const start = direction(second, first);
  const end = direction(beforeLast, last);

  // The center line runs half a width past each end, where the caps close.
  const line: Array<readonly [number, number]> = [
    [first[0] + start[0] * half, first[1] + start[1] * half],
    ...points,
    [last[0] + end[0] * half, last[1] + end[1] * half],
  ];
  const lengths = [0];
  for (let i = 1; i < line.length; i++) {
    lengths.push(lengths[i - 1]! + Math.hypot(line[i]![0] - line[i - 1]![0], line[i]![1] - line[i - 1]![1]));
  }
  const total = lengths[lengths.length - 1]!;
  const strokeEnd = total - half;

  const samples: FlowSample[] = [];
  let segment = 0;
  for (let k = 0; k < FLOW_SAMPLES; k++) {
    const at = (k / (FLOW_SAMPLES - 1)) * total;
    while (segment < line.length - 2 && lengths[segment + 1]! < at) segment++;
    const span = lengths[segment + 1]! - lengths[segment]! || 1;
    const blend = Math.min(Math.max((at - lengths[segment]!) / span, 0), 1);
    const a = line[segment]!;
    const b = line[segment + 1]!;
    const beyond = Math.max(half - at, at - strokeEnd, 0) / half;
    samples.push({
      x: a[0] + (b[0] - a[0]) * blend,
      y: a[1] + (b[1] - a[1]) * blend,
      half: half * Math.sqrt(Math.max(1 - beyond * beyond, 0)),
    });
  }
  return samples;
}

/** Builds the particles for a logo. */
export function createParticleField(logo: LogoPixels, options: { flow?: FlowStroke } = {}): ParticleField {
  const { data, width, height } = logo;
  const alphaAt = (x: number, y: number) => {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return 0;
    return data[(py * width + px) * 4 + 3]! / 255;
  };
  const colorAt = (x: number, y: number): [number, number, number] => {
    const i = (Math.floor(y) * width + Math.floor(x)) * 4;
    return [srgbToLinear(data[i]!), srgbToLinear(data[i + 1]!), srgbToLinear(data[i + 2]!)];
  };

  // The solid bounds and area decide where the mark sits and how many particles it gets.
  let minX = width, minY = height, maxX = -1, maxY = -1, area = 0;
  const solid: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaAt(x, y) < SOLID_ALPHA) continue;
      area++;
      solid.push(x, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (area === 0) throw new TypeError("The logo has no solid pixels to draw");
  const markCount = Math.round(Math.min(Math.max(area * DENSITY * (256 / Math.max(width, height)) ** 2, 6000), 20000));

  const flow = options.flow ? sampleFlow(options.flow) : undefined;
  const step = flow ? 1 / (FLOW_SAMPLES - 1) : 0;
  // Samples are evenly spaced along the flow.
  const spacing = flow ? Math.hypot(flow[1]!.x - flow[0]!.x, flow[1]!.y - flow[0]!.y) || 1 : 1;
  // Where a point falls on the flow, if it does: the nearest sample, then along and across it.
  const onFlow = (x: number, y: number) => {
    if (!flow) return undefined;
    let best = -1;
    let bestDistance = Infinity;
    for (let k = 0; k < flow.length; k++) {
      const distance = (flow[k]!.x - x) ** 2 + (flow[k]!.y - y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = k;
      }
    }
    const sample = flow[best]!;
    const previous = flow[Math.max(best - 1, 0)]!;
    const next = flow[Math.min(best + 1, flow.length - 1)]!;
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
    const tangent = [(next.x - previous.x) / length, (next.y - previous.y) / length] as const;
    const along = (x - sample.x) * tangent[0] + (y - sample.y) * tangent[1];
    const across = (x - sample.x) * -tangent[1] + (y - sample.y) * tangent[0];
    const reach = Math.max(sample.half, options.flow!.width / 2 * 0.15);
    if (Math.abs(across) > reach * 1.05) return undefined;
    const progress = Math.min(Math.max((best + along / spacing) * step, 0), 1);
    return { progress, across: Math.min(Math.max(across / reach, -1), 1) };
  };

  const rand = random(0x55d0c5);
  const count = markCount + DUST;
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

  for (let i = 0; i < markCount;) {
    // Pick a solid pixel, then a point inside it.
    const pixel = Math.floor(rand() * area) * 2;
    const x = solid[pixel]! + rand();
    const y = solid[pixel + 1]! + rand();
    const stroke = onFlow(x, y);
    // A flowing stroke is denser toward its center line, like ink pooling in a brush stroke.
    if (stroke && rand() < stroke.across * stroke.across * 0.45) continue;

    const sparkle = rand() < 0.02 ? 1 : 0;
    write(i++, {
      home: [x, y],
      z: (rand() - 0.5) * 0.05 * Math.max(maxX - minX, maxY - minY),
      kind: stroke ? KIND_STROKE : KIND_SOLID,
      progress: stroke?.progress ?? 0,
      across: stroke?.across ?? 0,
      size: sparkle ? 2.4 + rand() * 1.8 : 0.6 + rand() ** 2.2 * 1.6,
      brightness: sparkle ? 1.8 + rand() * 1.2 : (stroke ? 0.55 : 0.7) + rand() * 0.6,
      color: colorAt(x, y),
      sparkle,
    });
  }

  // Dust fills the rest of the hero at different depths, in the logo's own colors.
  for (let i = markCount; i < count; i++) {
    const depth = rand();
    const pixel = Math.floor(rand() * area) * 2;
    write(i, {
      home: [0, 0],
      z: depth,
      kind: KIND_DUST,
      progress: 0,
      across: 0,
      size: 0.6 + depth * 1.8 + (rand() < 0.04 ? 1.8 : 0),
      brightness: 0.18 + rand() * 0.5 * depth,
      color: colorAt(solid[pixel]!, solid[pixel + 1]!),
      sparkle: 0,
    });
  }

  // The flow's color at each sample, so stroke particles keep the logo's colors as they move.
  // Samples off the solid shape (the very tips) borrow their neighbor's color.
  const flowData = new Float32Array(Math.max(flow?.length ?? 0, 1) * FLOW_FLOATS);
  if (flow) {
    const colors = flow.map((sample) => (alphaAt(sample.x, sample.y) >= SOLID_ALPHA ? colorAt(sample.x, sample.y) : undefined));
    for (let k = 1; k < colors.length; k++) colors[k] ??= colors[k - 1];
    for (let k = colors.length - 2; k >= 0; k--) colors[k] ??= colors[k + 1];
    flow.forEach((sample, k) => {
      flowData.set([sample.x, sample.y, sample.half, 0, ...(colors[k] ?? [1, 1, 1]), 0], k * FLOW_FLOATS);
    });
  }

  return {
    count,
    particles,
    flow: flowData,
    flowSamples: flow?.length ?? 0,
    center: [(minX + maxX + 1) / 2, (minY + maxY + 1) / 2],
    size: [maxX - minX + 1, maxY - minY + 1],
  };
}
