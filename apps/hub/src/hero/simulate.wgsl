// One thread per particle: places it on the mark (flowing along the U stroke), runs the intro
// swirl, the tilt and the pointer spring, then writes the sprite particles.wgsl draws.
//
// View space is y up from -1 to 1 and x from -aspect to aspect. Mark positions are viewBox units
// of public/mark.svg, y down.

struct Particle {
  // home.xy, z, kind (0 stroke, 1 solid, 2 dust)
  a: vec4f,
  // progress along the stroke, offset across it, seed, size in px
  b: vec4f,
  // linear color, brightness
  c: vec4f,
  // scattered start (-1..1), phase, sparkle
  d: vec4f,
}

struct Sprite {
  ndc: vec2f,
  size: f32,
  alpha: f32,
  emission: vec3f,
  pad: f32,
}

struct Params {
  aspect: f32,
  markScale: f32,
  markOffsetY: f32,
  time: f32,
  dt: f32,
  intro: f32,
  flow: f32,
  dark: f32,
  pointer: vec2f,
  pointerActive: f32,
  pixelRatio: f32,
  tilt: vec2f,
  count: u32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var<storage, read_write> motion: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> sprites: array<Sprite>;

const PI = 3.14159265359;
const TAU = 6.28318530718;
// The U in mark.svg; field.ts holds the same numbers.
const LEFT = 60.0;
const RIGHT = 196.0;
const TOP = 44.0;
const BEND = 136.0;
const CENTER = vec2f(128.0, 124.0);
const RADIUS = 68.0;
const BAR = 92.0;
const ARC = 213.62830;
const STROKE = 397.62830;
const CAMERA = 2.6;

fn strokePoint(progress: f32, across: f32) -> vec2f {
  let d = progress * STROKE;
  if (d < BAR) {
    return vec2f(LEFT - across, TOP + d);
  }
  if (d < BAR + ARC) {
    let angle = (d - BAR) / RADIUS;
    return vec2f(128.0, BEND) + (RADIUS + across) * vec2f(-cos(angle), sin(angle));
  }
  return vec2f(RIGHT + across, BEND - (d - BAR - ARC));
}

fn markToView(point: vec2f) -> vec2f {
  return (point - CENTER) * vec2f(1.0, -1.0) * params.markScale + vec2f(0.0, params.markOffsetY);
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
    var home: vec2f;
    if (kind == 0u) {
      // Stroke particles flow from one end of the U to the other and fade in and out at the caps.
      let progress = fract(particle.b.x + t * params.flow);
      home = strokePoint(progress, particle.b.y);
      alpha = smoothstep(0.0, 0.035, progress) * (1.0 - smoothstep(0.965, 1.0, progress));
      // A pulse of light runs along the stroke, twice per loop.
      glow = pow(0.5 + 0.5 * sin((progress - t * 0.06) * TAU * 2.0), 10.0);
    } else {
      home = particle.a.xy;
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

  // Tilt toward the pointer, then project.
  var p = position;
  let cy = cos(params.tilt.x);
  let sy = sin(params.tilt.x);
  p = vec3f(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  let cx = cos(params.tilt.y);
  let sx = sin(params.tilt.y);
  p = vec3f(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  let perspective = CAMERA / max(CAMERA - p.z, 0.2);
  let screen = p.xy * perspective;

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
  let emission = mix(particle.c.rgb, vec3f(1.0), hot) * brightness;

  let ndc = (screen + offset) / vec2f(params.aspect, 1.0);
  let size = particle.b.w * params.pixelRatio * perspective;
  sprites[index] = Sprite(ndc, size, alpha, emission, 0.0);
}
