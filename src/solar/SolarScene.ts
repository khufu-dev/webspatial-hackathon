import * as THREE from "three/webgpu";
import {
  cameraPosition,
  color,
  float,
  normalWorld,
  positionWorld,
  positionLocal,
  smoothstep,
  sin,
  texture,
  uniform,
  vec3,
} from "three/tsl";
import {
  AU_KM,
  DAY_MS,
  J2000,
  julianDate,
  planets,
  positionAt,
  radians,
  SUN_INDEX,
  sunInfo,
  type OrbitKernel,
} from "./ephemeris";

export function createSolarScene(kernel: OrbitKernel) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#02040a");
  const system = new THREE.Group();
  scene.add(system);
  const geometry = new THREE.SphereGeometry(1, 96, 64);
  const sunPosition = uniform(new THREE.Vector3());
  const textures = new Set<THREE.Texture>();
  const sun = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: "#ffdd9f" }),
  );
  sun.name = "Sun";
  sun.userData.planetIndex = SUN_INDEX;
  system.add(sun);

  // Light direction is always from the Sun. Constant attenuation is an
  // exposure choice, so the outer planets remain visible in the same view.
  const sunlight = new THREE.PointLight(0xfff6ed, 3.4, 0, 0);
  system.add(sunlight);
  const ambient = new THREE.AmbientLight(0x7e95bf, 0.12);
  scene.add(ambient);

  function atmosphere(tint: string, strength: number) {
    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const view = cameraPosition.sub(positionWorld).normalize();
    const rim = float(1).sub(normalWorld.dot(view).abs()).pow(3);
    const daylight = normalWorld
      .dot(sunPosition.sub(positionWorld).normalize())
      .mul(0.65)
      .add(0.35)
      .clamp();
    material.colorNode = color(tint);
    material.opacityNode = rim.mul(daylight).mul(strength);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(1.018);
    return mesh;
  }

  const coronaMaterial = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  coronaMaterial.colorNode = color("#ffab46");
  coronaMaterial.opacityNode = float(1)
    .sub(normalWorld.dot(cameraPosition.sub(positionWorld).normalize()).abs())
    .pow(5)
    .mul(0.25);
  const corona = new THREE.Mesh(geometry, coronaMaterial);
  sun.add(corona);
  corona.scale.setScalar(1.16);

  const bodies = planets.map((planet, index) => {
    const anchor = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = planet.tilt * radians;
    const material = new THREE.MeshStandardNodeMaterial({
      color: "white",
      roughness: index === 2 ? 0.78 : 0.98,
    });
    const surface = new THREE.Mesh(geometry, material);
    surface.name = planet.name;
    surface.userData.planetIndex = index;
    tilt.add(surface);
    anchor.add(tilt);
    system.add(anchor);
    if (index === 2) tilt.add(atmosphere("#6dbaff", 0.6));
    if (index === 1) tilt.add(atmosphere("#e6bc7b", 0.35));
    if (index >= 6) tilt.add(atmosphere(planet.color, 0.35));
    return {
      planet,
      anchor,
      tilt,
      surface,
      material,
      radius: 1,
      distanceAU: 0,
    };
  });

  // Rings are geometry and radial optical-density bands. The Cassini
  // Division is at 117,580–122,170 km from Saturn's center.
  const ringGeometry = new THREE.RingGeometry(1.24, 2.33, 256, 4);
  ringGeometry.rotateX(-Math.PI / 2);
  const ringMaterial = new THREE.MeshStandardNodeMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    roughness: 1,
  });
  const radius = positionLocal.xz.length();
  const bands = sin(radius.mul(240))
    .mul(0.13)
    .add(sin(radius.mul(79)).mul(0.12))
    .add(0.72);
  const cassini = float(1).sub(
    smoothstep(2.015, 2.025, radius).mul(
      float(1).sub(smoothstep(2.09, 2.1, radius)),
    ),
  );
  ringMaterial.colorNode = color("#c5ae88").mul(bands);
  ringMaterial.opacityNode = bands
    .mul(cassini)
    .mul(smoothstep(1.24, 1.53, radius))
    .mul(0.9);
  // Analytic sphere occlusion lets Saturn cast a shadow onto both sides of
  // its rings without expensive, unstable shadow maps across AU distances.
  const saturnCenter = uniform(new THREE.Vector3());
  const saturnRadius = uniform(1);
  const towardSun = sunPosition.sub(positionWorld).normalize();
  const toCenter = saturnCenter.sub(positionWorld);
  const alongRay = toCenter.dot(towardSun);
  const missDistance = toCenter.sub(towardSun.mul(alongRay)).length();
  const shadow = float(1)
    .sub(
      smoothstep(saturnRadius.mul(0.96), saturnRadius.mul(1.03), missDistance),
    )
    .mul(smoothstep(0, 0.01, alongRay));
  ringMaterial.colorNode = ringMaterial.colorNode.mul(
    float(1).sub(shadow.mul(0.93)),
  );
  const rings = new THREE.Mesh(ringGeometry, ringMaterial);
  rings.name = "Saturn rings";
  rings.userData.planetIndex = 5;
  bodies[5].tilt.add(rings);

  const cloudMaterial = new THREE.MeshStandardNodeMaterial({
    transparent: true,
    depthWrite: false,
    roughness: 1,
  });
  cloudMaterial.colorNode = vec3(1);
  const clouds = new THREE.Mesh(geometry, cloudMaterial);
  clouds.scale.setScalar(1.008);
  bodies[2].tilt.add(clouds);
  clouds.visible = false;

  // Decorative stars are actual geometry rather than placeholder imagery.
  let seed = 1827;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stars = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 4, 3),
    new THREE.MeshBasicMaterial({
      color: "white",
      transparent: true,
      opacity: 0.7,
    }),
    1800,
  );
  const transform = new THREE.Object3D();
  for (let i = 0; i < stars.count; i++) {
    const phi = random() * Math.PI * 2;
    const z = random() * 2 - 1;
    const xy = Math.sqrt(1 - z * z);
    transform.position
      .set(xy * Math.cos(phi), z, xy * Math.sin(phi))
      .multiplyScalar(650);
    transform.scale.setScalar(0.06 + random() ** 8 * 0.5);
    transform.updateMatrix();
    stars.setMatrixAt(i, transform.matrix);
    stars.setColorAt(
      i,
      new THREE.Color().setHSL(
        0.55 + random() * 0.12,
        random() * 0.3,
        0.65 + random() * 0.35,
      ),
    );
  }
  scene.add(stars);

  let trueScale = false;
  const mapPosition = (xyz: number[]) => {
    const distance = Math.hypot(...xyz);
    const scale = trueScale ? 10 : (2 + Math.log1p(distance) * 5) / distance;
    // Ecliptic XYZ -> Three Y-up, preserving handedness.
    return new THREE.Vector3(xyz[0], xyz[2], -xyz[1]).multiplyScalar(scale);
  };
  function update(time: number) {
    const jd = julianDate(time);
    for (const body of bodies) {
      const xyz = positionAt(kernel, body.planet, jd);
      body.distanceAU = Math.hypot(...xyz);
      body.anchor.position.copy(mapPosition(xyz));
      body.radius = trueScale
        ? (body.planet.radius / AU_KM) * 10
        : 0.2 * Math.sqrt(body.planet.radius / 6371);
      body.tilt.scale.setScalar(body.radius);
      // Sidereal rate and obliquity are modeled. Initial prime meridians and
      // pole longitudes are illustrative, not IAU rotational ephemerides.
      body.surface.rotation.y =
        (((jd - J2000) / body.planet.day) % 1) * Math.PI * 2;
    }
    clouds.rotation.y = ((time / DAY_MS / 1.02) % 1) * Math.PI * 2;
    sun.scale.setScalar(trueScale ? (sunInfo.radius / AU_KM) * 10 : 0.95);
    sun.rotation.y = (((jd - J2000) / sunInfo.day) % 1) * Math.PI * 2;
    system.updateWorldMatrix(true, true);
    sun.getWorldPosition(sunPosition.value);
    bodies[5].anchor.getWorldPosition(saturnCenter.value);
    saturnRadius.value = bodies[5].radius * system.scale.x;
  }
  async function loadTextures(
    progress: (count: number, total: number) => void,
  ) {
    const loader = new THREE.TextureLoader();
    let completed = 0;
    const load = async (name: string, srgb = true) => {
      const map = await loader.loadAsync(
        `${import.meta.env.BASE_URL}solar/${name}.jpg`,
      );
      if (srgb) map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      textures.add(map);
      progress(++completed, 12);
      return map;
    };
    // Settle all loads before disposing on failure, avoiding late GPU leaks.
    const results = await Promise.allSettled([
      ...bodies.map(async (body) => {
        body.material.map = await load(body.planet.name.toLowerCase());
        body.material.needsUpdate = true;
      }),
      load("sun").then((map) => {
        sun.material.map = map;
        sun.material.color.set("white");
        sun.material.needsUpdate = true;
      }),
      load("clouds", false).then((map) => {
        cloudMaterial.opacityNode = texture(map)
          .r.smoothstep(0.15, 0.9)
          .mul(0.65);
        cloudMaterial.needsUpdate = true;
        clouds.visible = true;
      }),
      load("night").then((map) => {
        const nightSide = float(1).sub(
          smoothstep(
            -0.08,
            0.15,
            normalWorld.dot(sunPosition.sub(positionWorld).normalize()),
          ),
        );
        bodies[2].material.emissiveNode = texture(map)
          .rgb.mul(nightSide)
          .mul(1.5);
        bodies[2].material.needsUpdate = true;
      }),
      load("milkyway").then((map) => {
        map.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = map;
        scene.backgroundIntensity = 0.25;
        scene.backgroundRotation.set(0.9, 0.3, 0.4);
      }),
    ]);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length)
      throw new Error(
        `${failures.length} surface or sky textures could not load. Reload to retry.`,
      );
  }
  return {
    scene,
    system,
    bodies,
    sun,
    targets: [
      ...bodies,
      {
        anchor: sun,
        get radius() {
          return sun.scale.x;
        },
      },
    ],
    update,
    loadTextures,
    pickable: [...bodies.map((body) => body.surface), rings, sun],
    setScale(physical: boolean, time: number) {
      trueScale = physical;
      update(time);
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      textures.forEach((item) => item.dispose());
      stars.dispose();
    },
  };
}

export type SolarScene = ReturnType<typeof createSolarScene>;
