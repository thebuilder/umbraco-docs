// The GPU half of the particle hero, shared by the page (browser.ts) and anything that renders it
// offscreen, such as an Open Graph backdrop. Each frame runs simulate (compute) → particles
// (additive points into an HDR target) → bloom (half and quarter resolution) → composite into the
// output. The shaders ship prepared, so this needs no WGSL loader.

import { compute, draw, effect, sampler, storage, target } from "vgpu";
import type { Frame, Gpu, Target } from "vgpu";

import { SPRITE_FLOATS, type ParticleField } from "./field.js";
import * as shaders from "./shaders.generated.js";

/** Per-frame inputs of simulate.wgsl. Pointer and tilt are in view space: y up, x scaled by aspect. */
export interface HeroMotion {
  time?: number;
  dt?: number;
  intro?: number;
  pointer?: [number, number];
  pointerActive?: number;
  tilt?: [number, number];
}

export interface HeroLook {
  /** 0 light, 1 dark, or anything between while the theme changes. */
  dark?: number;
  /** Where the text sits, in uv; the particles step back behind it. */
  text?: { min: [number, number]; max: [number, number] };
  /** Fades the particles out toward the bottom edge, into the page below. */
  fadeBottom?: boolean;
  /** How far the particles step back behind the text, from 0 to 1. */
  textDim?: number;
}

export interface HeroLayout {
  /** Mark height as a share of the output height. */
  height: number;
  /** Mark center in view units: x from -aspect to aspect, y from -1 to 1, up. */
  offset: [number, number];
  /** Widest the mark gets, as a share of the output width. 0.875 by default. */
  width?: number;
}

/** The page hero's layout: the mark fills most of the height, centered. */
export const CENTERED: HeroLayout = { height: 0.84, offset: [0, -0.02] };

// Screen pixels per logo pixel at which the logo draws all its particles. A smaller logo draws
// fewer, in proportion to its area, down to MIN_KEEP, so it keeps the same density on screen.
const FULL_DENSITY_PIXELS = 2;
const MIN_KEEP = 0.15;

const HDR = "rgba16float" as const;
const CLEAR = [0, 0, 0, 0] as const;
const WORKGROUP = 64;

export type HeroScene = ReturnType<typeof createHeroScene>;

/** `output` is a canvas surface, or an offscreen target for a still. */
export function createHeroScene(gpu: Gpu, output: Target, field: ParticleField, layout: HeroLayout = CENTERED) {
  const particles = storage(gpu, field.particles.byteLength, "read");
  particles.write(field.particles);
  const flowPath = storage(gpu, field.flow.byteLength, "read");
  flowPath.write(field.flow);
  const motion = storage(gpu, field.count * 16, "read-write");
  motion.write(new Float32Array(field.count * 4));
  const sprites = storage(gpu, field.count * SPRITE_FLOATS * 4, "read-write");

  const scaled = (divisor: number): [number, number] => [
    Math.max(1, Math.round(output.size[0] / divisor)),
    Math.max(1, Math.round(output.size[1] / divisor)),
  ];
  const scene = target(gpu, { size: output.size, format: HDR, label: "hero-scene" });
  const near = [target(gpu, { size: scaled(2), format: HDR }), target(gpu, { size: scaled(2), format: HDR })] as const;
  const far = [target(gpu, { size: scaled(4), format: HDR }), target(gpu, { size: scaled(4), format: HDR })] as const;

  const samp = sampler(gpu, { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
  const simulate = compute(gpu, shaders.simulate, {
    label: "hero-simulate",
    set: {
      particles,
      flowPath,
      motion,
      sprites,
      params: {
        markCenter: field.center, markOffset: layout.offset, pointer: [0, 0], tilt: [0, 0],
        aspect: 1, markScale: 1, time: 0, dt: 0, intro: 1, flow: 0.012, dark: 1, pointerActive: 0,
        pixelRatio: 1, count: field.count, flowSamples: field.flowSamples, keep: 1,
      },
    },
  });
  const points = draw(gpu, {
    shader: shaders.particles,
    vertices: 6,
    instances: field.count,
    blend: { color: { src: "one", dst: "one" }, alpha: { src: "one", dst: "one" } },
    label: "hero-particles",
    set: { sprites, view: { resolution: [1, 1] } },
  });
  const bright = effect(gpu, shaders.bright, { label: "hero-bright", set: { samp, bright: { threshold: 0.06, knee: 0.4 } } });
  const blurs = [
    { src: near[0], dst: near[1], direction: [1, 0], spread: 1.3 },
    { src: near[1], dst: near[0], direction: [0, 1], spread: 1.3 },
    { src: near[0], dst: far[0], direction: [1, 0], spread: 2.2 },
    { src: far[0], dst: far[1], direction: [0, 1], spread: 2.2 },
  ].map((pass, i) => ({
    ...pass,
    effect: effect(gpu, shaders.blur, {
      label: `hero-blur-${i}`,
      set: { samp, blur: { texel: [1, 1], direction: pass.direction, spread: pass.spread } },
    }),
  }));
  const composite = effect(gpu, shaders.composite, {
    label: "hero-composite",
    set: {
      samp,
      // Dim enough that the hero's secondary text, brightened over the particles in
      // landing.css, keeps 4.5:1 even against the brightest particles behind it.
      params: { textMin: [0, 0], textMax: [0, 0], dark: 1, exposure: 2.4, bloom: 1.6, textDim: 0.65, fade: 1 },
    },
  });

  let aspect = 1;
  let pixelRatio = 1;
  // The mark keeps its share of the height, narrowed on portrait screens so it still fits.
  const fit = () => {
    const markScale = Math.min((2 * layout.height) / field.size[1], (2 * aspect * (layout.width ?? 0.875)) / field.size[0]);
    const pixels = (markScale * output.size[1]) / 2 / pixelRatio;
    const keep = Math.min(1, Math.max(MIN_KEEP, (pixels / FULL_DENSITY_PIXELS) ** 2));
    simulate.set({ params: { aspect, markScale, markOffset: layout.offset, keep } });
  };

  return {
    get aspect() {
      return aspect;
    },

    /** Matches the internal targets to the output; call after the output changes size. */
    resize(ratio: number) {
      pixelRatio = ratio;
      const [width, height] = output.size;
      aspect = width / Math.max(height, 1);
      scene.resize([width, height]);
      for (const half of near) half.resize(scaled(2));
      for (const quarter of far) quarter.resize(scaled(4));
      simulate.set({ params: { pixelRatio } });
      fit();
      points.set({ view: { resolution: [width, height] } });
      bright.set({ src: scene });
      for (const pass of blurs) pass.effect.set({ src: pass.src, blur: { texel: pass.src.texelSize } });
      composite.set({ scene, bloomNear: near[0], bloomFar: far[1] });
    },

    /** Moves or resizes the mark within the output. */
    place(next: HeroLayout) {
      layout = next;
      fit();
    },

    /** Builds every pipeline up front, so the first frame does not hitch. */
    async compile() {
      await Promise.all([
        simulate.compile(),
        points.compile(scene),
        bright.compile(near[0]),
        ...blurs.map((pass) => pass.effect.compile(pass.dst)),
        composite.compile(output),
      ]);
    },

    move(values: HeroMotion) {
      simulate.set({ params: values });
    },

    look({ dark, text, fadeBottom, textDim }: HeroLook) {
      if (dark !== undefined) simulate.set({ params: { dark } });
      composite.set({
        params: {
          ...(dark === undefined ? {} : { dark }),
          ...(text === undefined ? {} : { textMin: text.min, textMax: text.max }),
          ...(fadeBottom === undefined ? {} : { fade: fadeBottom ? 1 : 0 }),
          ...(textDim === undefined ? {} : { textDim }),
        },
      });
    },

    render(currentFrame: Frame) {
      currentFrame.computePass((pass) => pass.dispatch(simulate, Math.ceil(field.count / WORKGROUP)));
      currentFrame.pass({ target: scene, clear: CLEAR }, (pass) => pass.draw(points));
      currentFrame.pass({ target: near[0], clear: CLEAR }, (pass) => pass.draw(bright));
      for (const blur of blurs) currentFrame.pass({ target: blur.dst, clear: CLEAR }, (pass) => pass.draw(blur.effect));
      currentFrame.pass({ target: output, clear: CLEAR }, (pass) => pass.draw(composite));
    },
  };
}
