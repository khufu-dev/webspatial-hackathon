// Project the already-loaded surface map onto a small shaded sphere. Sharing
// the scene's images avoids extra downloads or a renderer per navigation item.
export function createPlanetIcon(
  image: CanvasImageSource,
  options: { rings?: boolean; emissive?: boolean } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 72;
  canvas.className = "solar-planet-icon";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d")!;
  const source = document.createElement("canvas");
  source.width = 512;
  source.height = 256;
  const sourceContext = source.getContext("2d", { willReadFrequently: true })!;
  sourceContext.drawImage(image, 0, 0, source.width, source.height);
  const pixels = sourceContext.getImageData(0, 0, 512, 256).data;
  const sphere = document.createElement("canvas");
  sphere.width = sphere.height = 72;
  const sphereContext = sphere.getContext("2d")!;
  const output = sphereContext.createImageData(72, 72);
  const radius = options.rings ? 18 : 29;
  for (let y = 0; y < 72; y++) {
    for (let x = 0; x < 72; x++) {
      const nx = (x + 0.5 - 36) / radius;
      const ny = (36 - y - 0.5) / radius;
      const distance = Math.hypot(nx, ny);
      if (distance >= 1) continue;
      const nz = Math.sqrt(1 - distance * distance);
      const u = 0.5 + Math.atan2(nx, nz) / (2 * Math.PI);
      const v = 0.5 - Math.asin(ny) / Math.PI;
      const offset = (Math.floor(v * 255) * 512 + Math.floor(u * 511)) * 4;
      const shade = options.emissive
        ? 0.78 + nz * 0.22
        : 0.18 + 0.82 * Math.max(0, -0.35 * nx + 0.3 * ny + 0.887 * nz);
      const destination = (y * 72 + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        output.data[destination + channel] = pixels[offset + channel] * shade;
      }
      output.data[destination + 3] = Math.min(1, (1 - distance) * radius) * 255;
    }
  }
  sphereContext.putImageData(output, 0, 0);
  const rings = (start: number, end: number) => {
    context.save();
    context.translate(36, 36);
    context.rotate(-0.35);
    context.lineWidth = 2;
    for (let band = 23; band <= 33; band += 2) {
      context.strokeStyle = band === 29 ? "#776b5880" : "#c9b58cbf";
      context.beginPath();
      context.ellipse(0, 0, band, band * 0.36, 0, start, end);
      context.stroke();
    }
    context.restore();
  };
  if (options.rings) rings(Math.PI, Math.PI * 2);
  context.drawImage(sphere, 0, 0);
  if (options.rings) rings(0, Math.PI);
  return canvas;
}
