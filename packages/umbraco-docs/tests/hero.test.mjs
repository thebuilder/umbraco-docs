import assert from "node:assert/strict";
import test from "node:test";
import { createParticleField, FLOW_SAMPLES } from "../dist/hero/index.js";

const SIZE = 64;

/** A 64 pixel logo: a solid square from 16 to 48 over a faint glow, like the package logos. */
function logo({ glow = true } = {}) {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const solid = x >= 16 && x < 48 && y >= 16 && y < 48;
      if (solid) data.set([255, 0, 0, 255], i);
      else if (glow) data.set([0, 0, 255, 107], i);
    }
  }
  return { data, width: SIZE, height: SIZE };
}

/** Particles on the logo, as [x, y, kind, progress, red, blue], leaving out the dust. */
function markParticles(field) {
  const result = [];
  for (let i = 0; i < field.count; i++) {
    const o = i * 16;
    const kind = field.particles[o + 3];
    if (kind === 2) continue;
    result.push([field.particles[o], field.particles[o + 1], kind, field.particles[o + 4], field.particles[o + 8], field.particles[o + 10]]);
  }
  return result;
}

test("particles form the solid shape in its colors and skip soft glow", () => {
  const field = createParticleField(logo());
  const particles = markParticles(field);
  assert.ok(particles.length >= 6000);
  for (const [x, y, kind, , red, blue] of particles) {
    assert.ok(x >= 16 && x < 48 && y >= 16 && y < 48, `particle at ${x}, ${y} is off the solid square`);
    assert.equal(kind, 1);
    assert.deepEqual([red, blue], [1, 0]);
  }
  assert.deepEqual(field.center, [32, 32]);
  assert.deepEqual(field.size, [32, 32]);
  assert.equal(field.flowSamples, 0);
});

test("particle fields are the same on every build", () => {
  assert.deepEqual(createParticleField(logo()).particles, createParticleField(logo()).particles);
});

test("a flow assigns the stroke's particles a progress along it", () => {
  // A stroke 8 wide along the square's middle row, flowing left to right.
  const points = Array.from({ length: 25 }, (_, i) => [20 + i, 32]);
  const field = createParticleField(logo({ glow: false }), { flow: { points, width: 8 } });
  assert.equal(field.flowSamples, FLOW_SAMPLES);
  const flowing = markParticles(field).filter(([, , kind]) => kind === 0);
  assert.ok(flowing.length > 0);
  for (const [x, y, , progress] of flowing) {
    assert.ok(Math.abs(y - 32) <= 4.5, `flowing particle at y ${y} is off the stroke`);
    // The flow runs from the left cap (x 16) to the right cap (x 48), so progress follows x.
    assert.ok(Math.abs(progress - (x - 16) / 32) < 0.06, `particle at x ${x} has progress ${progress}`);
  }
  // Away from the stroke, the square holds still.
  assert.ok(markParticles(field).some(([, y, kind]) => kind === 1 && Math.abs(y - 32) > 8));
});

test("a logo without solid pixels is rejected", () => {
  assert.throws(() => createParticleField({ data: new Uint8ClampedArray(SIZE * SIZE * 4), width: SIZE, height: SIZE }), /no solid pixels/);
});
