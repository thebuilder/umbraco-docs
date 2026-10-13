// The hero background: the U mark drawn by particles that swirl in from the sky, flow along the
// stroke, and scatter from the pointer. This file owns the page side (pointer, theme, visibility,
// the frame loop); scene.ts owns the GPU work.

import { clock, frame, frameLoop, init, surface } from "vgpu";
import type { Frame, FrameLoopHandle } from "vgpu";

import { createHeroScene } from "./scene.ts";
import blur from "./blur.wgsl";
import bright from "./bright.wgsl";
import composite from "./composite.wgsl";
import particles from "./particles.wgsl";
import simulate from "./simulate.wgsl";

const INTRO_SECONDS = 3.4;
const CLEAR = [0, 0, 0, 0] as const;

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
    const scene = createHeroScene(gpu, output, { simulate, particles, bright, blur, composite }, { height: 0.84, offset: [0, -0.02] });
    const dark = { value: isDark() ? 1 : 0, target: isDark() ? 1 : 0 };
    scene.look({ dark: dark.value });
    scene.move({ intro: reducedMotion ? 1 : 0 });
    onCleanup(output.onResize(() => scene.resize(output.dpr)));

    // Measure where the text sits, so the composite can step back behind it.
    const measureText = () => {
      if (!text) return;
      const box = canvas.getBoundingClientRect();
      const rect = text.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      scene.look({
        text: {
          min: [(rect.left - box.left) / box.width, (rect.top - box.top) / box.height],
          max: [(rect.right - box.left) / box.width, (rect.bottom - box.top) / box.height],
        },
      });
    };
    const layout = new ResizeObserver(measureText);
    layout.observe(canvas);
    if (text) layout.observe(text);
    onCleanup(() => layout.disconnect());
    measureText();

    const compiled = await scene.compile().then(() => true, () => false);
    if (!compiled || disposed) return;

    const render = (currentFrame: Frame) => {
      scene.render(currentFrame);
      canvas.dataset.ready = "true";
    };

    if (reducedMotion) {
      // The settled mark, redrawn only when the size or theme changes.
      const still = () => frame(gpu, render);
      const resizeObserver = new ResizeObserver(still);
      resizeObserver.observe(canvas);
      onCleanup(() => resizeObserver.disconnect());
      onCleanup(watchTheme(() => {
        scene.look({ dark: isDark() ? 1 : 0 });
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
      pointer.targetX = (((event.clientX - rect.left) / rect.width) * 2 - 1) * scene.aspect;
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
      scene.look({ dark: dark.value });
      scene.move({
        time: elapsed,
        dt,
        intro: Math.min(elapsed / INTRO_SECONDS, 1),
        pointer: [pointer.x, pointer.y],
        pointerActive: pointer.active,
        tilt: [tilt.x, tilt.y],
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
