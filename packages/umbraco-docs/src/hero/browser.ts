// The page side of the particle hero: draws the logo into pixels, then runs the scene with the
// pointer, the theme, visibility and the frame loop. scene.ts owns the GPU work.

import { clock, frame, frameLoop, init, surface } from "vgpu";
import type { Frame, FrameLoopHandle } from "vgpu";

import { createParticleField, type FlowStroke, type LogoPixels } from "./field.js";
import { CENTERED, createHeroScene } from "./scene.js";

const INTRO_SECONDS = 3.4;
const CLEAR = [0, 0, 0, 0] as const;
// The logo is drawn into a square this many pixels wide before particles are placed on it.
const RASTER = 256;

/** A stroke of the logo that flows, as SVG path data in the logo's own coordinates. */
export interface HeroFlow {
  /** The stroke's center line, from where the flow starts to where it ends. */
  path: string;
  /** The stroke's width, in the same units. */
  width: number;
  /** The logo's viewBox size, which the path's coordinates are in. A number means a square. */
  viewBox: number | readonly [number, number];
}

export interface HeroParticlesOptions {
  /** URL of the logo to draw; SVG or any image the browser can decode. Cross-origin images need CORS. */
  logo: string;
  flow?: HeroFlow;
  /** The hero's text; the particles step back behind it. */
  text?: HTMLElement;
  /** Where the pointer is followed; defaults to the canvas's parent. */
  pointerArea?: HTMLElement;
  /**
   * Pixels at the top of the canvas that sit behind something, such as a sticky header. The
   * particles still drift there, but the logo centers on the rest.
   */
  coveredTop?: () => number;
  /** Called when the particles can't run here (no WebGPU, an unreadable logo, a lost device), so the page can show a still logo instead. */
  onFallback?: () => void;
}

/**
 * Starts the particle hero on `canvas` and returns a teardown function. `canvas.dataset.ready` is
 * set once a frame is on screen; when the particles can't run, `onFallback` is called instead.
 */
export function startHeroParticles(canvas: HTMLCanvasElement, options: HeroParticlesOptions): () => void {
  let disposed = false;
  const fallBack = () => {
    if (!disposed) options.onFallback?.();
  };
  if (!("gpu" in navigator)) {
    fallBack();
    return () => {};
  }

  const area = options.pointerArea ?? canvas.parentElement ?? canvas;
  const { text } = options;
  const root = document.documentElement;
  const systemDark = matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Blume and the hub both pin a chosen theme in data-theme; without one, follow the system.
  const isDark = () => (root.dataset.theme ? root.dataset.theme === "dark" : systemDark.matches);

  // Run newest first, so the gpu that everything else belongs to goes last.
  const cleanups: Array<() => void> = [];
  const onCleanup = (cleanup: () => void) => cleanups.unshift(cleanup);

  void (async () => {
    const field = await loadField(options).catch(() => undefined);
    if (!field) return fallBack();
    if (disposed) return;

    // The particle draw reads the simulation output from a vertex-stage storage buffer. Browsers
    // that don't know this limit reject it, but they allow vertex storage anyway, so retry without.
    const gpu = await init({ requiredLimits: { maxStorageBuffersInVertexStage: 1 } })
      .catch(() => init())
      .catch(() => undefined);
    if (!gpu) return fallBack();
    if (disposed) return gpu.dispose();
    onCleanup(() => gpu.dispose());
    let lost = false;
    void gpu.lost.then(() => {
      lost = true;
      delete canvas.dataset.ready;
      fallBack();
    });

    const output = surface(gpu, canvas, { dpr: [1, 1.5], clearColor: CLEAR });
    const scene = createHeroScene(gpu, output, field);
    const dark = { value: isDark() ? 1 : 0, target: isDark() ? 1 : 0 };
    scene.look({ dark: dark.value });
    scene.move({ intro: reducedMotion ? 1 : 0 });
    // Center the logo on the part of the canvas that isn't covered.
    const place = () => {
      const height = canvas.clientHeight || 1;
      const covered = Math.min(Math.max(options.coveredTop?.() ?? 0, 0), height / 2) / height;
      scene.place({ height: CENTERED.height * (1 - covered), offset: [0, CENTERED.offset[1] * (1 - covered) - covered] });
    };
    onCleanup(output.onResize(() => {
      scene.resize(output.dpr);
      place();
    }));

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
    if (!compiled) return fallBack();
    if (disposed) return;

    const render = (currentFrame: Frame) => {
      scene.render(currentFrame);
      canvas.dataset.ready = "true";
    };

    if (reducedMotion) {
      // The settled logo, redrawn only when the size or theme changes.
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
    area.addEventListener("pointermove", onPointerMove);
    area.addEventListener("pointerleave", onPointerLeave);
    area.addEventListener("pointercancel", onPointerLeave);
    onCleanup(() => {
      area.removeEventListener("pointermove", onPointerMove);
      area.removeEventListener("pointerleave", onPointerLeave);
      area.removeEventListener("pointercancel", onPointerLeave);
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
      // The logo turns gently toward the pointer, and sways on its own when left alone.
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
        // A lost device stops the loop for good; the fallback is back by then.
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

/** Draws the logo into pixels and samples its flow, then places the particles. */
async function loadField({ logo, flow }: HeroParticlesOptions) {
  const { image, viewBox } = await loadLogo(logo);

  // Fit the logo into the square, keeping its shape.
  const box = flow ? viewBoxSize(flow.viewBox) : viewBox ?? [image.naturalWidth || 1, image.naturalHeight || 1];
  const scale = RASTER / Math.max(box[0], box[1]);
  const offset = [(RASTER - box[0] * scale) / 2, (RASTER - box[1] * scale) / 2] as const;
  const raster = document.createElement("canvas");
  raster.width = RASTER;
  raster.height = RASTER;
  const context = raster.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No 2D canvas");
  context.drawImage(image, offset[0], offset[1], box[0] * scale, box[1] * scale);
  // Throws for a cross-origin logo without CORS; the caller leaves the fallback in place.
  const pixels: LogoPixels = context.getImageData(0, 0, RASTER, RASTER);

  return createParticleField(pixels, flow ? { flow: sampleFlow(flow, scale, offset) } : {});
}

/**
 * Loads the logo once. An SVG with only a viewBox has no natural size of its own (browsers report
 * 0, or a default box that would squash it), so an SVG is read as text for its viewBox and drawn
 * from that same text.
 */
async function loadLogo(url: string): Promise<{ image: HTMLImageElement; viewBox?: readonly [number, number] }> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  if (!/\.svg(?:[?#]|$)/i.test(url)) {
    image.src = url;
    await image.decode();
    return { image };
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Logo request failed: ${response.status}`);
  const source = await response.text();
  const objectUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
  try {
    image.src = objectUrl;
    await image.decode();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  const attribute = new DOMParser().parseFromString(source, "image/svg+xml").documentElement.getAttribute("viewBox");
  const [, , width, height] = attribute?.trim().split(/[\s,]+/).map(Number) ?? [];
  return width && height ? { image, viewBox: [width, height] } : { image };
}

function viewBoxSize(viewBox: HeroFlow["viewBox"]): readonly [number, number] {
  return typeof viewBox === "number" ? [viewBox, viewBox] : viewBox;
}

/** Samples the flow's SVG path with the browser's own geometry, in raster pixels. */
function sampleFlow(flow: HeroFlow, scale: number, offset: readonly [number, number]): FlowStroke {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  const path = document.createElementNS(namespace, "path");
  path.setAttribute("d", flow.path);
  svg.append(path);
  // Path geometry is only measured reliably while the element is in a document.
  svg.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
  document.body.append(svg);
  try {
    const length = path.getTotalLength();
    const count = Math.max(Math.ceil(length), 2);
    const points = Array.from({ length: count + 1 }, (_, i) => {
      const point = path.getPointAtLength((i / count) * length);
      return [offset[0] + point.x * scale, offset[1] + point.y * scale] as const;
    });
    return { points, width: flow.width * scale };
  } finally {
    svg.remove();
  }
}
