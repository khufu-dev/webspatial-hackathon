import { readFile, writeFile } from "node:fs/promises";
import wabtFactory from "wabt";

const wabt = await wabtFactory();
const source = new URL("../src/solar/orbits.wat", import.meta.url);
const module = wabt.parseWat("orbits.wat", await readFile(source, "utf8"));
try {
  module.validate();
  const { buffer } = module.toBinary({ canonicalize_lebs: true });
  await writeFile(new URL("../src/solar/orbits.wasm", import.meta.url), buffer);
  console.log(`Built orbital kernel (${buffer.length} bytes).`);
} finally {
  module.destroy();
}
