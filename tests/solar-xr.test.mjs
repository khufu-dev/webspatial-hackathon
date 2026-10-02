import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three/webgpu";
import { createSolarXRPanel } from "../src/solar/SolarXRPanel.ts";
import { createSolarXRTransition } from "../src/solar/SolarXRTransition.ts";
import { planets, SUN_INDEX } from "../src/solar/ephemeris.ts";

// Rendering is covered by Three.js. This canvas adapter records panel text
// while tests exercise real scene transforms, ray intersections and actions.
const previousDocument = globalThis.document;
before(() => {
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      const canvas = { width: 0, height: 0 };
      const context = {
        canvas,
        texts: [],
        fillRect() {
          this.texts = [];
        },
        clearRect() {
          this.texts = [];
        },
        strokeRect() {},
        drawImage() {},
        fillText(text) {
          this.texts.push(text);
        },
      };
      canvas.getContext = () => context;
      return canvas;
    },
  };
});
after(() => {
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
});

const html = await readFile(new URL("../webxr.html", import.meta.url), "utf8");
const speedSelect = html.match(
  /<select id="solar-speed"[^>]*>([\s\S]*?)<\/select>/,
)[1];
const speeds = [
  ...speedSelect.matchAll(/<option value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/g),
].map((match) => ({ value: Number(match[1]), label: match[2].trim() }));
const destinations = [
  { value: -1, label: "Overview" },
  { value: SUN_INDEX, label: "Sun" },
  ...planets.map((planet, value) => ({ value, label: planet.name })),
];

function setup(t, backend = "WebGL") {
  const state = { selected: 5, speed: 7, paused: false };
  let exits = 0;
  const panel = createSolarXRPanel(
    {
      select: (value) => {
        state.selected = value;
      },
      speed: (value) => {
        state.speed = value;
      },
      overview: () => {
        state.selected = -1;
      },
      pause: () => {
        state.paused = !state.paused;
      },
      exit: () => {
        exits++;
      },
    },
    { backend, planets: destinations, speeds, getState: () => state },
  );
  const scene = new THREE.Scene();
  scene.add(panel.object);
  t.after(() => panel.dispose());
  const mesh = (name) => {
    const result = panel.object.getObjectByName(`solar-xr-${name}`);
    assert.ok(result, name);
    return result;
  };
  const rayTo = (name) => {
    scene.updateMatrixWorld(true);
    const target = mesh(name).getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Raycaster(new THREE.Vector3(), target.normalize());
    return ray.intersectObjects(panel.pickable(), false)[0]?.object;
  };
  const click = (name) => {
    const hit = rayTo(name);
    assert.equal(
      hit,
      mesh(name),
      `${name} must be reachable with a pointer ray`,
    );
    hit.userData.action();
  };
  const text = (name) => mesh(name).material.map.image.getContext("2d").texts;
  return { state, panel, scene, mesh, rayTo, click, text, exits: () => exits };
}

for (const backend of ["WebGPU", "WebGL"]) {
  test(`VR reports ${backend} with either menu open and without reuploading its badge`, (t) => {
    const { panel, mesh, text, click } = setup(t, backend);
    const badge = mesh("backend");
    const version = badge.material.map.version;
    for (const menu of ["planets", "speed"]) {
      click(menu);
      panel.update("Earth · Paused");
      assert.equal(badge.visible, true);
      assert.deepEqual(text("backend"), [`${backend} rendering`]);
      assert.equal(badge.material.toneMapped, false);
      assert.equal(badge.material.map.version, version);
      assert.ok(!panel.pickable().includes(badge), "badge is informational");
    }
  });
}

test("VR menu directly selects Overview, the Sun and all eight planets", (t) => {
  const { state, panel, click, rayTo, text } = setup(t);
  assert.equal(panel.pickable().length, 5);
  assert.equal(rayTo(`planets-option-${SUN_INDEX}`), undefined);
  for (const destination of destinations) {
    click("planets");
    click(`planets-option-${destination.value}`);
    assert.equal(state.selected, destination.value);
    assert.equal(panel.pickable().length, 5, "choosing closes the menu");
    assert.ok(text("planets").includes(destination.label));
  }
});

test("VR speed menu uses every page speed, including reverse and one week/sec", (t) => {
  const { state, panel, click, text } = setup(t);
  assert.equal(state.speed, 7);
  assert.ok(text("speed").includes("1 week / sec"));
  click("pause");
  for (const speed of speeds) {
    click("speed");
    click(`speed-option-${speed.value}`);
    assert.equal(state.speed, speed.value);
    assert.equal(state.paused, true, "changing speed preserves pause");
    assert.equal(panel.pickable().length, 5);
    assert.ok(text("speed").includes(speed.label));
  }
  click("pause");
  assert.equal(state.paused, false);
});

test("only the open menu accepts rays; toggling and panel gaps are safe", (t) => {
  const { panel, click, mesh, rayTo } = setup(t);
  click("planets");
  assert.ok(panel.pickable().includes(mesh(`planets-option-${SUN_INDEX}`)));
  click("speed");
  assert.ok(!panel.pickable().includes(mesh(`planets-option-${SUN_INDEX}`)));
  assert.ok(panel.pickable().includes(mesh("speed-option-7")));
  assert.equal(
    rayTo("menu-backing"),
    mesh("menu-backing"),
    "menu gaps absorb rays",
  );
  click("speed");
  assert.equal(panel.pickable().length, 5);
});

test("external state changes update VR labels without uploading unchanged textures", (t) => {
  const { state, panel, mesh, text } = setup(t);
  state.selected = SUN_INDEX;
  state.speed = -30;
  state.paused = true;
  panel.update("Sun · Paused");
  assert.ok(text("planets").includes("Sun"));
  assert.ok(text("speed").includes("−30 days / sec"));
  assert.ok(text("pause").includes("Play"));
  const map = mesh("speed").material.map;
  const version = map.version;
  panel.update("Sun · Paused");
  assert.equal(map.version, version);
  panel.setHovered([mesh("speed")]);
  panel.update("Sun · Paused");
  assert.ok(map.version > version, "pointing gives visual feedback");
});

test("Overview and Exit remain available; disposal releases each owned resource once", (t) => {
  const { panel, scene, click, state, exits } = setup(t);
  click("overview");
  assert.equal(state.selected, -1);
  click("exit");
  assert.equal(exits(), 1);
  const resources = new Set();
  panel.object.traverse((object) => {
    if (!object.isMesh) return;
    resources.add(object.geometry);
    resources.add(object.material);
    if (object.material.map) resources.add(object.material.map);
  });
  const counts = new Map();
  for (const resource of resources) {
    counts.set(resource, 0);
    resource.addEventListener("dispose", () =>
      counts.set(resource, counts.get(resource) + 1),
    );
  }
  panel.dispose();
  panel.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(panel.pickable().length, 0);
  assert.ok([...counts.values()].every((count) => count === 1));
});

const view = (focus, scale, overview = false, overviewScale = 0.12) => ({
  focus: new THREE.Vector3(...focus),
  placement: new THREE.Vector3(
    0,
    overview ? -0.25 : 0.03,
    overview ? -3 : -1.8,
  ),
  scale,
  overviewScale,
});
const overview = view([0, 0, 0], 0.12, true);
const earth = view([6, 0, 2], 1.15);
const saturn = view([-12, 0.2, -4], 0.38);
const closeVector = (actual, expected, message) =>
  assert.ok(actual.distanceTo(expected) < 1e-9, message);
const assertFramed = (system, destination) => {
  system.updateMatrixWorld(true);
  closeVector(
    system.localToWorld(destination.focus.clone()),
    destination.placement,
    "destination should be centered at the requested viewing distance",
  );
  closeVector(
    system.scale,
    new THREE.Vector3().setScalar(destination.scale),
    "destination should have the requested size",
  );
};

test("VR planet and Overview changes animate even with simulation time paused", () => {
  const trueOverview = view([0, 0, 0], 0.007, true, 0.007);
  const trueEarth = view([10, 0, 0], 540, false, 0.007);
  const trueNeptune = view([-280, 2, 75], 139, false, 0.007);
  for (const [from, to] of [
    [overview, earth],
    [earth, saturn],
    [saturn, overview],
    [earth, view([0, 0, 0], 0.23 / 0.75)], // Sun
    [trueOverview, trueEarth],
    [trueEarth, trueNeptune],
    [trueNeptune, trueOverview],
  ]) {
    const system = new THREE.Group();
    const transition = createSolarXRTransition(system);
    transition.reset(from);
    transition.start();
    transition.update(to, 0, false);
    assertFramed(system, from);
    const before = system.position.clone();
    transition.update(to, 0.7, false);
    assert.ok(system.position.distanceTo(before) > 0.01);
    assert.ok(system.scale.x <= to.overviewScale + 1e-12);
    assert.ok(
      system.position.distanceTo(
        to.focus.clone().multiplyScalar(-to.scale).add(to.placement),
      ) > 0.01,
      "midpoint must not snap to the destination",
    );
    transition.update(to, 0.71, false);
    assertFramed(system, to);
  }
});

test("VR transition timing is consistent across headset frame rates", () => {
  const results = [30, 60, 72, 90, 120].map((fps) => {
    const system = new THREE.Group();
    const transition = createSolarXRTransition(system);
    transition.reset(earth);
    transition.start();
    for (let i = 0; i < fps / 2; i++) {
      transition.update(saturn, 1 / fps, false);
      assert.ok(system.scale.x > 0);
    }
    return { position: system.position.clone(), scale: system.scale.clone() };
  });
  for (const result of results) {
    closeVector(result.position, results[0].position);
    closeVector(result.scale, results[0].scale);
  }
});

test("VR approaches the live orbital position and tracks it exactly after arrival", () => {
  const system = new THREE.Group();
  const transition = createSolarXRTransition(system);
  const moving = view([6, 0, 2], 1.15);
  transition.reset(overview);
  transition.start();
  for (let i = 0; i < 20; i++) {
    moving.focus.add(new THREE.Vector3(0.02, 0, -0.01));
    transition.update(moving, 0.1, false);
    if (i >= 10) {
      system.updateMatrixWorld(true);
      const center = system.localToWorld(moving.focus.clone());
      assert.ok(Math.abs(center.x) < 1e-9, "approach stays on the live body");
    }
  }
  assertFramed(system, moving);
  moving.focus.set(-7, 0.01, 3);
  transition.update(moving, 1 / 90, false);
  assertFramed(system, moving);
});

test("rapid VR reselection continues from the displayed transform", () => {
  const system = new THREE.Group();
  const transition = createSolarXRTransition(system);
  transition.reset(earth);
  transition.start();
  transition.update(saturn, 0.2, false);
  for (const next of [overview, saturn, earth, overview]) {
    const position = system.position.clone();
    const scale = system.scale.clone();
    transition.start();
    transition.update(next, 0, false);
    closeVector(system.position, position, "reselection must not jump");
    closeVector(system.scale, scale);
    transition.update(next, 0.15, false);
  }
  transition.update(overview, 2, false);
  assertFramed(system, overview);
});

test("reduced motion snaps immediately and cancels an active VR transition", () => {
  const system = new THREE.Group();
  const transition = createSolarXRTransition(system);
  transition.reset(overview);
  transition.start();
  transition.update(earth, 0.1, false);
  transition.update(earth, 0, true);
  assertFramed(system, earth);
  transition.update(earth, 0.1, false);
  assertFramed(system, earth);
  transition.start();
  transition.update(saturn, 0, true);
  assertFramed(system, saturn);
});

test("a new VR session resets interrupted framing before its next selection", () => {
  const system = new THREE.Group();
  const transition = createSolarXRTransition(system);
  transition.reset(earth);
  transition.start();
  transition.update(saturn, 0.5, false);
  system.position.set(0, 0, 0);
  system.scale.setScalar(1);
  transition.reset(overview);
  transition.update(overview, 0, false);
  assertFramed(system, overview);
  transition.start();
  transition.update(earth, 0, false);
  assertFramed(system, overview);
  transition.update(earth, 2, false);
  assertFramed(system, earth);
});
