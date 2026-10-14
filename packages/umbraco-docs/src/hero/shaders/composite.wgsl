// Combines the particles and their bloom into the transparent canvas. On dark the result is light,
// tone mapped and added over the page. On light it becomes ink: the same hues, laid over white.
// Either way it steps back behind the hero text and dissolves into the page at the bottom.

import { linearToSrgb3 } from "@vgpu/wgsl-std/color";

struct Params {
  // The hero text's box, in uv.
  textMin: vec2f,
  textMax: vec2f,
  dark: f32,
  exposure: f32,
  bloom: f32,
  textDim: f32,
  // 1 fades out toward the bottom edge, into the page below; 0 keeps the full frame.
  fade: f32,
}

// Light mode lays particles down as ink on white. Strong enough that the logo reads clearly, and
// dimmed a little less behind the text than dark mode: measured with the API OIDC logo, the hero's
// description keeps 5.4:1 even over the darkest 1% of the ink behind it.
const LIGHT_TEXT_DIM = 0.8;
const INK_GAIN = 10.0;
const INK_DEPTH = 0.5;

@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var bloomNear: texture_2d<f32>;
@group(0) @binding(2) var bloomFar: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;
@group(0) @binding(4) var<uniform> params: Params;

fn boxMask(uv: vec2f, lo: vec2f, hi: vec2f, feather: f32) -> f32 {
  let inside = smoothstep(lo - feather, lo + feather, uv) * (1.0 - smoothstep(hi - feather, hi + feather, uv));
  return inside.x * inside.y;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let base = textureSampleLevel(scene, samp, uv, 0.0).rgb;
  let glow = textureSampleLevel(bloomNear, samp, uv, 0.0).rgb * 0.55 + textureSampleLevel(bloomFar, samp, uv, 0.0).rgb * 0.8;
  var light = (base + glow * params.bloom) * params.exposure;
  // Overlapping hues add up toward lavender; push them back apart so the gradient stays vivid.
  let grey = dot(light, vec3f(0.2126, 0.7152, 0.0722));
  light = max(mix(vec3f(grey), light, 1.35), vec3f(0.0));

  // Light mode dims less behind the text: its dark text keeps its contrast over the pale ink.
  let dim = params.textDim * mix(LIGHT_TEXT_DIM, 1.0, params.dark);
  let mask = (1.0 - dim * boxMask(uv, params.textMin, params.textMax, 0.06))
    * (1.0 - params.fade * smoothstep(0.72, 1.0, uv.y));

  // Dark: light over the page. A per-channel exponential keeps the brand hues saturated where a
  // filmic curve would wash them toward white.
  let shown = linearToSrgb3(1.0 - exp(-light));
  let lightAlpha = clamp(max(shown.r, max(shown.g, shown.b)), 0.0, 1.0);
  let onDark = vec4f(shown, lightAlpha);

  // Light: ink of the same hue, deepened so it holds up on white.
  let level = max(light.r, max(light.g, light.b));
  let inkAlpha = 1.0 - exp(-level * INK_GAIN);
  let hue = pow(light / max(level, 1e-4), vec3f(1.4));
  let ink = linearToSrgb3(hue * INK_DEPTH);
  let onLight = vec4f(ink * inkAlpha, inkAlpha);

  return mix(onLight, onDark, params.dark) * mask;
}
