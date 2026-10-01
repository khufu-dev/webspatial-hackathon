import * as THREE from "three/webgpu";

const minScale = 0.3;
const maxScale = 3;

export function getShape(scene: THREE.Scene) {
  return scene.getObjectByName("demo-shape")!;
}

// Rebase whenever a finger/grab is added or removed to avoid transform jumps.
class DragGesture<Key> {
  readonly points = new Map<Key, THREE.Vector3>();
  private origin = new THREE.Vector3();
  private position = new THREE.Vector3();
  private distance = 0;
  private scale = 1;

  constructor(private shape: THREE.Object3D) {}

  private center() {
    const center = new THREE.Vector3();
    for (const point of this.points.values()) center.add(point);
    return center.divideScalar(this.points.size || 1);
  }

  private separation() {
    const points = [...this.points.values()];
    return points.length === 2 ? points[0].distanceTo(points[1]) : 0;
  }

  rebase() {
    this.origin.copy(this.center());
    this.position.copy(this.shape.position);
    this.distance = this.separation();
    this.scale = this.shape.scale.x;
  }

  add(key: Key, point: THREE.Vector3) {
    if (this.points.size >= 2 || this.points.has(key)) return false;
    this.points.set(key, point);
    this.rebase();
    return true;
  }

  remove(key: Key) {
    if (!this.points.has(key)) return;
    this.points.delete(key);
    this.rebase();
  }

  update() {
    if (!this.points.size) return;
    this.shape.position.copy(this.position).add(this.center().sub(this.origin));
    if (this.points.size === 2 && this.distance > 0.0001) {
      this.shape.scale.setScalar(
        THREE.MathUtils.clamp(
          (this.scale * this.separation()) / this.distance,
          minScale,
          maxScale,
        ),
      );
    }
  }
}

export type InteractionView = {
  camera: THREE.PerspectiveCamera;
  // Normalized canvas bounds, with a top-left origin.
  bounds?: { x: number; y: number; width: number; height: number };
};

export function bindCanvasInteractions(
  canvas: HTMLCanvasElement,
  shape: THREE.Object3D,
  enabled: () => boolean,
  initialViews: InteractionView[] = [],
) {
  const gesture = new DragGesture<number>(shape);
  const plane = new THREE.Plane();
  const raycaster = new THREE.Raycaster();
  let views = initialViews;
  let dragView: InteractionView | undefined;

  const rayAt = (event: PointerEvent, view: InteractionView) => {
    const rect = canvas.getBoundingClientRect();
    const bounds = view.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    view.camera.updateMatrixWorld();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((x - bounds.x) / bounds.width) * 2 - 1,
        1 - ((y - bounds.y) / bounds.height) * 2,
      ),
      view.camera,
    );
    return { x, y };
  };
  const down = (event: PointerEvent) => {
    if (!enabled() || event.button !== 0 || gesture.points.size >= 2) return;
    if (!gesture.points.size) {
      dragView = views.find((view) => {
        const { x, y } = rayAt(event, view);
        const b = view.bounds ?? { x: 0, y: 0, width: 1, height: 1 };
        return (
          x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height
        );
      });
      if (!dragView) return;
      rayAt(event, dragView);
      shape.updateWorldMatrix(true, false);
      if (!raycaster.intersectObject(shape, true).length) return;
      plane.setFromNormalAndCoplanarPoint(
        dragView.camera.getWorldDirection(new THREE.Vector3()),
        shape.position,
      );
    }
    if (!dragView) return;
    rayAt(event, dragView);
    const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!point || !gesture.add(event.pointerId, point)) return;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!enabled()) return reset();
    const point = gesture.points.get(event.pointerId);
    if (!point || !dragView) return;
    rayAt(event, dragView);
    if (raycaster.ray.intersectPlane(plane, point)) gesture.update();
  };
  const up = (event: PointerEvent) => {
    gesture.remove(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (!gesture.points.size) {
      dragView = undefined;
      canvas.classList.remove("dragging");
    }
  };
  const reset = () => {
    for (const pointerId of [...gesture.points.keys()]) {
      gesture.remove(pointerId);
      if (canvas.hasPointerCapture(pointerId))
        canvas.releasePointerCapture(pointerId);
    }
    dragView = undefined;
    canvas.classList.remove("dragging");
  };
  const wheel = (event: WheelEvent) => {
    if (!enabled() || !views.length) return;
    event.preventDefault();
    const pixels =
      event.deltaY *
      (event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? canvas.clientHeight
          : 1);
    shape.scale.setScalar(
      THREE.MathUtils.clamp(
        shape.scale.x * Math.exp(-pixels * 0.002),
        minScale,
        maxScale,
      ),
    );
    gesture.rebase();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("lostpointercapture", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("blur", reset);
  return {
    setViews(next: InteractionView[]) {
      views = next;
    },
    reset,
  };
}

export function bindXRInteractions(
  session: XRSession,
  shape: THREE.Object3D,
  getReferenceSpace: () => XRReferenceSpace | null,
) {
  const gesture = new DragGesture<XRInputSource>(shape);
  const plane = new THREE.Plane();
  const raycaster = new THREE.Raycaster();
  const gripSources = new Set<XRInputSource>();
  const setRay = (
    frame: XRFrame,
    source: XRInputSource,
    space: XRReferenceSpace,
  ) => {
    const pose = frame.getPose(source.targetRaySpace, space);
    if (!pose) return false;
    const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix);
    raycaster.ray.origin.setFromMatrixPosition(matrix);
    raycaster.ray.direction.set(0, 0, -1).transformDirection(matrix);
    return true;
  };
  const pointAt = (
    frame: XRFrame,
    source: XRInputSource,
    space: XRReferenceSpace,
  ) => {
    if (gripSources.has(source) && source.gripSpace) {
      const pose = frame.getPose(source.gripSpace, space);
      return pose
        ? new THREE.Vector3().setFromMatrixPosition(
            new THREE.Matrix4().fromArray(pose.transform.matrix),
          )
        : null;
    }
    if (!setRay(frame, source, space)) return null;
    return raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  };
  const start = (event: XRInputSourceEvent) => {
    const space = getReferenceSpace();
    const source = event.inputSource;
    if (
      !space ||
      session.visibilityState !== "visible" ||
      gesture.points.size >= 2 ||
      gesture.points.has(source)
    )
      return;
    if (!setRay(event.frame, source, space)) return;
    if (!gesture.points.size) {
      shape.updateWorldMatrix(true, false);
      if (!raycaster.intersectObject(shape, true).length) return;
      plane.setFromNormalAndCoplanarPoint(
        raycaster.ray.direction,
        shape.position,
      );
    }
    // Select with the pointing/gaze ray; move with the hand/controller grip.
    if (source.gripSpace && event.frame.getPose(source.gripSpace, space))
      gripSources.add(source);
    const point = pointAt(event.frame, source, space);
    if (point) gesture.add(source, point);
    else gripSources.delete(source);
  };
  const remove = (source: XRInputSource) => {
    gesture.remove(source);
    gripSources.delete(source);
  };
  const end = (event: XRInputSourceEvent) => remove(event.inputSource);
  const changed = (event: XRInputSourcesChangeEvent) =>
    event.removed.forEach(remove);
  const reset = () => {
    gesture.points.clear();
    gripSources.clear();
    gesture.rebase();
  };
  const visibility = () => {
    if (session.visibilityState !== "visible") reset();
  };
  const dispose = () => {
    reset();
    session.removeEventListener("selectstart", start);
    session.removeEventListener("selectend", end);
    session.removeEventListener("inputsourceschange", changed);
    session.removeEventListener("visibilitychange", visibility);
  };
  session.addEventListener("selectstart", start);
  session.addEventListener("selectend", end);
  session.addEventListener("inputsourceschange", changed);
  session.addEventListener("visibilitychange", visibility);
  session.addEventListener("end", dispose, { once: true });
  return {
    update(frame: XRFrame) {
      const space = getReferenceSpace();
      if (!space || session.visibilityState !== "visible") return;
      for (const source of [...gesture.points.keys()]) {
        const point = pointAt(frame, source, space);
        if (!point) {
          reset();
          return;
        }
        gesture.points.get(source)!.copy(point);
      }
      gesture.update();
    },
  };
}
