// JPL approximate elements, Table 1 (1800–2050), mean ecliptic/equinox J2000.
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
// Earth uses the Earth–Moon barycenter. This is not a navigation ephemeris.
export const AU_KM = 149597870.7;
export const DAY_MS = 86400000;
export const J2000 = 2451545;
export const MIN_TIME = Date.UTC(1800, 0, 1);
export const MAX_TIME = Date.UTC(2050, 0, 1);
export const radians = Math.PI / 180;
type Elements = readonly [number, number, number, number, number, number];
export type Planet = {
  name: string;
  kind: string;
  radius: number;
  day: number;
  year: number;
  tilt: number;
  color: string;
  description: string;
  elements: Elements;
  rates: Elements;
};
export const planets: readonly Planet[] = [
  {
    name: "Mercury",
    kind: "Terrestrial planet",
    radius: 2439.7,
    day: 58.646,
    year: 87.969,
    tilt: 0.034,
    color: "#b9afa5",
    description:
      "A cratered world of extremes. Mercury races around the Sun in just 88 Earth days.",
    elements: [
      0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593,
    ],
    rates: [
      0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689,
      -0.12534081,
    ],
  },
  {
    name: "Venus",
    kind: "Terrestrial planet",
    radius: 6051.8,
    day: -243.025,
    year: 224.701,
    tilt: 2.64,
    color: "#e8ca94",
    description:
      "Wrapped in thick clouds, Venus rotates backwards. Its sidereal day lasts longer than its year.",
    elements: [
      0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718,
      76.67984255,
    ],
    rates: [
      0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329,
      -0.27769418,
    ],
  },
  {
    name: "Earth",
    kind: "Terrestrial planet",
    radius: 6371,
    day: 0.99726968,
    year: 365.256,
    tilt: 23.439,
    color: "#76baff",
    description:
      "Our ocean world. A thin atmosphere shelters the only life we know in the universe.",
    elements: [
      1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0,
    ],
    rates: [
      0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0,
    ],
  },
  {
    name: "Mars",
    kind: "Terrestrial planet",
    radius: 3389.5,
    day: 1.025957,
    year: 686.98,
    tilt: 25.19,
    color: "#e49370",
    description:
      "Rust-red deserts, polar ice, and the tallest volcano in the Solar System.",
    elements: [
      1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
    ],
    rates: [
      0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088,
      -0.29257343,
    ],
  },
  {
    name: "Jupiter",
    kind: "Gas giant",
    radius: 69911,
    day: 0.41354,
    year: 4332.59,
    tilt: 3.13,
    color: "#ddb99c",
    description:
      "A world of cloud belts and vast storms. Jupiter contains more than twice the mass of all the other planets combined.",
    elements: [
      5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909,
    ],
    rates: [
      -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668,
      0.20469106,
    ],
  },
  {
    name: "Saturn",
    kind: "Gas giant",
    radius: 58232,
    day: 0.44401,
    year: 10759.22,
    tilt: 26.73,
    color: "#e9ce99",
    description:
      "Countless fragments of ice circle a pale golden world. The dark Cassini Division separates its brightest rings.",
    elements: [
      9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831,
      113.66242448,
    ],
    rates: [
      -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216,
      -0.28867794,
    ],
  },
  {
    name: "Uranus",
    kind: "Ice giant",
    radius: 25362,
    day: 0.71833,
    year: 30688.5,
    tilt: 97.77,
    color: "#a0dce2",
    description:
      "An ice giant tipped on its side. Methane in its atmosphere gives Uranus its blue-green color.",
    elements: [
      19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763,
      74.01692503,
    ],
    rates: [
      -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281,
      0.04240589,
    ],
  },
  {
    name: "Neptune",
    kind: "Ice giant",
    radius: 24622,
    day: 0.67125,
    year: 60182,
    tilt: 28.32,
    color: "#719bf2",
    description:
      "Cold, distant, and swept by powerful winds. Sunlight takes over four hours to reach Neptune.",
    elements: [
      30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227,
      131.78422574,
    ],
    rates: [
      0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464,
      -0.00508664,
    ],
  },
];

export function julianDate(time: number) {
  // UTC as a close approximation to TDB; the ~minute offset is below the
  // accuracy promised by this educational, low-precision model.
  return time / DAY_MS + 2440587.5;
}

export function elementsAt(planet: Planet, jd: number) {
  const centuries = (jd - J2000) / 36525;
  return planet.elements.map((value, i) => value + planet.rates[i] * centuries);
}

export function meanAnomaly(longitude: number, perihelion: number) {
  return (
    (((((longitude - perihelion + 180) % 360) + 360) % 360) - 180) * radians
  );
}

export type OrbitKernel = {
  memory: WebAssembly.Memory;
  position: (
    a: number,
    e: number,
    m: number,
    i: number,
    node: number,
    peri: number,
  ) => void;
  eccentric: (m: number, e: number) => number;
};

export async function loadOrbitKernel(): Promise<OrbitKernel> {
  const response = await fetch(new URL("./orbits.wasm", import.meta.url));
  if (!response.ok) throw new Error(`Orbital module: HTTP ${response.status}`);
  const imports = { math: { sin: Math.sin, cos: Math.cos } };
  const { instance } = await WebAssembly.instantiate(
    await response.arrayBuffer(),
    imports,
  );
  return instance.exports as unknown as OrbitKernel;
}

export function positionAt(
  kernel: OrbitKernel,
  planet: Planet,
  jd: number,
  anomaly?: number,
) {
  const [a, e, i, longitude, perihelion, node] = elementsAt(planet, jd);
  kernel.position(
    a,
    e,
    anomaly ?? meanAnomaly(longitude, perihelion),
    i * radians,
    node * radians,
    (perihelion - node) * radians,
  );
  // WASM returns J2000 ecliptic XYZ. Copy because the output buffer is reused.
  return Array.from(new Float64Array(kernel.memory.buffer, 0, 3));
}

export function advanceTime(
  time: number,
  seconds: number,
  daysPerSecond: number,
) {
  return Math.min(
    MAX_TIME,
    Math.max(MIN_TIME, time + seconds * daysPerSecond * DAY_MS),
  );
}
