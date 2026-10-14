// Draws each sprite from simulate.wgsl as a soft round point. Additive blending stacks them into
// an HDR scene, so dense parts of the mark glow brighter than their particles alone.

struct Sprite {
  ndc: vec2f,
  size: f32,
  alpha: f32,
  emission: vec3f,
  pad: f32,
}

struct View {
  resolution: vec2f,
}

@group(0) @binding(0) var<storage, read> sprites: array<Sprite>;
@group(0) @binding(1) var<uniform> view: View;

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) emission: vec3f,
  @location(2) alpha: f32,
  @location(3) coverage: f32,
}

@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VertexOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
  );
  let corner = corners[vertex];
  let sprite = sprites[instance];
  var out: VertexOut;
  out.local = corner;
  out.emission = sprite.emission;
  out.alpha = sprite.alpha;
  if (sprite.alpha <= 0.0) {
    out.position = vec4f(2.0, 2.0, 0.0, 1.0);
    return out;
  }
  // Points under 5 px keep a 5 px quad and dim instead. A narrower falloff, sampled at pixel
  // centers, swings in brightness as the point drifts across the grid, which flickers, most of
  // all as ink in light mode.
  let quad = max(sprite.size, 5.0);
  out.coverage = (sprite.size * sprite.size) / (quad * quad);
  out.position = vec4f(sprite.ndc + corner * quad / view.resolution, 0.0, 1.0);
  return out;
}

@fragment fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let r = length(in.local);
  let falloff = exp(-r * r * 4.5) * (1.0 - smoothstep(0.85, 1.0, r));
  let weight = falloff * in.alpha * in.coverage;
  if (weight <= 0.0) {
    discard;
  }
  return vec4f(in.emission * weight, weight);
}
