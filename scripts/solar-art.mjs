// The user-supplied scientific texture data is vendored for same-origin GPU
// uploads, reliable offline builds, and consistent rendering in a headset.
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const base = "https://www.solarsystemscope.com/textures/download/";
const names = {
  mercury: "2k_mercury.jpg",
  venus: "2k_venus_atmosphere.jpg",
  earth: "2k_earth_daymap.jpg",
  mars: "2k_mars.jpg",
  jupiter: "2k_jupiter.jpg",
  saturn: "2k_saturn.jpg",
  uranus: "2k_uranus.jpg",
  neptune: "2k_neptune.jpg",
  sun: "2k_sun.jpg",
  clouds: "2k_earth_clouds.jpg",
  night: "2k_earth_nightmap.jpg",
};
export const art = {
  ...Object.fromEntries(
    Object.entries(names).map(([name, filename]) => [name, base + filename]),
  ),
  milkyway: "https://cdn.eso.org/images/publicationjpg/eso0932a.jpg",
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const output = new URL("../public/solar/", import.meta.url);
  await mkdir(output, { recursive: true });
  const manifest = {};
  for (const [name, url] of Object.entries(art)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
      throw new Error(`${name}: expected JPEG data`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    await writeFile(new URL(`${name}.jpg`, output), bytes);
    manifest[name] = { url, sha256, bytes: bytes.length };
    console.log(`${name}: ${bytes.length} bytes`);
  }
  await writeFile(
    new URL("art-sources.json", output),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
