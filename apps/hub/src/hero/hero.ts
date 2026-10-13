// The hero background: the U mark drawn by particles that swirl in from the sky, flow along the
// stroke, and scatter from the pointer. Each frame runs simulate (compute) → particles (additive
// points into an HDR target) → bloom (half and quarter resolution) → composite into the canvas.

import { clock, compute, draw, effect, frame, frameLoop, init, sampler, storage, surface, target } from "vgpu";
import type { Frame, FrameLoopHandle } from "vgpu";

import { generateField, MARK_HEIGHT, SPRITE_FLOATS } from "./field.ts";
import blurShader from "./blur.wgsl";
import brightShader from "./bright.wgsl";
import compositeShader from "./composite.wgsl";
import particlesShader from "./particles.wgsl";
import simulateShader from "./simulate.wgsl";

const INTRO_SECONDS = 3.4;
const HDR = "rgba16float" as const;
const CLEAR = [0, 0, 0, 0] as const;
const WORKGROUP = 64;

/**
 * Starts the hero background on `canvas`, dimming it behind `text`, and returns a teardown
 * function. Without WebGPU it does nothing, leaving the CSS glow behind the canvas as the
 * fallback. `canvas.dataset.ready` is set once a frame is on screen.
 */
export function startHeroShader(canvas: HTMLCanvasElement, text?: HTMLElement): () => void {
  if (!("gpu" in navigator)) return () => {};

  const section = canvas.parentElement ?? canvas;
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches);

  let disposed = false;
  // Run newest first, so the gpu that everything else belongs to goes last.
  const cleanups: Array<() => void> = [];
  const onCleanup = (cleanup: () => void) => cleanups.unshift(cleanup);

  void (async () => {
    // The particle draw reads the simulation output from a vertex-stage storage buffer. Browsers
    // that don't know this limit reject it, but they allow vertex storage anyway, so retry without.
    const gpu = await init({ requiredLimits: { maxStorageBuffersInVertexStage: 1 } })
      .catch(() => init())
      .catch(() => undefined);
    if (!gpu) return;
    if (disposed) return gpu.dispose();
    onCleanup(() => gpu.dispose());
    let lost = false;
    void gpu.lost.then(() => {
      lost = true;
      delete canvas.dataset.ready;
    });

    const output = surface(gpu, canvas, { dpr: [1, 1.5], clearColor: CLEAR });
    const field = generateField();
    const particles = storage(gpu, field.particles.byteLength, "read");
    particles.write(field.particles);
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

    const dark = { value: isDark() ? 1 : 0, target: isDark() ? 1 : 0 };
    const samp = sampler(gpu, { minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    const simulate = compute(gpu, simulateShader, {
      label: "hero-simulate",
      set: {
        particles,
        motion,
        sprites,
        params: {
          aspect: 1, markScale: 1, markOffsetY: 0, time: 0, dt: 0, intro: reducedMotion ? 1 : 0, flow: 0.012,
          dark: dark.value, pointer: [0, 0], pointerActive: 0, pixelRatio: 1, tilt: [0, 0], count: field.count, pad: 0,
        },
      },
    });
    const points = draw(gpu, {
      shader: particlesShader,
      vertices: 6,
      instances: field.count,
      blend: { color: { src: "one", dst: "one" }, alpha: { src: "one", dst: "one" } },
      label: "hero-particles",
      set: { sprites, view: { resolution: [1, 1] } },
    });
    const bright = effect(gpu, brightShader, { label: "hero-bright", set: { samp, bright: { threshold: 0.06, knee: 0.4 } } });
    const blurs = [
      { src: near[0], dst: near[1], direction: [1, 0], spread: 1.3 },
      { src: near[1], dst: near[0], direction: [0, 1], spread: 1.3 },
      { src: near[0], dst: far[0], direction: [1, 0], spread: 2.2 },
      { src: far[0], dst: far[1], direction: [0, 1], spread: 2.2 },
    ].map((pass, i) => ({
      ...pass,
      effect: effect(gpu, blurShader, {
        label: `hero-blur-${i}`,
        set: { samp, blur: { texel: [1, 1], direction: pass.direction, spread: pass.spread } },
      }),
    }));
    const composite = effect(gpu, compositeShader, {
      label: "hero-composite",
      set: {
        samp,
        params: { textMin: [0, 0], textMax: [0, 0], dark: dark.value, exposure: 2.4, bloom: 1.6, textDim: 0.45 },
      },
    });

    let aspect = 1;
    const bind = () => {
      const [width, height] = output.size;
      aspect = width / Math.max(height, 1);
      // The mark fills most of the hero's height, narrowed on portrait screens so it still fits.
      const markScale = Math.min(1.68 / MARK_HEIGHT, (aspect * 1.75) / 172);
      simulate.set({ params: { aspect, markScale, markOffsetY: -0.02, pixelRatio: output.dpr } });
      points.set({ view: { resolution: [width, height] } });
      bright.set({ src: scene });
      for (const pass of blurs) pass.effect.set({ src: pass.src, blur: { texel: pass.src.texelSize } });
      composite.set({ scene, bloomNear: near[0], bloomFar: far[1] });
    };
    const resizeTargets = ([width, height]: readonly [number, number]) => {
      scene.resize([width, height]);
      for (const half of near) half.resize(scaled(2));
      for (const quarter of far) quarter.resize(scaled(4));
      bind();
    };
    bind();
    onCleanup(output.onResize(({ width, height }) => resizeTargets([width, height])));

    // Measure where the text sits, so the composite can step back behind it.
    const measureText = () => {
      if (!text) return;
      const box = canvas.getBoundingClientRect();
      const rect = text.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      composite.set({
        params: {
          textMin: [(rect.left - box.left) / box.width, (rect.top - box.top) / box.height],
          textMax: [(rect.right - box.left) / box.width, (rect.bottom - box.top) / box.height],
        },
      });
    };
    const layout = new ResizeObserver(measureText);
    layout.observe(canvas);
    if (text) layout.observe(text);
    onCleanup(() => layout.disconnect());
    measureText();

    const compiled = await Promise.all([
      simulate.compile(),
      points.compile(scene),
      bright.compile(near[0]),
      ...blurs.map((pass) => pass.effect.compile(pass.dst)),
      composite.compile(output),
    ]).then(() => true, () => false);
    if (!compiled || disposed) return;

    const render = (currentFrame: Frame) => {
      currentFrame.computePass((pass) => pass.dispatch(simulate, Math.ceil(field.count / WORKGROUP)));
      currentFrame.pass({ target: scene, clear: CLEAR }, (pass) => pass.draw(points));
      currentFrame.pass({ target: near[0], clear: CLEAR }, (pass) => pass.draw(bright));
      for (const blur of blurs) currentFrame.pass({ target: blur.dst, clear: CLEAR }, (pass) => pass.draw(blur.effect));
      currentFrame.pass({ target: output, clear: CLEAR }, (pass) => pass.draw(composite));
      canvas.dataset.ready = "true";
    };
    const setDark = (value: number) => {
      simulate.set({ params: { dark: value } });
      composite.set({ params: { dark: value } });
    };

    if (reducedMotion) {
      // The settled mark, redrawn only when the size or theme changes.
      const still = () => frame(gpu, render);
      const resizeObserver = new ResizeObserver(still);
      resizeObserver.observe(canvas);
      onCleanup(() => resizeObserver.disconnect());
      onCleanup(watchTheme(() => {
        setDark(isDark() ? 1 : 0);
        still();
      }));
      return;
    }

    onCleanup(watchTheme(() => { dark.target = isDark() ? 1 : 0; }));

    // Pointer in view space (y up, x scaled by aspect), eased in the loop so nothing snaps.
    const pointer = { x: 0, y: 0, active: 0, targetX: 0, targetY: 0, targetActive: 0 };
    const onPointerMove = (event: PointerEvent) => {
      // A finger has no hover, and a touch that scrolls the page should not leave a hole behind.
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = (((event.clientX - rect.left) / rect.width) * 2 - 1) * aspect;
      pointer.targetY = 1 - ((event.clientY - rect.top) / rect.height) * 2;
      pointer.targetActive = 1;
    };
    const onPointerLeave = () => { pointer.targetActive = 0; };
    section.addEventListener("pointermove", onPointerMove);
    section.addEventListener("pointerleave", onPointerLeave);
    section.addEventListener("pointercancel", onPointerLeave);
    onCleanup(() => {
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerleave", onPointerLeave);
      section.removeEventListener("pointercancel", onPointerLeave);
    });

    const time = clock(gpu);
    let elapsed = 0;
    const tilt = { x: 0, y: 0 };
    const start = () => frameLoop(gpu, (currentFrame) => {
      // Clamp the step, so returning to the tab does not fling the springs.
      const dt = Math.min(time.deltaTime, 1 / 20);
      elapsed += dt;
      const follow = (rate: number) => 1 - Math.exp(-dt * rate);
      pointer.x += (pointer.targetX - pointer.x) * follow(10);
      pointer.y += (pointer.targetY - pointer.y) * follow(10);
      pointer.active += (pointer.targetActive - pointer.active) * follow(4);
      // The mark turns gently toward the pointer, and sways on its own when left alone.
      const tiltX = pointer.x * 0.16 * pointer.active + Math.sin(elapsed * 0.23) * 0.1 * (1 - pointer.active);
      const tiltY = -pointer.y * 0.12 * pointer.active + Math.sin(elapsed * 0.17) * 0.05 * (1 - pointer.active);
      tilt.x += (tiltX - tilt.x) * follow(2);
      tilt.y += (tiltY - tilt.y) * follow(2);
      dark.value += (dark.target - dark.value) * follow(6);
      setDark(dark.value);

      simulate.set({
        params: {
          time: elapsed,
          dt,
          intro: Math.min(elapsed / INTRO_SECONDS, 1),
          pointer: [pointer.x, pointer.y],
          pointerActive: pointer.active,
          tilt: [tilt.x, tilt.y],
        },
      });
      render(currentFrame);
    });

    // Only animate while the hero is on screen.
    let loop: FrameLoopHandle | undefined;
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        // A lost device stops the loop for good; the CSS glow is back by then.
        if (!lost) loop ??= start();
      } else {
        loop?.stop();
        loop = undefined;
      }
    });
    visibility.observe(canvas);
    onCleanup(() => {
      visibility.disconnect();
      loop?.stop();
    });
  })();

  function watchTheme(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    systemDark.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      systemDark.removeEventListener("change", onChange);
    };
  }

  return () => {
    disposed = true;
    for (const cleanup of cleanups.splice(0)) cleanup();
    delete canvas.dataset.ready;
  };
}
