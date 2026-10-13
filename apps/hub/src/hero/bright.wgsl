// Bloom bright pass, drawn into a half-resolution target so the linear sampler also downsamples.

struct Bright {
  threshold: f32,
  knee: f32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> bright: Bright;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let color = textureSampleLevel(src, samp, uv, 0.0).rgb;
  let level = max(color.r, max(color.g, color.b));
  let weight = smoothstep(bright.threshold, bright.threshold + bright.knee, level);
  return vec4f(color * weight, 1.0);
}
