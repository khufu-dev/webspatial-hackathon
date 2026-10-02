import * as THREE from "three/webgpu";
import type { SolarScene } from "./SolarScene";
import {
  createSolarXRPanel,
  type XRPanelActions,
  type XRPanelOptions,
} from "./SolarXRPanel.ts";

export function bindSolarXR(
  session: XRSession,
  renderer: THREE.WebGPURenderer,
  solar: SolarScene,
  actions: XRPanelActions,
  options: XRPanelOptions,
) {
  const panel = createSolarXRPanel(actions, options);
  solar.scene.add(panel.object);
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
    panel.object.updateWorldMatrix(true, true);
    solar.system.updateWorldMatrix(true, true);
    return raycaster.intersectObjects(
      [...panel.pickable(), ...solar.pickable],
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
    panel.dispose();
    rays.forEach((ray) => ray.removeFromParent());
    rays.clear();
    lineGeometry.dispose();
    lineMaterial.dispose();
  };
  session.addEventListener("end", dispose, { once: true });
  return {
    update(frame: XRFrame, text: string) {
      const pointedAt: THREE.Object3D[] = [];
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
        const intersection = hit();
        ray.scale.z = Math.min(intersection?.distance ?? 3, 8);
        if (intersection) pointedAt.push(intersection.object);
      }
      panel.setHovered(pointedAt);
      panel.update(text);
    },
  };
}
