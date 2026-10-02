import * as THREE from "three/webgpu";
import type { SolarScene } from "./SolarScene";

type Actions = {
  select: (index: number) => void;
  overview: () => void;
  pause: () => void;
  next: () => void;
  exit: () => void;
};

export function bindSolarXR(
  session: XRSession,
  renderer: THREE.WebGPURenderer,
  solar: SolarScene,
  actions: Actions,
) {
  const panel = new THREE.Group();
  panel.position.set(0, -0.5, -1.25);
  panel.rotation.x = -0.22;
  solar.scene.add(panel);
  const buttonGeometry = new THREE.PlaneGeometry(0.27, 0.09);
  const uiTextures: THREE.CanvasTexture[] = [];
  const buttons: THREE.Mesh[] = [];
  const buttonActions = [
    actions.overview,
    actions.pause,
    actions.next,
    actions.exit,
  ];
  const labels = ["Overview", "Pause / play", "Next planet", "Exit VR"];
  for (let index = 0; index < labels.length; index++) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#13202f";
    context.fillRect(0, 0, 512, 160);
    context.strokeStyle = "#8eb8c8";
    context.lineWidth = 3;
    context.strokeRect(2, 2, 508, 156);
    context.fillStyle = "#edf7ff";
    context.font = "40px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(labels[index], 256, 80);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    uiTextures.push(map);
    const button = new THREE.Mesh(
      buttonGeometry,
      new THREE.MeshBasicMaterial({ map }),
    );
    button.position.x = (index - 1.5) * 0.29;
    button.userData.action = buttonActions[index];
    panel.add(button);
    buttons.push(button);
  }
  const readoutCanvas = document.createElement("canvas");
  readoutCanvas.width = 1536;
  readoutCanvas.height = 128;
  const readoutContext = readoutCanvas.getContext("2d")!;
  const readoutTexture = new THREE.CanvasTexture(readoutCanvas);
  readoutTexture.colorSpace = THREE.SRGBColorSpace;
  uiTextures.push(readoutTexture);
  const readout = new THREE.Mesh(
    new THREE.PlaneGeometry(1.14, 0.095),
    new THREE.MeshBasicMaterial({ map: readoutTexture, transparent: true }),
  );
  readout.position.y = 0.11;
  panel.add(readout);
  let previousReadout = "";
  const raycaster = new THREE.Raycaster();
  const matrix = new THREE.Matrix4();
  const rays = new Map<XRInputSource, THREE.Line>();
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(0, 0, -1),
  ]);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: "#9ce8ed",
    transparent: true,
    opacity: 0.6,
  });
  const rayFor = (frame: XRFrame, source: XRInputSource) => {
    const reference = renderer.xr.getReferenceSpace();
    if (!reference) return false;
    const pose = frame.getPose(source.targetRaySpace, reference);
    if (!pose) return false;
    matrix.fromArray(pose.transform.matrix);
    raycaster.ray.origin.setFromMatrixPosition(matrix);
    raycaster.ray.direction.set(0, 0, -1).transformDirection(matrix);
    return true;
  };
  const hit = () => {
    panel.updateWorldMatrix(true, true);
    solar.system.updateWorldMatrix(true, true);
    return raycaster.intersectObjects(
      [...buttons, ...solar.pickable],
      false,
    )[0];
  };
  const select = (event: XRInputSourceEvent) => {
    if (
      session.visibilityState !== "visible" ||
      !rayFor(event.frame, event.inputSource)
    )
      return;
    const object = hit()?.object;
    if (!object) return;
    if (object.userData.action) (object.userData.action as () => void)();
    else if (typeof object.userData.planetIndex === "number")
      actions.select(object.userData.planetIndex);
  };
  session.addEventListener("select", select);
  const dispose = () => {
    session.removeEventListener("select", select);
    panel.removeFromParent();
    buttons.forEach((button) => (button.material as THREE.Material).dispose());
    buttonGeometry.dispose();
    readout.geometry.dispose();
    readout.material.dispose();
    uiTextures.forEach((item) => item.dispose());
    rays.forEach((ray) => ray.removeFromParent());
    rays.clear();
    lineGeometry.dispose();
    lineMaterial.dispose();
  };
  session.addEventListener("end", dispose, { once: true });
  return {
    update(frame: XRFrame, text: string) {
      if (text !== previousReadout) {
        readoutContext.clearRect(0, 0, 1536, 128);
        readoutContext.fillStyle = "#edf7ff";
        readoutContext.font = "38px system-ui";
        readoutContext.textAlign = "center";
        readoutContext.textBaseline = "middle";
        readoutContext.fillText(text, 768, 64, 1500);
        readoutTexture.needsUpdate = true;
        previousReadout = text;
      }
      for (const [source, ray] of rays) {
        if (!Array.from(session.inputSources).includes(source)) {
          ray.removeFromParent();
          rays.delete(source);
        }
      }
      for (const source of session.inputSources) {
        let ray = rays.get(source);
        if (!ray) {
          ray = new THREE.Line(lineGeometry, lineMaterial);
          rays.set(source, ray);
          solar.scene.add(ray);
        }
        ray.visible =
          session.visibilityState === "visible" && rayFor(frame, source);
        if (!ray.visible) continue;
        ray.position.copy(raycaster.ray.origin);
        ray.quaternion.setFromRotationMatrix(matrix);
        ray.scale.z = Math.min(hit()?.distance ?? 3, 8);
      }
    },
  };
}
