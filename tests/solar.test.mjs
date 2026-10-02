import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  advanceTime,
  DAY_MS,
  elementsAt,
  J2000,
  julianDate,
  MAX_TIME,
  MIN_TIME,
  planets,
  positionAt,
} from "../src/solar/ephemeris.ts";

const bytes = await readFile(
  new URL("../src/solar/orbits.wasm", import.meta.url),
);
const { instance } = await WebAssembly.instantiate(bytes, {
  math: { sin: Math.sin, cos: Math.cos },
});
const kernel = instance.exports;
const near = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );

test("UTC to Julian date agrees with J2000 noon and Unix epoch", () => {
  near(julianDate(Date.UTC(2000, 0, 1, 12)), J2000);
  near(julianDate(0), 2440587.5);
});

test("WASM Kepler solutions satisfy the equation across the supported eccentricities", () => {
  for (const e of [0, 0.0067, 0.0167, 0.054, 0.0934, 0.2057, 0.3]) {
    for (let j = -100; j <= 100; j++) {
      const m = (j / 100) * Math.PI;
      const E = kernel.eccentric(m, e);
      near(E - e * Math.sin(E), m, 2e-12);
    }
  }
});

test("perihelion, aphelion, and an inclined circular orbit have known geometry", () => {
  kernel.position(10, 0.2, 0, 0, 0, 0);
  const result = () => Array.from(new Float64Array(kernel.memory.buffer, 0, 3));
  near(result()[0], 8);
  near(result()[1], 0);
  kernel.position(10, 0.2, Math.PI, 0, 0, 0);
  near(result()[0], -12);
  kernel.position(2, 0, Math.PI / 2, Math.PI / 2, 0, 0);
  near(result()[0], 0);
  near(result()[1], 0);
  near(result()[2], 2);
});

test("J2000 Earth barycenter matches published JPL approximate coordinates", () => {
  const [x, y, z] = positionAt(kernel, planets[2], J2000);
  near(x, -0.17717125, 1e-7);
  near(y, 0.96721448, 1e-7);
  near(z, -0.000000258, 1e-8);
});

test("all eight bodies stay finite and within their radial orbital bounds across 1800–2050", () => {
  for (const time of [
    MIN_TIME,
    Date.UTC(1900, 0, 1),
    Date.UTC(2026, 9, 2),
    MAX_TIME,
  ]) {
    const jd = julianDate(time);
    for (const planet of planets) {
      const position = positionAt(kernel, planet, jd);
      assert.ok(position.every(Number.isFinite));
      const distance = Math.hypot(...position);
      const [a, e] = elementsAt(planet, jd);
      assert.ok(distance >= a * (1 - e) - 1e-10);
      assert.ok(distance <= a * (1 + e) + 1e-10);
    }
  }
});

test("WASM output is copied, so later evaluations do not mutate earlier positions", () => {
  const first = positionAt(kernel, planets[0], J2000);
  const copy = [...first];
  positionAt(kernel, planets[7], J2000 + 100);
  assert.deepEqual(first, copy);
});

test("time playback supports real time, reverse, pause, and bounded acceleration", () => {
  const initial = Date.UTC(2026, 9, 2);
  near(advanceTime(initial, 1, 1 / 86400), initial + 1000, 0.001);
  near(advanceTime(initial, 2, -30), initial - 60 * DAY_MS, 0.001);
  near(advanceTime(initial, 20, 0), initial, 0.001);
  assert.equal(advanceTime(MAX_TIME - 100, 1, 365), MAX_TIME);
  assert.equal(advanceTime(MIN_TIME + 100, 1, -365), MIN_TIME);
});

test("all twelve local texture assets match the source manifest", async () => {
  const root = new URL("../public/solar/", import.meta.url);
  const manifest = JSON.parse(
    await readFile(new URL("art-sources.json", root), "utf8"),
  );
  assert.equal(Object.keys(manifest).length, 12);
  for (const [name, asset] of Object.entries(manifest)) {
    const image = await readFile(new URL(`${name}.jpg`, root));
    assert.equal(image.length, asset.bytes, name);
    assert.equal(
      createHash("sha256").update(image).digest("hex"),
      asset.sha256,
      name,
    );
    assert.equal(
      image.readUInt16BE(0),
      0xffd8,
      `${name} must be a JPEG, not an error page`,
    );
  }
});
