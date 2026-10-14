// One thread per particle: places it on the logo (streaming along the flow, if the logo has one),
// runs the intro swirl, the tilt and the pointer spring, then writes the sprite particles.wgsl draws.
//
// View space is y up from -1 to 1 and x from -aspect to aspect. Logo positions are pixels of the
// rasterized logo, y down; field.ts builds them.

struct Particle {
  // home.xy, z, kind (0 flow, 1 solid, 2 dust)
  a: vec4f,
  // progress along the flow, offset across it (-1..1), seed, size in px
  b: vec4f,
  // linear color, brightness
  c: vec4f,
  // scattered start (-1..1), phase, sparkle
  d: vec4f,
}

struct FlowSample {
  point: vec2f,
  // Half the stroke's width here, closing to zero at the tips of the caps.
  half: f32,
  pad0: f32,
  color: vec3f,
  pad1: f32,
}

struct Sprite {
  ndc: vec2f,
  size: f32,
  alpha: f32,
  emission: vec3f,
  pad: f32,
}

struct Params {
  // The logo's solid center, in logo pixels.
  markCenter: vec2f,
  // Where that center sits, in view units.
  markOffset: vec2f,
  pointer: vec2f,
  tilt: vec2f,
  aspect: f32,
  // View units per logo pixel.
  markScale: f32,
  time: f32,
  dt: f32,
  intro: f32,
  // Flow lengths per second.
  flow: f32,
  dark: f32,
  pointerActive: f32,
  pixelRatio: f32,
  count: u32,
  // 0 when the logo has no flow.
  flowSamples: u32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<storage, read> flowPath: array<FlowSample>;
@group(0) @binding(3) var<storage, read_write> motion: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> sprites: array<Sprite>;

const PI = 3.14159265359;
const TAU = 6.28318530718;
const CAMERA = 2.6;

struct FlowPoint {
  position: vec2f,
  color: vec3f,
  // How much of the stroke's full width is left here; less than 1 inside the caps.
  width: f32,
}

fn flowPoint(progress: f32, across: f32) -> FlowPoint {
  let last = i32(params.flowSamples) - 1;
  let at = clamp(progress, 0.0, 1.0) * f32(last);
  let i = min(i32(floor(at)), last);
  let j = min(i + 1, last);
  let blend = at - f32(i);
  let a = flowPath[i];
  let b = flowPath[j];
  let tangent = normalize(flowPath[min(i + 1, last)].point - flowPath[max(i - 1, 0)].point + vec2f(1e-6, 0.0));
  let normal = vec2f(-tangent.y, tangent.x);
  let half = mix(a.half, b.half, blend);
  let widest = max(flowPath[last / 2].half, 1e-3);
  return FlowPoint(mix(a.point, b.point, blend) + normal * across * half, mix(a.color, b.color, blend), half / widest);
}

fn markToView(point: vec2f) -> vec2f {
  return (point - params.markCenter) * vec2f(1.0, -1.0) * params.markScale + params.markOffset;
}

fn rotate(v: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(v.x * c - v.y * s, v.x * s + v.y * c);
}

fn smootherstep(x: f32) -> f32 {
  let t = clamp(x, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) gid: vec3u) {
  let index = gid.x;
  if (index >= params.count) {
    return;
  }
  let particle = particles[index];
  let kind = u32(particle.a.w);
  let seed = particle.b.z;
  let phase = particle.d.z;
  let sparkle = particle.d.w;
  let t = params.time;

  var position: vec3f;
  var color = particle.c.rgb;
  var alpha = 1.0;
  var glow = 0.0;

  if (kind == 2u) {
    // Dust rises slowly through the hero and wraps around, nearer motes faster.
    let depth = particle.a.z;
    let rise = fract((particle.d.y + 1.0) * 0.5 + t * (0.004 + depth * 0.01)) * 2.0 - 1.0;
    let sway = sin(t * 0.21 + phase) * 0.025;
    position = vec3f((particle.d.x * 1.06 + sway) * params.aspect, rise * 1.06, (depth - 0.5) * 1.3);
    alpha = smoothstep(1.06, 0.9, abs(rise)) * smoothstep(0.0, 0.6, params.intro);
  } else {
    var home = particle.a.xy;
    if (kind == 0u && params.flowSamples > 1u) {
      // Flow particles stream from one tip of the stroke to the other, squeezing into the round
      // caps and fading out right at the tips. The squeeze would pile them up, so they dim with it.
      let progress = fract(particle.b.x + t * params.flow);
      let along = flowPoint(progress, particle.b.y);
      home = along.position;
      // Color by where the particle is now, so the logo's colors hold while the stroke flows.
      color = along.color;
      alpha = smoothstep(0.0, 0.012, progress) * (1.0 - smoothstep(0.988, 1.0, progress)) * mix(0.55, 1.0, along.width);
      // A pulse of light runs along the stroke, twice per loop.
      glow = pow(0.5 + 0.5 * sin((progress - t * 0.06) * TAU * 2.0), 10.0);
    } else {
      // Still shapes catch a slow band of light sweeping across the logo instead.
      let span = 2.4 / max(params.markScale, 1e-4);
      glow = pow(0.5 + 0.5 * sin(dot(home - params.markCenter, vec2f(0.86, 0.5)) / span * TAU - t * 0.7), 12.0) * 0.9;
    }
    // A little life even at rest.
    home += vec2f(sin(t * 0.63 + phase), cos(t * 0.49 + phase * 1.7)) * 0.9;
    var settled = vec3f(markToView(home), particle.a.z * params.markScale);

    // Intro: every particle starts somewhere in the sky and swirls onto the mark, staggered.
    let local = clamp((params.intro - seed * 0.38) / 0.56, 0.0, 1.0);
    let pull = smootherstep(local);
    let sky = vec3f(particle.d.x * params.aspect * 1.1, particle.d.y * 1.1, (seed - 0.5) * 1.6);
    let orbit = vec3f(rotate(sky.xy, (1.0 - pull) * (1.1 + seed * 1.4)), sky.z);
    position = mix(orbit, settled, pull);
    alpha *= mix(0.6, 1.0, pull) * smoothstep(0.0, 0.1, params.intro + seed * 0.05);
    glow += (1.0 - pull) * pull * 2.4;
  }

  // Tilt around the mark's center, then project.
  let pivot = vec3f(params.markOffset, 0.0);
  var p = position - pivot;
  let cy = cos(params.tilt.x);
  let sy = sin(params.tilt.x);
  p = vec3f(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  let cx = cos(params.tilt.y);
  let sx = sin(params.tilt.y);
  p = vec3f(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  let perspective = CAMERA / max(CAMERA - p.z, 0.2);
  let screen = p.xy * perspective + pivot.xy;

  // The pointer pushes particles aside with a slight swirl; a spring brings them home.
  var state = motion[index];
  let away = screen + state.xy - params.pointer;
  let distance = length(away);
  let reach = exp(-distance * distance / 0.045) * params.pointerActive;
  let direction = away / max(distance, 1e-4);
  let lightness = select(1.0, 1.5, kind == 2u);
  let push = (direction + vec2f(-direction.y, direction.x) * 0.45) * reach * 3.4 * lightness;
  let dt = params.dt;
  var velocity = state.zw + (push - state.xy * 15.0) * dt;
  velocity *= exp(-dt * 4.2);
  let offset = state.xy + velocity * dt;
  motion[index] = vec4f(offset, velocity);

  // Light builds up near the pointer and in moving particles.
  glow += reach * 0.9 + min(length(velocity) * 0.8, 1.2);

  let twinkle = mix(1.0, 0.55 + 0.45 * sin(t * 2.3 + phase * 3.0), sparkle);
  let brightness = particle.c.w * twinkle * (1.0 + glow) * mix(0.8, 1.0, params.dark);
  // On dark, the brightest particles burn toward white; on light they stay ink.
  let hot = clamp((sparkle * 0.3 + glow * 0.08) * params.dark, 0.0, 0.5);
  let emission = mix(color, vec3f(1.0), hot) * brightness;

  let ndc = (screen + offset) / vec2f(params.aspect, 1.0);
  let size = particle.b.w * params.pixelRatio * perspective;
  sprites[index] = Sprite(ndc, size, alpha, emission, 0.0);
}
