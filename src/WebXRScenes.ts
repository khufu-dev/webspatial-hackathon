import * as THREE from "three/webgpu";
import { WebGLRenderer, PMREMGenerator as WebGLPMREMGenerator } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type DemoObject = "sphere" | "cube" | "pyramid" | "cylinder";

function createBronzeMaterial() {
  const size = 512;
  const canvases = Array.from({ length: 3 }, () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    return canvas;
  });
  const contexts = canvases.map((canvas) => canvas.getContext("2d")!);
  const images = contexts.map((context) => context.createImageData(size, size));
  const hash = (x: number, y: number) => {
    let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (u: number, v: number, cells: number) => {
    const x = u * cells;
    const y = v * cells;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = THREE.MathUtils.smoothstep(x - ix, 0, 1);
    const fy = THREE.MathUtils.smoothstep(y - iy, 0, 1);
    const sample = (dx: number, dy: number) =>
      hash((ix + dx) % cells, (iy + dy) % cells);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(sample(0, 0), sample(1, 0), fx),
      THREE.MathUtils.lerp(sample(0, 1), sample(1, 1), fx),
      fy,
    );
  };
  const bronze = [190, 139, 67];
  const oxidized = [78, 49, 24];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const clouds =
        noise(u, v, 6) * 0.5 +
        noise(u, v, 18) * 0.28 +
        noise(u, v, 54) * 0.15 +
        noise(u, v, 162) * 0.07;
      const tarnish = THREE.MathUtils.smoothstep(clouds, 0.43, 0.67);
      const grain = hash(x, y);
      const index = (y * size + x) * 4;
      // Tarnished areas are darker, rougher, and slightly pitted.
      for (let channel = 0; channel < 3; channel++) {
        images[0].data[index + channel] =
          THREE.MathUtils.lerp(bronze[channel], oxidized[channel], tarnish) +
          (grain - 0.5) * 14;
        images[1].data[index + channel] = 80 + tarnish * 85 + grain * 18;
        images[2].data[index + channel] =
          145 - tarnish * 45 + (grain - 0.5) * 45;
      }
      for (const image of images) image.data[index + 3] = 255;
    }
  }
  contexts.forEach((context, index) =>
    context.putImageData(images[index], 0, 0),
  );
  // Short, irregular hairline scratches break up the polished highlights.
  for (let scratch = 0; scratch < 450; scratch++) {
    const x = hash(scratch, 1) * size;
    const y = hash(scratch, 2) * size;
    const length = 2 + hash(scratch, 3) * 18;
    const angle = hash(scratch, 4) * Math.PI;
    for (const context of contexts.slice(1)) {
      context.strokeStyle = "rgba(220, 220, 220, 0.22)";
      context.lineWidth = 0.6;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(
        x + Math.cos(angle) * length,
        y + Math.sin(angle) * length,
      );
      context.stroke();
    }
  }
  const [map, roughnessMap, bumpMap] = canvases.map((canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  });
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map,
    metalness: 1,
    roughness: 1,
    roughnessMap,
    bumpMap,
    bumpScale: 0.004,
    envMapIntensity: 1.25,
  });
}

function createStoneTexture(kind: "granite" | "jade") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(256, 256);
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const index = (y * 256 + x) * 4;
      if (kind === "granite") {
        const grain = random();
        const value =
          grain < 0.18 ? 45 : grain > 0.78 ? 210 : 130 + random() * 40;
        image.data[index] = value;
        image.data[index + 1] = value * 0.96;
        image.data[index + 2] = value * 0.91;
      } else {
        const vein = (Math.sin(x * 0.07 + Math.sin(y * 0.035) * 3) + 1) / 2;
        const variation = vein * 0.8 + random() * 0.2;
        image.data[index] = 25 + variation * 70;
        image.data[index + 1] = 95 + variation * 90;
        image.data[index + 2] = 65 + variation * 55;
      }
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createScene(
  renderer: WebGLRenderer | THREE.WebGPURenderer,
  object: DemoObject,
) {
  const scene = new THREE.Scene();
  // Environment textures belong to the renderer that generated them.
  const environment = new RoomEnvironment();
  const pmrem =
    renderer instanceof WebGLRenderer
      ? new WebGLPMREMGenerator(renderer)
      : new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment).texture;
  environment.dispose();
  pmrem.dispose();

  let geometry: THREE.BufferGeometry;
  let material: THREE.MeshStandardMaterial;
  switch (object) {
    case "sphere":
      geometry = new THREE.SphereGeometry(0.35, 64, 32);
      material = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1,
        roughness: 0.22,
      });
      break;
    case "cube":
      geometry = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      material = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        metalness: 1,
        roughness: 0.2,
      });
      break;
    case "pyramid": {
      geometry = new THREE.ConeGeometry(0.45, 0.7, 4).toNonIndexed();
      geometry.computeVertexNormals();
      // Planar mapping avoids pinching the weathering texture at the apex.
      const positions = geometry.getAttribute("position");
      const normals = geometry.getAttribute("normal");
      const uvs = geometry.getAttribute("uv");
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const x = positions.getX(vertex);
        const y = positions.getY(vertex);
        const z = positions.getZ(vertex);
        const horizontal =
          Math.abs(normals.getX(vertex)) > Math.abs(normals.getZ(vertex))
            ? z
            : x;
        uvs.setXY(
          vertex,
          horizontal / 0.7 + 0.5,
          (Math.abs(normals.getY(vertex)) > 0.9 ? z : y) / 0.7 + 0.5,
        );
      }
      material = createBronzeMaterial();
      break;
    }
    case "cylinder":
      geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.65, 64);
      material = new THREE.MeshPhysicalMaterial({
        map: createStoneTexture("jade"),
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.2,
      });
      break;
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, -2);
  if (object !== "sphere") mesh.rotation.set(0.15, 0.55, 0);
  scene.add(mesh);
  return scene;
}
